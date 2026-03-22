"use client";

import * as React from "react";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAgentStore } from "@/store/useAgentStore";
import {
  calculateCompatibility,
  generatePartnerParams,
} from "@/lib/matchUtils";
import { RecommendedUser } from "@/types/agent";
import ParticleAstronautCanvas from '@/components/observatory/ParticleAstronaut';

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

  const [isMatchSuccess, setIsMatchSuccess] = useState<boolean | null>(null);
  const fetchPromiseRef = useRef<Promise<any> | null>(null);

  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem("token");

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const addLog = (text: string) => {
      if (!mounted) return;
      setLogs((prev) => [
        ...prev,
        `[${new Date().toISOString().split("T")[1].slice(0, 12)}] // ${text}`,
      ]);
    };

    const fetchMatchInfo = async () => {
      let myProfile = null;
      let discoverList: RecommendedUser[] = [];
      let bestScore = 0;
      let bestMatch: RecommendedUser | null = null;
      let matchReason = "";
      let success = false;

      // 1. 发起并发网络请求
      if (token) {
        try {
          const [profileRes, discoverRes] = await Promise.all([
            fetch("/api/user/profile", { headers: { Authorization: `Bearer ${token}` } }),
            fetch("/api/user/discover", { headers: { Authorization: `Bearer ${token}` } }),
          ]);

          if (profileRes.status === 401 || discoverRes.status === 401) {
            localStorage.removeItem("token");
            router.push("/");
            return null; // Return early if aborted
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

      if (token) {
        try {
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
          }).catch((e) => console.error("Auto-save profile payload failed:", e));
        } catch (e) {
          // Silent catch
        }
      }

      // 调用大模型 AI 匹配接口
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
          matchReason = "当前星域没有活跃的适合航行者，请邀请更多人加入深空探测。";
        }
      }

      // 由于 React 18 Strict Mode 会跨 Mount 保留缓存 Promise
      // 我们在 Promise 内容体内就不判断 mounted 再 set Store 了，Zustand 本身没副作用
      setBestMatchScore(bestScore);
      setBestMatchUser(bestMatch);
      useAgentStore.getState().setMatchReason(matchReason);
      if (mounted) {
        setIsMatchSuccess(success);
      }

      return { success, matchReason };
    };

    const runTimeline = async () => {
      // 通过 Promise 单例锁处理 Strict Mode 的多次执行，但保证 timeline 必须起步
      if (!fetchPromiseRef.current) {
        fetchPromiseRef.current = fetchMatchInfo();
      }
      const apiPromise = fetchPromiseRef.current;

      // ============== 前期通用视觉效果 (直接开始，无需等待) ==============
      addLog("系统鉴权(200): 本我领航员特征池冻结");
      await delay(1000);
      if (!mounted) return;
      
      addLog("深空网桥(): 构建 3D 引力雷达网阵列...");
      setPhase(1); // 开启雷达网
      await delay(1500);
      if (!mounted) return;

      addLog("引力扫描(): 发现大量游离节点，启动逐一接触寻迹协议");
      await delay(1500);
      if (!mounted) return;
      
      let isFetching = true;
      let matchResult: any = null;
      apiPromise.then(res => {
        matchResult = res;
        isFetching = false;
      });

      let loopCount = 0;
      // If network is slow, loop the probe/repulse animation so the screen doesn't just hang
      while ((isFetching || loopCount < 1) && mounted) {
        setPhase(2); // 接触 1
        addLog(`节点博弈(0x${Math.floor(Math.random() * 1000 + 100).toString(16).toUpperCase()}): 防线撕裂度过高... 已震荡排斥`);
        await delay(1200);
        if (!mounted) return;

        setPhase(2.5); // 弹开 1
        await delay(1300);
        if (!mounted) return;

        if (!isFetching && loopCount >= 1) break;

        setPhase(3); // 接触 2
        addLog(`节点博弈(0x${Math.floor(Math.random() * 1000 + 100).toString(16).toUpperCase()}): 共振频率严重干涉... 已震荡排斥`);
        await delay(1300);
        if (!mounted) return;

        setPhase(3.5); // 弹开 2
        await delay(1300);
        if (!mounted) return;
        
        loopCount++;
      }
      
      if (!matchResult) matchResult = await apiPromise;
      if (!mounted || !matchResult) return;
      
      const { success, matchReason } = matchResult;

      // ============== 根据接口拿到的最终命运，安排中后期运镜 ==============
      await delay(1200);
      if (!mounted) return;

      if (success) {
        setPhase(4);
        addLog("引力坍缩(): 发现同频极高契合目标 0x9F3E_SEC !");
        await delay(1500);
        if (!mounted) return;
        
        addLog("共振锁定(): 基因序列握手成功，建立引力羁绊链路");
        await delay(1500);
        if (!mounted) return;
        
        setPhase(5);
        addLog(`系统解构(): "${matchReason || "双生共鸣频率确认"}"`);
        await delay(2500);
        if (!mounted) return;

        addLog("系统输出(): 引力坍缩完成，生成《专属感官物理设备蓝图》");
      } else {
        setPhase(-1);
        addLog("节点博弈(0x3C): 星轨极性不合... 匹配失败");
        await delay(1500);
        if (!mounted) return;
        
        addLog(`深空网桥(): ${matchReason || "没有任何异星灵魂形成高频共鸣"}`);
        await delay(2000);
        if (!mounted) return;

        setPhase(-2);
        addLog("单人独立判定(WARN): 转为单机协议，生成《专属内太空基建蓝图》");
      }

      await delay(3500);
      if (mounted) {
        setIsProcessing(false);
        router.push(success ? "/blueprint" : "/blueprint-solo");
      }
    };

    runTimeline();

    return () => {
      mounted = false;
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

  useEffect(() => {
    setRandomOffsets(Array.from({ length: 12 }).map(() => Math.random()));
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

      <ParticleAstronautCanvas phase={phase} />

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


      {/* 半透明玻璃态控制台 */}
      <div className="absolute bottom-3 right-4 sm:right-5 sm:bottom-5 sm:w-[300px] lg:w-[360px] z-30 pointer-events-none">
        <div className="bg-brand-slate-950/70 border border-brand-cyan-900/40 p-3 h-[22vh] overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.8)] font-mono text-xs flex flex-col justify-end space-y-1.5 backdrop-blur-md rounded-sm">
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
