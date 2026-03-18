"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAgentStore } from "@/store/useAgentStore";
import { GeekSlider } from "@/components/ui/GeekSlider";
import { SegmentControl } from "@/components/ui/SegmentControl";
import { TempPreference } from "@/types/agent";

const TEMP_OPTIONS: { value: TempPreference; label: string }[] = [
  { value: "极寒", label: "极寒" },
  { value: "冷静", label: "冷静" },
  { value: "恒温", label: "恒温" },
  { value: "温热", label: "温热" },
  { value: "熔毁", label: "熔毁" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const {
    defenseLevel,
    tempPreference,
    rhythmPerception,
    hiddenNeed,
    setDefenseLevel,
    setTempPreference,
    setRhythmPerception,
    setHiddenNeed,
    getSerializedPayload,
  } = useAgentStore();

  const [isRendered, setIsRendered] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [aiReasoning, setAiReasoning] = useState("");

  useEffect(() => {
    setIsRendered(true);

    const fetchLocalPrefs = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setIsInitialLoading(false);
          return;
        }
        const res = await fetch("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          localStorage.removeItem("token");
          router.push("/");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.localPreferences) {
            if (data.localPreferences.defenseLevel != null)
              setDefenseLevel(data.localPreferences.defenseLevel);
            if (data.localPreferences.tempPreference != null)
              setTempPreference(data.localPreferences.tempPreference);
            if (data.localPreferences.rhythmPerception != null)
              setRhythmPerception(data.localPreferences.rhythmPerception);
            if (data.localPreferences.hiddenNeed != null)
              setHiddenNeed(data.localPreferences.hiddenNeed);
          }
        }
      } catch (e) {
        console.error("Failed to load local preferences:", e);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchLocalPrefs();
  }, [router, setDefenseLevel, setTempPreference, setRhythmPerception, setHiddenNeed]);

  // 预生成背景流星与星轨游离碎片 (与首页保持沉浸感统一)
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 40 }).map(() => ({
        id: Math.random(),
        size: Math.random() * 2 + 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
        duration: Math.random() * 8 + 15,
        delay: Math.random() * 2,
      })),
    );
  }, []);

  const handleLaunch = async () => {
    if (isLaunching) return;
    setIsLaunching(true);
    const payload = getSerializedPayload();
    console.log(
      "[SYS_INFO] 申请脱离地心引力... 开始封存参数并对接 A2A 失重舱序列",
    );

    try {
      const token = localStorage.getItem("token");
      if (token) {
        await fetch("/api/user/save-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            defenseLevel: payload.defenseLevel,
            tempPreference: payload.tempPreference,
            rhythmPerception: payload.rhythmPerception,
            hiddenNeed: payload.hiddenNeed,
          }),
        });
      }
    } catch (e) {
      console.error("Failed to save local preferences:", e);
    }

    // 拦截默认瞬跳，加入 1.5 秒心跳脉冲过渡，建立期待感
    setTimeout(() => {
      router.push("/observatory");
    }, 1500);
  };

  const handleAgentPrefill = async () => {
    if (isScanning || isLaunching) return;
    setIsScanning(true);
    setAiReasoning("Agent 代理正在潜入你的 SecondMe 档案数据流...");

    try {
      let { profileData } = useAgentStore.getState();
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      // 优先确保从数据库拉取一次 profileData
      if (token) {
        try {
          const profileRes = await fetch("/api/user/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (profileRes.status === 401) {
            localStorage.removeItem("token");
            router.push("/");
            return;
          }
          if (profileRes.ok) {
            const data = await profileRes.json();
            profileData = data;
            useAgentStore.setState({ profileData });
          }
        } catch (err) {
          console.warn("Failed to fetch user profile before prefill:", err);
        }
      }

      const res = await fetch("/api/agent-prefill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ profileData }),
      });

      if (!res.ok) throw new Error("Agent Scan Failed");

      const data = await res.json();

      // Update sliders
      setDefenseLevel(data.defenseLevel || 50);
      setTempPreference(data.tempPreference || "恒温");
      setRhythmPerception(data.rhythmPerception || 50);
      setHiddenNeed(data.hiddenNeed || "");

      // Display the typewriter reasoning
      setAiReasoning(`[Agent 侧写完毕]：${data.reasoning}`);
    } catch (e) {
      console.error(e);
      setAiReasoning("[Agent 报错]：连接星际档案库失败。请手动调整参数。");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-slate-950 text-brand-slate-400 flex flex-col items-center py-8 sm:py-12 px-4 sm:px-6 relative overflow-x-hidden font-mono">
      {/* 极简深空统一背景底色与光晕 */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.1)_0%,transparent_70%)] mix-blend-screen" />

        {/* 孤寂星辰粒子 (仅在客户端渲染，避免 SSR 随机数水合错误) */}
        {isRendered &&
          particles.map((p) => (
            <div
              key={p.id}
              className="absolute bg-brand-cyan-400/30 rounded-full animate-[pulse_4s_ease-in-out_infinite]"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                top: `${p.top}%`,
                left: `${p.left}%`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
      </div>

      {/* 极客网格背景 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(14,116,144,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(14,116,144,0.02)_1px,transparent_1px)] bg-[size:30px_30px] opacity-60 pointer-events-none z-0" />

      {/* 页面全局返回键 */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 text-brand-slate-400 hover:text-brand-cyan-500 flex items-center space-x-2 text-xs font-bold tracking-widest uppercase transition-colors"
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
        <span>[ 返回上一级 ]</span>
      </button>

      {/* 头部标题区 */}
      <header
        className={`z-10 w-full max-w-2xl mb-6 mt-10 sm:mt-0 flex flex-col gap-2 border-b border-brand-cyan-900/30 pb-4 transition-all duration-1000 ${isRendered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
      >
        <div className="flex justify-between items-end">
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-brand-emerald-400 to-brand-cyan-500 py-1">
            领航员_初始化
          </h1>
          <div className="flex items-center space-x-2 text-xs opacity-60">
            <span>[状态]: 取样中</span>
            <span className="w-1.5 h-1.5 bg-brand-emerald-400 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full shadow-[0_0_8px_rgba(52,211,153,1)]" />
          </div>
        </div>
        <p className="text-xs sm:text-sm text-brand-slate-400 mt-1 max-w-xl">
          抛开世俗面貌，注入你潜意识里最真实的生理反馈。
        </p>
      </header>

      {/* 控制台表单区域 */}
      {isInitialLoading ? (
        <div className="z-10 w-full max-w-2xl flex flex-col items-center justify-center py-24 min-h-[400px]">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 border-4 border-brand-cyan-900/40 rounded-full animate-ping" />
            <div className="absolute inset-0 border-4 border-t-brand-emerald-400 border-r-transparent rounded-full animate-spin" />
            <div className="absolute inset-2 border-4 border-b-brand-cyan-400 border-l-transparent rounded-full animate-[spin_1.5s_linear_infinite_reverse]" />
          </div>
          <p className="text-brand-cyan-400 text-sm tracking-[0.2em] uppercase font-bold animate-pulse">
            [ 正在从深空潜意识网络同步您的最新档案... ]
          </p>
        </div>
      ) : (
        <div
          className={`z-10 w-full max-w-2xl flex flex-col gap-6 transition-all duration-1000 delay-200 ${isRendered && !isInitialLoading ? "opacity-100" : "opacity-0"}`}
        >
        {/* Agent 智能档案初筛 */}
        <button
          onClick={handleAgentPrefill}
          disabled={isScanning || isLaunching}
          className={`group relative w-full overflow-hidden rounded-md border px-4 py-4 sm:py-5 flex items-center justify-center transition-all duration-300 shadow-[0_4px_20px_rgba(16,185,129,0.1)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.2)] 
            ${isScanning ? "border-brand-emerald-400 bg-brand-emerald-950/40 cursor-wait" : "border-brand-emerald-500/50 hover:border-brand-emerald-400 bg-brand-emerald-950/20"}`}
        >
          <div className="absolute inset-0 w-[200%] bg-gradient-to-r from-transparent via-brand-emerald-400/10 to-transparent -translate-x-full group-hover:animate-[slide_2s_ease-in-out_infinite]" />
          <div className="relative flex items-center space-x-3">
            {isScanning ? (
              <span className="text-2xl animate-spin text-brand-emerald-400">
                👁️
              </span>
            ) : (
              <span className="text-2xl opacity-80 group-hover:opacity-100 transition-opacity">
                👁️
              </span>
            )}
            <span className="font-bold tracking-[0.2em] text-sm sm:text-base text-brand-emerald-400 group-hover:text-brand-emerald-300 transition-colors uppercase">
              {isScanning
                ? "[ 正在深度链接潜意识... ]"
                : "Agent 深空档案侧写 // 一键智能注入"}
            </span>
          </div>
        </button>

        {aiReasoning && (
          <div className="w-full bg-brand-emerald-950/20 border-l-2 border-brand-emerald-500 p-4 rounded-r-md animate-[fadeIn_0.5s_ease-out]">
            <p className="text-brand-emerald-400/90 text-sm font-mono italic leading-relaxed whitespace-pre-wrap">
              {aiReasoning}
            </p>
          </div>
        )}

        {/* 参数板块：心理防线 */}
        <section className="bg-brand-slate-900/60 border border-brand-slate-800/80 p-5 rounded shadow-lg backdrop-blur-md">
          <GeekSlider
            label="防线等级 // 心理防御壁垒"
            description="数值越高代表你越需求包裹与力量感，数值越低代表你需要足够的保留空间试探。"
            value={defenseLevel}
            min={0}
            max={100}
            step={1}
            onChange={setDefenseLevel}
          />
        </section>

        {/* 参数板块：温度偏好 */}
        <section className="bg-brand-slate-900/60 border border-brand-slate-800/80 p-5 rounded shadow-lg backdrop-blur-md">
          <SegmentControl
            label="核心温度 // 加热基准线"
            description="喜欢冷艳高贵的冰凉刺激，还是毫无保留的熾热融化？"
            options={TEMP_OPTIONS}
            value={tempPreference}
            onChange={setTempPreference}
          />
        </section>

        {/* 参数板块：物理节奏感知 */}
        <section className="bg-brand-slate-900/60 border border-brand-slate-800/80 p-5 rounded shadow-lg backdrop-blur-md">
          <GeekSlider
            label="感知振频 (赫兹) // 物理节奏偏好"
            description="从海浪般连绵舒缓的低频，到狂风骤雨般压迫的高频冲击。"
            value={rhythmPerception}
            min={10}
            max={100}
            step={5}
            onChange={setRhythmPerception}
          />
        </section>

        {/* 参数板块：隐性诉求与信号深空呼叫 */}
        <section className="bg-brand-slate-900/60 border border-brand-slate-800/80 p-5 rounded shadow-lg backdrop-blur-md flex flex-col space-y-3">
          <label className="flex items-center text-sm font-bold tracking-widest text-brand-cyan-500 uppercase gap-2">
            <span>隐秘诉求 // 碎片记录</span>
            <span className="text-[10px] text-brand-rose-500 animate-pulse bg-brand-rose-500/10 px-2 py-0.5 rounded-sm">
              {" "}
              [已加密]{" "}
            </span>
          </label>
          <div className="relative group p-[1px] focus-within:ring-1 focus-within:ring-brand-emerald-400/50 rounded transition-all duration-300">
            <textarea
              value={hiddenNeed}
              onChange={(e) => setHiddenNeed(e.target.value)}
              placeholder="有任何平时难以开口的特殊癖好吗？输入后将自动加密转化为内控参数..."
              className="relative w-full h-24 sm:h-28 bg-brand-slate-950/90 border border-brand-slate-800 focus:border-transparent p-4 text-brand-emerald-400 font-mono text-sm resize-none outline-none placeholder:text-brand-slate-700 rounded shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] z-10"
            />
          </div>
        </section>
      </div>
      )}

      {/* 底部启动防线动作栏 */}
      {!isInitialLoading && (
        <footer
          className={`z-10 w-full max-w-2xl mt-12 pb-8 flex flex-col md:flex-row items-center justify-between transition-all duration-1000 delay-300 ${isRendered ? "opacity-100" : "opacity-0"}`}
        >
        <div className="text-xs text-brand-slate-400/60 mb-6 md:mb-0 flex-1">
          <p className="font-bold text-brand-rose-500/80 mb-1">
            【系统自检无异常】
          </p>
        </div>

        <button
          onClick={handleLaunch}
          disabled={isLaunching}
          className={`group shrink-0 relative px-10 py-5 w-full md:w-auto font-black tracking-widest text-brand-slate-950 uppercase cursor-pointer transition-all overflow-hidden ${
            isLaunching
              ? "bg-brand-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.6)] animate-pulse"
              : "bg-brand-emerald-400 hover:bg-[#10b981] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)]"
          }`}
        >
          {/* 发射时的强烈光带扫描 */}
          {isLaunching && (
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-[200%] animate-[slide_1s_ease-in-out_infinite]"
              style={{ left: "-100%" }}
            />
          )}
          {!isLaunching && (
            <span className="absolute left-0 h-full w-1 bg-white opacity-40 group-hover:w-full transition-all duration-300 pointer-events-none" />
          )}

          <span className="relative flex items-center justify-center gap-2">
            {isLaunching ? (
              <>
                <svg
                  className="w-5 h-5 animate-spin text-brand-slate-950"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>[ 强引力封存脱水传输中... ]</span>
              </>
            ) : (
              <span>[ 剥离地心引力 // 升空盲盒 ]</span>
            )}
          </span>
        </button>
      </footer>
      )}
    </main>
  );
}
