"use client";

import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAgentStore } from "@/store/useAgentStore";
import {
  calculateCompatibility,
  generatePartnerParams,
} from "@/lib/matchUtils";
import { RecommendedUser } from "@/types/agent";

const LOG_MESSAGES = [
  { text: "系统鉴权(200): 本我领航员特征池冻结", delay: 1000 },
  { text: "深空网桥(): 构建 3D 引力雷达网阵列...", delay: 2000 },
  { text: "引力扫描(): 发现大量游离节点，启动逐一接触寻迹协议", delay: 3500 },
  {
    text: "节点博弈(0x1A): 防线撕裂度过高... 匹配失败，已震荡排斥",
    delay: 5000,
  },
  {
    text: "节点博弈(0x2B): 共振频率严重干涉... 匹配失败，已震荡排斥",
    delay: 7500,
  },
  { text: "引力坍缩(): 发现同频极高契合目标 0x9F3E_SEC !", delay: 10000 },
  { text: "共振锁定(): 基因序列握手成功，建立引力羁绊链路", delay: 11500 },
  {
    text: "系统输出(): 引力坍缩完成，生成《专属感官物理设备蓝图》",
    delay: 13500,
  },
];

/** 简单的内联打字机组件 */
function TypewriterText({
  text,
  speed = 30,
}: {
  text: string;
  speed?: number;
}) {
  const [displayedText, setDisplayedText] = useState("");
  useEffect(() => {
    let i = 0;
    setDisplayedText("");
    const timer = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return <span>{displayedText}</span>;
}

export default function ObservatoryPage() {
  const router = useRouter();
  const getSerializedPayload = useAgentStore(
    (state) => state.getSerializedPayload,
  );
  const setProfileData = useAgentStore((state) => state.setProfileData);
  const setDiscoverUsers = useAgentStore((state) => state.setDiscoverUsers);
  const setBestMatchUser = useAgentStore((state) => state.setBestMatchUser);
  const setBestMatchScore = useAgentStore((state) => state.setBestMatchScore);

  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [phase, setPhase] = useState(0);

  // 依赖真实的匹配结果而不是概率
  const [isMatchSuccess, setIsMatchSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    let activeTimeouts: NodeJS.Timeout[] = [];
    const token = localStorage.getItem("token");

    const runMatching = async () => {
      let myProfile = null;
      let discoverList: RecommendedUser[] = [];

      // 1. 发起并发网络请求
      if (token) {
        try {
          const [profileRes, discoverRes] = await Promise.all([
            fetch("/api/user/profile", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("/api/user/discover", {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          if (profileRes.status === 401 || discoverRes.status === 401) {
            localStorage.removeItem("token");
            router.push("/");
            return;
          }

          const profileData = await profileRes.json();
          const discoverData = await discoverRes.json();

          if (!profileData.error) {
            myProfile = profileData;
            setProfileData(profileData);
          }
          if (discoverData.users && Array.isArray(discoverData.users)) {
            discoverList = discoverData.users;
            setDiscoverUsers(discoverList);
          }
        } catch (err) {
          console.error("Failed to fetch match data:", err);
        }
      }

      // 2. 将本我参数与所有推荐用户计算契合度，找出最匹配的人
      const myPayload = getSerializedPayload();
      myPayload.profileData = myProfile;

      // 在进入测算动画流之前，无缝调用保存接口落盘个人档案集到数据库中
      if (token) {
        try {
          // 这里也不等 await，放进后台异步存储
          fetch("/api/user/save-profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              defenseLevel: myPayload.defenseLevel,
              tempPreference: myPayload.tempPreference,
              rhythmPerception: myPayload.rhythmPerception,
              hiddenNeed: myPayload.hiddenNeed,
              profileData: myPayload.profileData,
            }),
          }).catch((e) =>
            console.error("Auto-save profile payload failed:", e),
          );
        } catch (e) {
          // Silent catch
        }
      }

      // 2. 调用大模型 AI 匹配接口
      let bestScore = 0;
      let bestMatch: RecommendedUser | null = null;
      let matchReason = "";
      let success = false;

      try {
        const aiRes = await fetch("/api/match-ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ myPayload }),
        });

        if (aiRes.ok) {
          const data = await aiRes.json();
          if (data.bestMatchUser && data.matchScore) {
            bestScore = data.matchScore;
            bestMatch = data.bestMatchUser;
            success = bestScore >= 80;
            matchReason = data.matchReason || "";
          }
        }
      } catch (err) {
        console.error("Match AI logic failed, falling back to random:", err);
      }

      // 3. Fallback matching if AI Failed (or ran out of candidates)
      if (!bestMatch) {
        if (discoverList.length > 0) {
          discoverList.forEach((user) => {
            const tempPartner = generatePartnerParams(myPayload);
            tempPartner.recommendedPartner = user;
            const score = calculateCompatibility(myPayload, tempPartner);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = user;
              success = bestScore >= 85;
              matchReason = "基于引力频段计算的绝对契合指数。";
            }
          });
        } else {
          bestMatch = null;
          bestScore = 0;
          success = false;
          matchReason =
            "当前星域没有活跃的适合航行者，请邀请更多人加入深空探测。";
        }
      }

      setBestMatchScore(bestScore);
      setBestMatchUser(bestMatch);
      // Ensure the store is updated with the reason so /blueprint can render it
      useAgentStore.getState().setMatchReason(matchReason);

      setIsMatchSuccess(success);

      // 4. 根据结果安排动画时序排期排布日志
      scheduleAnimations(success, matchReason, activeTimeouts);
    };

    const scheduleAnimations = (
      success: boolean,
      reason: string,
      timeouts: NodeJS.Timeout[],
    ) => {
      let dynamicLogs = [
        { text: "系统鉴权(200): 本我领航员特征池冻结", delay: 1000 },
        { text: "深空网桥(): 构建 3D 引力雷达网阵列...", delay: 2000 },
        {
          text: "引力扫描(): 发现大量游离节点，启动逐一接触寻迹协议",
          delay: 3500,
        },
        {
          text: "节点博弈(0x1A): 防线撕裂度过高... 匹配失败，已震荡排斥",
          delay: 5000,
        },
        {
          text: "节点博弈(0x2B): 共振频率严重干涉... 匹配失败，已震荡排斥",
          delay: 7500,
        },
      ];

      if (success) {
        dynamicLogs.push(
          {
            text: "引力坍缩(): 发现同频极高契合目标 0x9F3E_SEC !",
            delay: 10000,
          },
          {
            text: "共振锁定(): 基因序列握手成功，建立引力羁绊链路",
            delay: 11500,
          },
          {
            text: `系统解构(): "${reason || "双生共鸣频率确认"}"`,
            delay: 13000,
          },
          {
            text: "系统输出(): 引力坍缩完成，生成《专属感官物理设备蓝图》",
            delay: 15500,
          },
        );
      } else {
        dynamicLogs.push(
          { text: "节点博弈(0x3C): 星轨极性不合... 匹配失败", delay: 10000 },
          {
            text: `深空网桥(): ${reason || "没有任何异星灵魂形成高频共鸣"}`,
            delay: 11500,
          },
          {
            text: "单人独立判定(WARN): 转为单机协议，生成《专属内太空基建蓝图》",
            delay: 13500,
          },
        );
      }

      dynamicLogs.forEach(({ text, delay }) => {
        timeouts.push(
          setTimeout(() => {
            setLogs((prev) => [
              ...prev,
              `[${new Date().toISOString().split("T")[1].slice(0, 12)}] // ${text}`,
            ]);
          }, delay),
        );
      });

      timeouts.push(setTimeout(() => setPhase(1), 2000));
      timeouts.push(setTimeout(() => setPhase(2), 4000));
      timeouts.push(setTimeout(() => setPhase(2.5), 5200));
      timeouts.push(setTimeout(() => setPhase(3), 6500));
      timeouts.push(setTimeout(() => setPhase(3.5), 7800));

      if (success) {
        timeouts.push(setTimeout(() => setPhase(4), 9000));
        timeouts.push(setTimeout(() => setPhase(5), 11000));
      } else {
        timeouts.push(setTimeout(() => setPhase(-1), 9000));
        timeouts.push(setTimeout(() => setPhase(-2), 11000));
      }

      timeouts.push(
        setTimeout(() => {
          setIsProcessing(false);
          router.push(success ? "/blueprint" : "/blueprint-solo");
        }, 15000),
      );
    };

    runMatching();

    return () => {
      activeTimeouts.forEach(clearTimeout);
    };
  }, [
    router,
    getSerializedPayload,
    setProfileData,
    setDiscoverUsers,
    setBestMatchUser,
    setBestMatchScore,
  ]);

  // 随机性数据计算 (Moved to useEffect to fix hydration mismatch)
  const [randomOffsets, setRandomOffsets] = useState<number[]>([]);
  const [stars, setStars] = useState<any[]>([]);

  useEffect(() => {
    setRandomOffsets(Array.from({ length: 12 }).map(() => Math.random()));
    setStars(
      Array.from({ length: 80 }).map(() => ({
        id: Math.random(),
        width: Math.random() * 2 + 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
        animationDuration: Math.random() * 3 + 2,
        animationDelay: Math.random() * 2,
        opacity: Math.random() * 0.5 + 0.2,
      })),
    );
  }, []);

  const targetId = 3;
  const mismatch1Id = 0;
  const mismatch2Id = 1;

  const getPos = (
    i: number,
    specialState: "normal" | "repulsed" = "normal",
  ) => {
    // 强制分布成一圈
    const angle = (i / 12) * Math.PI * 2;
    // 随机远近，结合当前 phase 造成从远到近的聚拢感
    let r = 0;
    if (specialState === "repulsed") {
      r = 150 + randomOffsets[i] * 50; // 弹开
    } else if (phase < 1) {
      r = 150 + randomOffsets[i] * 50; // 最远处待命
    } else if (phase < 2) {
      r = 75 + randomOffsets[i] * 20; // 正在靠近
    } else {
      r = 35 + randomOffsets[i] * 15; // 稳定轨道
    }

    return {
      top: 50 + Math.sin(angle) * r,
      left: 50 + Math.cos(angle) * r,
    };
  };

  const candidates = useMemo(() => {
    const SNIPPETS = [
      "正在解析深空波段...",
      "兴趣点暂存：科技",
      "寻找绝对理性的基点",
      "[国产剧观察群体]",
      "意识边缘游离中",
      "[日常的闪光点]",
      "尝试基因图谱握手",
      "引力场发生微型畸变",
    ];

    return Array.from({ length: 12 }).map((_, i) => {
      const isTarget = i === targetId;
      const isMis1 = i === mismatch1Id;
      const isMis2 = i === mismatch2Id;
      const pos = getPos(i);

      let top = pos.top;
      let left = pos.left;
      let opacity = 0;
      let scale = 1;
      let bgClass = "bg-brand-slate-600";
      let shadowClass = "";
      let extraClass = "";
      let snippet = SNIPPETS[i % SNIPPETS.length];

      const starType = Math.floor(randomOffsets[i] * 4);

      if (phase >= 1) {
        opacity = 0.5;

        // Mismatch 1 交互
        if (isMis1) {
          if (phase >= 2.5) {
            const farPos = getPos(i, "repulsed");
            top = farPos.top;
            left = farPos.left;
            opacity = 0;
            bgClass = "bg-brand-rose-600";
          } else if (phase === 2) {
            scale = 1.4;
            bgClass = "bg-brand-rose-500";
            shadowClass = "shadow-[0_0_15px_rgba(244,63,94,0.6)]";
            opacity = 0.9;
          }
        }

        // Mismatch 2 交互
        if (isMis2) {
          if (phase >= 3.5) {
            const farPos = getPos(i, "repulsed");
            top = farPos.top;
            left = farPos.left;
            opacity = 0;
            bgClass = "bg-brand-rose-600";
          } else if (phase === 3) {
            scale = 1.4;
            bgClass = "bg-brand-rose-500";
            shadowClass = "shadow-[0_0_15px_rgba(244,63,94,0.6)]";
            opacity = 0.9;
          }
        }

        // Target 交互 (仅在成功时生效)
        if (isTarget && isMatchSuccess) {
          if (phase >= 5) {
            scale = 1.6;
            bgClass = "bg-brand-emerald-400";
            shadowClass = "shadow-[0_0_30px_rgba(52,211,153,0.9)]";
            opacity = 1;
            extraClass = "animate-[pulse_2s_linear_infinite]";
          } else if (phase >= 4) {
            scale = 1.3;
            opacity = 0.9;
            bgClass = "bg-brand-emerald-400/80";
            shadowClass = "shadow-[0_0_15px_rgba(52,211,153,0.4)]";
          }
        }

        // 如果是匹配失败的终局退网状态，除了本我，所有候选节点消失
        if (phase === -2) {
          opacity = 0;
          const farPos = getPos(i, "repulsed");
          top = farPos.top;
          left = farPos.left;
        }
      }

      return {
        id: i,
        top: `${top}%`,
        left: `${left}%`,
        opacity,
        scale,
        bgClass,
        shadowClass,
        extraClass,
        isTarget,
        starType,
        snippet,
        isMis1,
        isMis2,
      };
    });
  }, [phase, randomOffsets]);

  const corePos = useMemo(() => {
    let top = 50,
      left = 50;

    if (phase === 2) {
      const p = getPos(mismatch1Id);
      top = p.top - 4;
      left = p.left - 4;
    } else if (phase === 2.5) {
      top = 50;
      left = 50; // 反弹回中心
    } else if (phase === 3) {
      const p = getPos(mismatch2Id);
      top = p.top - 4;
      left = p.left - 4;
    } else if (phase === 3.5 || phase === -1 || phase === -2) {
      top = 50;
      left = 50; // 反弹回中心或孤星待在中心
    } else if (phase >= 4) {
      const p = getPos(targetId);
      // 让本我节点停靠在目标节点附近，而不是完全重合
      const angle = Math.atan2(p.top - 50, p.left - 50);
      top = p.top - Math.sin(angle) * 8;
      left = p.left - Math.cos(angle) * 8;
    }

    return { top, left };
  }, [phase, randomOffsets]);

  // 计算全局运镜状态：
  // match成功：镜头推向 Target (放大并平移)
  // match失败：镜头拉远 (缩小)
  // 排斥爆红：微量放大加抖动
  const globalCameraStyle = useMemo(() => {
    if (phase >= 5) {
      // 成功：大推镜，聚焦到目标
      return "scale(2) translate(10%, 15%)";
    } else if (phase === -2) {
      // 失败：大拉远，跌落深空
      return "scale(0.3) translateY(-20%)";
    } else if (phase === 2 || phase === 3) {
      // 排斥震荡期间稍微推一点点，配合摇晃
      return "scale(1.05)";
    }
    return "scale(1) translate(0, 0)";
  }, [phase]);

  return (
    <main
      className={`min-h-screen bg-brand-slate-950 text-brand-emerald-400 font-mono p-4 sm:p-6 lg:p-12 overflow-hidden flex flex-col relative transition-all duration-[3000ms] ease-[cubic-bezier(0.25,1,0.5,1)]
      ${phase === 2 || phase === 3 ? "animate-[shake_0.4s_ease-in-out_infinite] shadow-[inset_0_0_150px_rgba(244,63,94,0.15)]" : ""} 
      ${phase === -2 ? "bg-black grayscale brightness-50" : ""}
      `}
    >
      {/* 页面全局返回键 */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-4 sm:top-8 sm:left-6 z-50 text-brand-slate-400 hover:text-brand-cyan-500 flex items-center space-x-2 text-xs font-bold tracking-widest uppercase transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="square"
            strokeLinejoin="miter"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        <span>[ 终止并返回上一级 ]</span>
      </button>

      {/* 背景星空层 */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute bg-white rounded-full animate-pulse blur-[1px]"
            style={{
              width: `${star.width}px`,
              height: `${star.width}px`,
              top: `${star.top}%`,
              left: `${star.left}%`,
              opacity: star.opacity,
              animationDuration: `${star.animationDuration}s`,
              animationDelay: `${star.animationDelay}s`,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.05)_0%,transparent_80%)] mix-blend-screen" />
      </div>

      {/* 头部状态机 */}
      <header className="relative z-20 flex flex-col sm:flex-row sm:justify-between items-start mt-12 sm:mt-0 gap-4 font-bold border-b border-brand-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl tracking-widest text-white uppercase flex items-center shadow-black drop-shadow-md">
            深空节点 // 全息引力雷达阵列
          </h1>
          <p className="text-xs sm:text-sm text-brand-slate-400 mt-1 shadow-black drop-shadow-md">
            [上帝视角：3D
            寻迹模式]：正在茫茫宇宙中主动漫游，筛选懂你的另一半灵魂...
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end text-xs shadow-black drop-shadow-md">
          <span className="text-brand-cyan-500 font-bold mb-1">
            {isProcessing
              ? "引力波扫描漫游中..."
              : isMatchSuccess
                ? "基因握手完成"
                : "独立基建重启中"}
          </span>
          <div className="flex space-x-1">
            <span className="w-1.5 h-1.5 bg-brand-emerald-400 animate-pulse rounded-none" />
            <span className="w-1.5 h-1.5 bg-brand-emerald-400 animate-pulse delay-75 rounded-none" />
            <span className="w-1.5 h-1.5 bg-brand-emerald-400 animate-pulse delay-150 rounded-none" />
          </div>
        </div>
      </header>

      {/* ================= 动态太空 3D 博弈核心视效层 ================= */}
      <div
        className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden transition-transform duration-[4000ms] ease-out"
        style={{ perspective: "1200px", transform: globalCameraStyle }}
      >
        {/* 雷达底盘 / 全息层面 */}
        <div
          className="relative w-[95vw] h-[95vw] max-w-[800px] max-h-[800px] border border-brand-cyan-900/40 rounded-full transition-transform duration-[3000ms] ease-out shadow-[0_20px_50px_rgba(6,182,212,0.2)]"
          style={{
            transform:
              phase >= 1
                ? "rotateX(65deg) scale(1)"
                : "rotateX(0deg) scale(0.1)",
            transformStyle: "preserve-3d",
            backgroundColor: "rgba(6, 182, 212, 0.02)",
          }}
        >
          {/* 雷达扫描光带特效 (Scanlines) */}
          {phase >= 1 && phase < 4 && phase !== -2 && (
            <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(52,211,153,0.1)_60deg,transparent_120deg)] animate-[spin_4s_linear_infinite]" />
          )}

          {/* 雷达内部虚线圈装饰 */}
          <div className="absolute top-[15%] left-[15%] right-[15%] bottom-[15%] border border-dashed border-brand-cyan-900/50 rounded-full animate-[spin_30s_linear_infinite]" />
          <div className="absolute top-[35%] left-[35%] right-[35%] bottom-[35%] border border-brand-emerald-900/30 rounded-full animate-[spin_20s_linear_infinite_reverse]" />

          {/* 声呐扫描波纹 (探测阶段 phase 1 ~ 3) */}
          {phase >= 1 && phase < 4 && phase !== -2 && (
            <>
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20%] h-[20%] rounded-full border border-brand-cyan-400/40 animate-[ping_4s_ease-out_infinite]"
                style={{ animationDelay: "0s" }}
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full border border-brand-cyan-400/20 animate-[ping_4s_ease-out_infinite]"
                style={{ animationDelay: "1.3s" }}
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full border border-brand-cyan-400/10 animate-[ping_4s_ease-out_infinite]"
                style={{ animationDelay: "2.6s" }}
              />
            </>
          )}

          {/* 领航员节点 (Core Node) - 通过 transform 反向倾斜使其垂直于雷达面立起来！ */}
          <div
            className="absolute flex flex-col items-center transition-all duration-1000 ease-in-out z-30"
            style={{
              top: `${corePos.top}%`,
              left: `${corePos.left}%`,
              transform: "translate(-50%, -50%) rotateX(-65deg)",
            }}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 relative overflow-hidden
              ${
                phase === 2 || phase === 3
                  ? "shadow-[0_0_20px_rgba(244,63,94,0.6)]"
                  : phase === -1 || phase === -2
                    ? "shadow-[0_0_30px_rgba(14,165,233,0.8)] scale-110"
                    : "shadow-[0_0_20px_rgba(6,182,212,0.6)]"
              }
              ${phase >= 5 ? "shadow-[0_0_40px_rgba(52,211,153,1)] scale-125 animate-pulse" : ""}
            `}
              style={{
                background:
                  phase === 2 || phase === 3
                    ? "radial-gradient(circle at 30% 30%, #f43f5e, #be123c, #4c0519)"
                    : phase >= 5
                      ? "radial-gradient(circle at 30% 30%, #34d399, #059669, #064e3b)"
                      : phase === -1 || phase === -2
                        ? "radial-gradient(circle at 30% 30%, #38bdf8, #0ea5e9, #0369a1)"
                        : "radial-gradient(circle at 30% 30%, #06b6d4, #0891b2, #164e63)",
                boxShadow:
                  "inset -4px -4px 8px rgba(0,0,0,0.6), inset 2px 2px 6px rgba(255,255,255,0.4)",
              }}
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay" />
              <span className="w-2 h-2 rounded-full bg-white opacity-90 drop-shadow-[0_0_5px_rgba(255,255,255,1)] z-10" />
            </div>

            <span
              className={`text-xs mt-3 px-2 py-0.5 whitespace-nowrap bg-brand-slate-900/80 rounded-sm font-bold tracking-widest border transition-all duration-500
              ${phase === 2 || phase === 3 ? "text-brand-rose-400 border-brand-rose-900/50" : "text-brand-cyan-400 border-brand-cyan-900/50"}
              ${phase >= 5 ? "text-brand-emerald-400 border-brand-emerald-400/50 opacity-100" : ""}
              ${phase === -1 || phase === -2 ? "text-sky-400 border-sky-400/50" : ""}`}
            >
              [ 本我 ]
            </span>
          </div>

          {/* 周边全网候选行星群 */}
          {candidates.map((c) => (
            <React.Fragment key={c.id}>
              {/* 平躺在雷达盘上的目标锁定扩散光圈 (取代原本的连线) */}
              {c.isTarget && phase >= 4 && (
                <div
                  className="absolute rounded-full border-[2px] transition-all duration-[2000ms] ease-out z-10"
                  style={{
                    top: c.top,
                    left: c.left,
                    width: phase >= 5 ? "800px" : "40px",
                    height: phase >= 5 ? "800px" : "40px",
                    transform: "translate(-50%, -50%)",
                    borderColor: "rgba(52,211,153,0.5)",
                    boxShadow:
                      phase >= 5
                        ? "0 0 100px rgba(52,211,153,0.3) inset, 0 0 50px rgba(52,211,153,0.4)"
                        : "0 0 10px rgba(52,211,153,0.5) inset",
                    opacity: phase >= 5 ? 1 : 0.8,
                  }}
                />
              )}

              <div
                className={`absolute flex flex-col items-center justify-center transition-all duration-[1500ms] ease-in-out z-20 ${c.extraClass}`}
                style={{
                  top: c.top,
                  left: c.left,
                  opacity: c.opacity,
                  transform: `translate(-50%, -50%) rotateX(-65deg) scale(${c.scale})`,
                }}
              >
                <div className="relative flex items-center justify-center">
                  {/* 0. 坚硬的 3D 岩石星体 */}
                  {c.starType === 0 && (
                    <div
                      className={`w-6 h-6 rounded-full ${c.shadowClass}`}
                      style={{
                        background: c.bgClass.includes("emerald")
                          ? "radial-gradient(circle at 30% 30%, #34d399, #065f46)"
                          : c.bgClass.includes("rose")
                            ? "radial-gradient(circle at 30% 30%, #fb7185, #9f1239)"
                            : "radial-gradient(circle at 30% 30%, #cbd5e1, #334155)",
                        boxShadow:
                          "inset -3px -3px 6px rgba(0,0,0,0.8), inset 1px 1px 3px rgba(255,255,255,0.5)",
                      }}
                    >
                      {/* 表面斑驳的陨石坑假象 */}
                      <div className="absolute top-[20%] left-[20%] w-1.5 h-1.5 rounded-full bg-black/30 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]" />
                      <div className="absolute top-[60%] right-[30%] w-2 h-2 rounded-full bg-black/20 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]" />
                    </div>
                  )}
                  {/* 1. 立体带星环的气态巨行星 (类似土星) */}
                  {c.starType === 1 && (
                    <div className="relative flex items-center justify-center w-10 h-10">
                      <div
                        className={`absolute w-5 h-5 rounded-full z-10 ${c.shadowClass}`}
                        style={{
                          background: c.bgClass.includes("emerald")
                            ? "radial-gradient(circle at 30% 30%, #10b981, #064e3b)"
                            : c.bgClass.includes("rose")
                              ? "radial-gradient(circle at 30% 30%, #f43f5e, #881337)"
                              : "radial-gradient(circle at 30% 30%, #94a3b8, #1e293b)",
                          boxShadow:
                            "inset -2px -2px 5px rgba(0,0,0,0.7), inset 1px 1px 4px rgba(255,255,255,0.4)",
                        }}
                      >
                        {/* 气态纹理线 */}
                        <div className="absolute top-1/4 left-0 right-0 h-[2px] bg-white/10 rotate-[-15deg]" />
                        <div className="absolute top-1/2 left-0 right-0 h-[3px] bg-black/10 rotate-[-15deg]" />
                      </div>
                      {/* 3D 星环 */}
                      <div
                        className={`absolute w-10 h-10 rounded-full border-[1.5px] border-t-4 animate-[spin_6s_linear_infinite] opacity-60 ${c.bgClass.replace("bg-", "border-").split("/")[0]}`}
                        style={{ transform: "rotateX(70deg) rotateY(10deg)" }}
                      />
                    </div>
                  )}
                  {/* 2. 具有晕影深邃的暗物质星云 */}
                  {c.starType === 2 && (
                    <div
                      className={`w-8 h-8 rounded-full blur-[3px] opacity-80 ${c.shadowClass}`}
                      style={{
                        background: c.bgClass.includes("emerald")
                          ? "radial-gradient(circle, #34d399 20%, transparent 80%)"
                          : c.bgClass.includes("rose")
                            ? "radial-gradient(circle, #fb7185 20%, transparent 80%)"
                            : "radial-gradient(circle, #94a3b8 20%, transparent 80%)",
                      }}
                    />
                  )}
                  {/* 3. 旋绕双星引力系统 */}
                  {c.starType === 3 && (
                    <div className="relative w-8 h-8 animate-[spin_2s_linear_infinite]">
                      <div
                        className={`absolute top-0 right-0 w-3 h-3 rounded-full ${c.shadowClass}`}
                        style={{
                          background: c.bgClass.includes("emerald")
                            ? "radial-gradient(circle at 30% 30%, #34d399, #022c22)"
                            : "radial-gradient(circle at 30% 30%, #cbd5e1, #0f172a)",
                          boxShadow: "inset -1px -1px 3px rgba(0,0,0,0.8)",
                        }}
                      />
                      <div
                        className={`absolute bottom-0 left-0 w-4 h-4 rounded-full ${c.shadowClass}`}
                        style={{
                          background: c.bgClass.includes("rose")
                            ? "radial-gradient(circle at 30% 30%, #fb7185, #4c0519)"
                            : "radial-gradient(circle at 30% 30%, #64748b, #020617)",
                          boxShadow: "inset -2px -2px 4px rgba(0,0,0,0.8)",
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 仅为 Target 显示文字标签 */}
                {c.isTarget && phase >= 4 && (
                  <div className="mt-3 text-[10px] text-brand-emerald-400 font-bold tracking-widest bg-brand-slate-900/80 px-2 py-0.5 rounded-sm whitespace-nowrap animate-in fade-in duration-1000 border border-brand-emerald-900/50 shadow-md">
                    {useAgentStore.getState().bestMatchUser?.username ||
                      "异星灵魂"}
                  </div>
                )}

                {/* 游离意识碎片闪烁 (未排斥前) */}
                {phase >= 1 &&
                  phase <= 3 &&
                  !c.isMis1 &&
                  !c.isMis2 &&
                  !c.isTarget && (
                    <div
                      className="absolute top-10 whitespace-nowrap text-[9px] text-brand-cyan-300/80 tracking-widest font-mono border border-brand-cyan-900/50 bg-brand-slate-950/70 px-1.5 py-0.5 rounded-sm animate-[pulse_3s_ease-in-out_infinite]"
                      style={{ animationDelay: `${(c.id % 4) * 0.8}s` }}
                    >
                      {c.snippet}
                    </div>
                  )}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 半透明玻璃态控制台 */}
      <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[480px] lg:w-[600px] z-30 pointer-events-none">
        <div className="bg-brand-slate-950/70 border border-brand-cyan-900/40 p-5 h-[35vh] sm:h-[40vh] overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.8)] font-mono text-xs sm:text-sm md:text-base flex flex-col justify-end space-y-2.5 backdrop-blur-md rounded-sm">
          {logs.map((log, index) => (
            <div
              key={index}
              className="animate-in fade-in duration-300 transform text-brand-emerald-400 tracking-tight"
            >
              <span className="opacity-50 select-none mr-2 font-bold">
                &gt;
              </span>
              <TypewriterText text={log} speed={15} />
            </div>
          ))}
          {isProcessing && (
            <div className="flex items-center text-brand-cyan-500 opacity-60 mt-2">
              <span className="mr-2">&gt;</span>
              <span className="inline-block w-2.5 h-4 bg-brand-cyan-500 animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
