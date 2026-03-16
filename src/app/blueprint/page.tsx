"use client";

import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAgentStore } from "@/store/useAgentStore";
import { BlueprintRadar } from "@/components/charts/BlueprintRadar";
import { getPersonalizedTips } from "@/data/medicalKnowledge";

/** 模拟试机按钮组件 */
function SimulationButton({ rhythm, temp }: { rhythm: number; temp: string }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [pulseOpacity, setPulseOpacity] = useState(0);

  const colorMap: Record<string, string> = {
    极寒: "rgba(56,189,248,VAL)", // sky-400
    冷静: "rgba(6,182,212,VAL)", // cyan-500
    恒温: "rgba(52,211,153,VAL)", // emerald-400
    温热: "rgba(251,146,60,VAL)", // orange-400
    熔毁: "rgba(244,63,94,VAL)", // rose-500
  };

  const pulseColor = (colorMap[temp] || "rgba(6,182,212,VAL)").replace(
    "VAL",
    String(pulseOpacity),
  );

  const startSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);

    // 震动节奏: rhythm 越高 → 间隔越短
    const interval = Math.max(50, 500 - rhythm * 4);
    let elapsed = 0;
    const duration = 5000;

    const pulseTimer = setInterval(() => {
      elapsed += interval;
      // 正弦波脉冲明暗
      setPulseOpacity(Math.abs(Math.sin((elapsed / interval) * 0.5)) * 0.35);

      // Web Vibration API
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(interval * 0.6);
      }

      if (elapsed >= duration) {
        clearInterval(pulseTimer);
        setPulseOpacity(0);
        setIsSimulating(false);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(0);
        }
      }
    }, interval);
  };

  return (
    <>
      {/* 全屏脉冲覆盖层 */}
      {isSimulating && (
        <div
          className="fixed inset-0 z-[999] pointer-events-none transition-opacity duration-100"
          style={{ backgroundColor: pulseColor }}
        />
      )}
      <button
        onClick={startSimulation}
        disabled={isSimulating}
        className={`px-8 py-3 border text-sm font-bold tracking-widest uppercase transition-all ${
          isSimulating
            ? "border-brand-rose-500 text-brand-rose-400 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.3)]"
            : "border-brand-emerald-500/50 text-brand-emerald-400 hover:bg-brand-emerald-500/10 hover:shadow-[0_0_15px_rgba(52,211,153,0.2)]"
        }`}
      >
        {isSimulating ? "[ 模拟运行中... ]" : "[ ⚡ 模拟试机 · 感受你的蓝图 ]"}
      </button>
    </>
  );
}

export default function BlueprintPage() {
  const router = useRouter();
  const getSerializedPayload = useAgentStore(
    (state) => state.getSerializedPayload,
  );
  const [isRendered, setIsRendered] = useState(false);

  // 预生成星空背景粒子保持沉浸感
  const stars = useMemo(
    () =>
      Array.from({ length: 60 }).map(() => ({
        id: Math.random(),
        width: Math.random() * 2 + 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
        animationDuration: Math.random() * 3 + 2,
        animationDelay: Math.random() * 2,
        opacity: Math.random() * 0.4 + 0.1,
      })),
    [],
  );

  // 获取当前领航员数据并构造虚拟匹配对象的 Mock 数据
  const myPayload = getSerializedPayload();
  const mockPartnerData = {
    defenseLevel: Math.max(0, myPayload.defenseLevel - 15),
    tempPreference: "温热",
    rhythmPerception: Math.min(100, myPayload.rhythmPerception + 10),
    hiddenNeed: "接收到匹配信号",
  };

  // 雷达图配置
  const radarIndicators = [
    { name: "防线韧性", max: 100 },
    { name: "核心温度", max: 100 },
    { name: "共振频率", max: 100 },
    { name: "隐秘阈值", max: 100 },
    { name: "适配张力", max: 100 },
  ];

  // 温度字符串转数值以便雷达图展示
  const tempToNum = (t: string) => {
    const map: Record<string, number> = {
      极寒: 20,
      冷静: 40,
      恒温: 60,
      温热: 80,
      熔毁: 100,
    };
    return map[t] || 50;
  };

  const radarData = [
    {
      name: "本我领航员参数",
      value: [
        myPayload.defenseLevel,
        tempToNum(myPayload.tempPreference),
        myPayload.rhythmPerception,
        myPayload.hiddenNeed.length > 0 ? 80 : 30,
        75, // 适配张力虚拟值
      ],
    },
    {
      name: "匹配异星领航员参数",
      value: [
        mockPartnerData.defenseLevel,
        tempToNum(mockPartnerData.tempPreference),
        mockPartnerData.rhythmPerception,
        mockPartnerData.hiddenNeed.length > 0 ? 70 : 40,
        85, // 适配张力虚拟值
      ],
    },
  ];

  useEffect(() => {
    // 页面加载时的轻微延迟动画
    const timer = setTimeout(() => setIsRendered(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-brand-slate-950 text-brand-slate-400 p-4 sm:p-6 lg:p-12 relative overflow-x-hidden font-mono flex flex-col items-center">
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

      {/* 工业背景修饰 */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand-emerald-400 to-transparent opacity-50 z-0" />

      {/* 星空背景与深空云气 */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {stars.map((star: any) => (
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_60%)] mix-blend-screen" />
      </div>

      <div className="w-full max-w-5xl z-10 space-y-8 mt-10 sm:mt-0">
        {/* 头部摘要 */}
        <header className="border-l-4 border-brand-emerald-400 pl-4 sm:pl-6 py-2 relative z-10 bg-brand-slate-950/40 backdrop-blur-sm -ml-4 pr-4 sm:ml-0 shadow-sm rounded-r-md">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-widest uppercase mb-2 drop-shadow-lg flex items-center gap-2">
            异星伴侣·双人感官同步蓝图{" "}
            <span className="text-xs bg-brand-emerald-500/20 text-brand-emerald-400 px-2 py-0.5 rounded-sm border border-brand-emerald-500/50">
              绝配方案
            </span>
          </h1>
          <div className="text-xs sm:text-sm font-bold text-brand-cyan-500 uppercase flex flex-col sm:flex-row gap-2 sm:items-center sm:space-x-4">
            <span>双盲博弈: 灵魂契合度 99.8%</span>
            <span className="hidden sm:inline text-brand-slate-500">|</span>
            <span>匹配到的异星伴侣 ID: 0x9F3E_SEC</span>
          </div>
        </header>

        {/* 核心内容网格 */}
        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-8 transition-opacity duration-1000 ${isRendered ? "opacity-100" : "opacity-0"}`}
        >
          {/* 左侧：雷达图表区 */}
          <section className="bg-brand-slate-900/50 border border-brand-cyan-900/30 rounded-sm p-4 sm:p-6 relative">
            {/* 顶角修饰 */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-cyan-500 rounded-tl-sm" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand-cyan-500 rounded-tr-sm" />

            <h2 className="text-sm text-brand-emerald-400 font-bold mb-4 tracking-widest uppercase border-b border-brand-slate-800 pb-2">
              [ 几何层：多维张力雷达映射 ]
            </h2>
            <BlueprintRadar indicator={radarIndicators} data={radarData} />
          </section>

          {/* 右侧：工程参数与医学批注池 */}
          <section className="space-y-6">
            <div className="bg-brand-slate-900/50 border border-brand-cyan-900/30 p-4 sm:p-6 rounded-sm relative">
              {/* 底角修饰 */}
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-brand-cyan-500 rounded-bl-sm" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-cyan-500 rounded-br-sm" />

              <h2 className="text-sm text-brand-cyan-500 font-bold mb-4 tracking-widest uppercase border-b border-brand-slate-800 pb-2">
                [ 物理层：硬件工程参数集 ]
              </h2>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between border-b border-brand-slate-800/50 pb-1">
                  <span className="text-brand-slate-500">核心温度基准线</span>
                  <span className="text-white font-bold tracking-tight">
                    38.5°C ± 1.2
                  </span>
                </li>
                <li className="flex justify-between border-b border-brand-slate-800/50 pb-1">
                  <span className="text-brand-slate-500">外层硅胶肖氏硬度</span>
                  <span className="text-white font-bold tracking-tight">
                    15 - 20HA
                  </span>
                </li>
                <li className="flex justify-between border-b border-brand-slate-800/50 pb-1">
                  <span className="text-brand-slate-500">共振双频叠加极值</span>
                  <span className="text-white font-bold tracking-tight">
                    本我 {myPayload.rhythmPerception}Hz ~ 异星{" "}
                    {mockPartnerData.rhythmPerception}Hz
                  </span>
                </li>
                <li className="flex justify-between pb-1">
                  <span className="text-brand-slate-500">结构抗撕裂系数</span>
                  <span className="text-emerald-400 font-bold tracking-tight">
                    等级 V (极高)
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-brand-slate-900/40 border border-brand-rose-900/50 p-4 sm:p-6 rounded-sm backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-rose-500/5 rounded-full blur-2xl pointer-events-none" />

              <h2 className="text-sm text-brand-rose-400 font-bold mb-4 tracking-widest uppercase flex items-center border-b border-brand-slate-800/80 pb-2">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                [ 分析层：你们为什么是天生一对？ ]
              </h2>

              <div className="text-xs sm:text-sm text-brand-slate-300 leading-relaxed space-y-4">
                <div className="border-l-2 border-brand-cyan-500/50 pl-3">
                  <span className="font-bold text-brand-cyan-400 block mb-1">
                    👨‍⚕️ 情感医生诊断：性格齿轮的咬合
                  </span>
                  <p>
                    大白话：你的心理防线是{" "}
                    <span className="text-white font-bold">
                      [{myPayload.defenseLevel}/100]
                    </span>
                    。
                    {myPayload.defenseLevel > 60
                      ? " 看似冷酷高墙，其实内心极度渴望被强势突破和紧紧包裹。而系统为你匹配的他，恰好拥有着游刃有余的包容力与掌控欲，能轻易撕下你的伪装，给你绝对的安全感。"
                      : " 你不喜欢充满压迫感的束缚，更喜欢留下试探与喘息的空间。而系统为你匹配的他，刚好是一个懂得循序渐进、温柔引导你的耐性捕手。"}
                  </p>
                </div>

                <div className="border-l-2 border-brand-emerald-400/50 pl-3">
                  <span className="font-bold text-brand-emerald-400 block mb-1">
                    🛠️ 工程师解读：冰与火的双人舞
                  </span>
                  <p>
                    大白话：关于物理温度，你喜欢『{myPayload.tempPreference}
                    』，对方喜欢『{mockPartnerData.tempPreference}』。
                    这套【双人感官同步方案】设备会通过动态调节，自动在这两种极端感受中交替循环，让你们在冰火两重天的碰撞中，一起被推到共同的巅峰。
                  </p>
                </div>

                {myPayload.hiddenNeed && (
                  <div className="bg-brand-slate-950/50 p-3 rounded border border-brand-slate-800">
                    <span className="font-bold text-brand-rose-400 block mb-1 text-xs">
                      🔒 关于你不为人知的隐秘癖好...
                    </span>
                    <p className="italic text-brand-slate-400">
                      你在登舱前偷偷写下的话：“{myPayload.hiddenNeed}”
                    </p>
                    <p className="mt-2 text-brand-cyan-300">
                      系统给到了回执：对方看了之后笑了笑说，“巧了，我一直在等一个敢提这种要求的同类。”
                      ——
                      你们的这点小秘密，已经被彻底编译进了这台双方联动设备的震动马达里。
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* 深空医学档案 */}
        <section className="mt-8 bg-brand-slate-900/40 border border-brand-cyan-900/30 rounded-sm p-4 sm:p-6 relative">
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-emerald-400 rounded-tl-sm" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand-emerald-400 rounded-tr-sm" />

          <h2 className="text-sm text-brand-emerald-400 font-bold mb-4 tracking-widest uppercase border-b border-brand-slate-800 pb-2 flex items-center gap-2">
            🔬 [ 深空医典：为你定制的科普档案 ]
          </h2>

          <div className="space-y-4">
            {getPersonalizedTips({
              defenseLevel: myPayload.defenseLevel,
              tempPreference: myPayload.tempPreference,
              rhythmPerception: myPayload.rhythmPerception,
            }).map((card) => (
              <div
                key={card.id}
                className="border-l-2 border-brand-cyan-500/40 pl-4 py-2"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{card.icon}</span>
                  <span className="text-xs font-bold text-white tracking-wide">
                    {card.title}
                  </span>
                </div>
                <p className="text-xs text-brand-slate-400 leading-relaxed mb-1">
                  {card.detail}
                </p>
                <p className="text-[10px] text-brand-slate-600 italic">
                  — {card.source}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => router.push("/knowledge")}
              className="text-[10px] text-brand-cyan-500 hover:text-brand-cyan-400 tracking-widest uppercase transition-colors"
            >
              [ 📚 探索更多深空医典 → ]
            </button>
          </div>
        </section>

        {/* 底部功能盘 */}
        <footer className="pt-12 text-center space-y-4">
          <SimulationButton
            rhythm={myPayload.rhythmPerception}
            temp={myPayload.tempPreference}
          />
          <br />
          <button
            onClick={() => router.push("/match")}
            className="px-8 py-3 border border-brand-emerald-500/50 text-brand-emerald-400 text-sm font-bold tracking-widest uppercase hover:bg-brand-emerald-500/10 hover:shadow-[0_0_15px_rgba(52,211,153,0.2)] transition-all"
          >
            [ 🎰 盲盒配对 · 遇见你的异星灵魂 ]
          </button>
          <br />
          <button
            onClick={() => router.push("/")}
            className="px-8 py-3 bg-transparent border border-brand-cyan-500/50 text-brand-cyan-500 text-sm font-bold tracking-widest uppercase hover:bg-brand-cyan-500/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all"
          >
            [ 重启领航协议 ]
          </button>
        </footer>
      </div>
    </main>
  );
}
