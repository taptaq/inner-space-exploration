"use client";

import * as React from "react";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAgentStore } from "@/store/useAgentStore";
import { BlueprintRadar } from "@/components/charts/BlueprintRadar";
import ZhihuRecommendationsReal from "@/components/knowledge/ZhihuRecommendations";
import { MedicalDictionary } from "@/components/knowledge/MedicalDictionary";

/** 模拟试机按钮组件 */
/*
function SimulationButton({ rhythm, temp }: { rhythm: number; temp: string }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [pulseOpacity, setPulseOpacity] = useState(0);

  const colorMap: Record<string, string> = {
    极寒: "rgba(56,189,248,VAL)",
    冷静: "rgba(6,182,212,VAL)",
    恒温: "rgba(52,211,153,VAL)",
    温热: "rgba(251,146,60,VAL)",
    熔毁: "rgba(244,63,94,VAL)",
  };

  const pulseColor = (colorMap[temp] || "rgba(14,165,233,VAL)").replace(
    "VAL",
    String(pulseOpacity),
  );

  const startSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    const interval = Math.max(50, 500 - rhythm * 4);
    let elapsed = 0;
    const duration = 5000;
    const pulseTimer = setInterval(() => {
      elapsed += interval;
      setPulseOpacity(Math.abs(Math.sin((elapsed / interval) * 0.5)) * 0.35);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(interval * 0.6);
      }
      if (elapsed >= duration) {
        clearInterval(pulseTimer);
        setPulseOpacity(0);
        setIsSimulating(false);
        if (typeof navigator !== "undefined" && navigator.vibrate)
          navigator.vibrate(0);
      }
    }, interval);
  };

  return (
    <>
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
            : "border-sky-500/50 text-sky-400 hover:bg-sky-500/10 hover:shadow-[0_0_15px_rgba(14,165,233,0.2)]"
        }`}
      >
        {isSimulating ? "[ 模拟运行中... ]" : "[ ⚡ 模拟试机 · 感受你的蓝图 ]"}
      </button>
    </>
  );
}
*/

export default function BlueprintSoloPage() {
  const router = useRouter();
  const getSerializedPayload = useAgentStore(
    (state) => state.getSerializedPayload,
  );
  const [isRendered, setIsRendered] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);

  // 预生成孤寂星空背景粒子保持沉浸感
  const [stars, setStars] = useState<any[]>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: 40 }).map(() => ({
        id: Math.random(),
        width: Math.random() * 2 + 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
        animationDuration: Math.random() * 4 + 3,
        animationDelay: Math.random() * 3,
        opacity: Math.random() * 0.3 + 0.1,
      })),
    );
  }, []);

  // 获取当前领航员自身数据
  const myPayload = getSerializedPayload();

  // 雷达图配置
  const radarIndicators = [
    { name: "防线韧性", max: 100 },
    { name: "感知极寒", max: 100 },
    { name: "共振频率", max: 100 },
    { name: "隐秘极性", max: 100 },
    { name: "独立张力", max: 100 },
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

  // 单人专属极坐标维系参数
  const radarData = [
    {
      name: "本我绝对安全边界",
      value: [
        myPayload.defenseLevel,
        120 - tempToNum(myPayload.tempPreference), // 转化成寒冷反转
        myPayload.rhythmPerception,
        myPayload.hiddenNeed.length > 0 ? 80 : 30,
        85, // 强大的独立张力
      ],
      // 样式覆盖：单人变冷色调
      itemStyle: { color: "#38bdf8" },
      lineStyle: { color: "#38bdf8", type: "dashed" as const },
      areaStyle: { color: "rgba(56,189,248,0.2)" },
    },
  ];

  // 计算和 SVG 渲染组件完全一致的默认回退值
  const defaultCmf =
    myPayload.defenseLevel > 60
      ? "高密度星舰级防震硅胶 (High-density Aircraft Silicone)"
      : "液态匿踪仿生果冻胶 (Liquid Stealth Jelly TPE)";

  let defaultTemp = "38°C (标准推进)";
  if (myPayload.tempPreference === "极寒") defaultTemp = "20°C (休眠冰息)";
  if (myPayload.tempPreference === "冷静") defaultTemp = "32°C (低功率巡航)";
  if (myPayload.tempPreference === "恒温") defaultTemp = "37.5°C (拟真体温)";
  if (myPayload.tempPreference === "温热") defaultTemp = "42°C (加力推进)";
  if (myPayload.tempPreference === "熔毁") defaultTemp = "48°C (感官熔毁临界)";

  const freqMin = Math.max(10, myPayload.rhythmPerception - 30);
  const freqMax = myPayload.rhythmPerception + 40;
  const defaultFreq = `${freqMin} - ${freqMax} Hz (曲率震动阈)`;

  const fetchCalledRef = useRef(false);

  useEffect(() => {
    // 页面加载时的轻微延迟动画
    const timer = setTimeout(() => setIsRendered(true), 500);

    // 发起大模型动态单人解读请求
    const fetchAnalysis = async () => {
      if (fetchCalledRef.current) return;
      fetchCalledRef.current = true;

      try {
        const res = await fetch("/api/blueprint-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            myPayload,
            isSolo: true,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAnalysisData(data);
        } else {
          console.error("Analysis generation failed");
        }
      } catch (e) {
        console.error("API error", e);
      } finally {
        setIsLoadingAnalysis(false);
      }
    };

    fetchAnalysis();

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-brand-slate-950 text-brand-slate-400 p-4 sm:p-6 lg:p-12 relative overflow-x-hidden font-mono flex flex-col items-center">
      {/* 页面全局返回键 */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 text-brand-slate-400 hover:text-sky-500 flex items-center space-x-2 text-xs font-bold tracking-widest uppercase transition-colors"
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
        <span>[ 重新发起匹配 ]</span>
      </button>

      {/* 工业孤影背景修饰 */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-40 z-0" />

      {/* 稀疏暗淡的孤寂星空 */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {stars.map((star: any) => (
          <div
            key={star.id}
            className="absolute bg-sky-100 rounded-full animate-pulse blur-[1px]"
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
        {/* 单人冷蓝色阴云 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(14,165,233,0.05)_0%,transparent_70%)] mix-blend-screen" />
      </div>

      <div className="w-full max-w-5xl z-10 space-y-8 mt-10 sm:mt-0">
        {/* 单人专属头部摘要 */}
        <header className="border-l-4 border-sky-400 pl-4 sm:pl-6 py-3 relative z-10 bg-brand-slate-950/60 backdrop-blur-md -ml-4 pr-4 sm:ml-0 shadow-sm rounded-r-md">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-widest uppercase mb-2 drop-shadow-lg flex items-center">
            专属内太空基建蓝图
          </h1>
          <div className="text-xs sm:text-sm font-bold text-sky-400 uppercase flex flex-col sm:flex-row gap-2 sm:items-center sm:space-x-4 opacity-90">
            <span>[ 寻轨失败 ] 引力网断开</span>
            <span className="hidden sm:inline text-brand-slate-600">|</span>
            <span>当前系统：单人独立沉浸体系重启中...</span>
          </div>
        </header>

        {/* 核心内容网格 */}
        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-8 transition-opacity duration-1000 delay-300 ${isRendered ? "opacity-100" : "opacity-0"}`}
        >
          {/* 左侧：具象化绝对安全边界极坐标图 */}
          <section className="bg-brand-slate-900/50 border border-sky-900/40 rounded-sm p-4 sm:p-6 relative shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-sky-500 rounded-tl-sm" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-sky-500 rounded-tr-sm" />

            <h2 className="text-sm text-sky-400 font-bold mb-4 tracking-widest uppercase border-b border-brand-slate-800 pb-2 flex justify-between">
              <span>[ 极坐标：绝对安全边界 ]</span>
              <span className="text-brand-slate-500 text-[10px]">
                SOUL_ARCH
              </span>
            </h2>
            <div className="mt-2 mix-blend-screen opacity-90 grayscale-[0.2]">
              <BlueprintRadar indicator={radarIndicators} data={radarData} />
            </div>

            <p className="mt-4 text-xs text-brand-slate-500 text-center uppercase tracking-widest border-t border-brand-slate-800/60 pt-4">
              “孤独是通向内心终极秩序的必经之路。”
            </p>
          </section>

          {/* 右侧：单人独立医学与工程批注 */}
          <section className="space-y-6">
            <div className="bg-brand-slate-900/50 border border-sky-900/40 p-4 sm:p-6 rounded-sm relative shadow-md">
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-sky-500 rounded-bl-sm" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-sky-500 rounded-br-sm" />

              <h2 className="text-sm text-sky-300 font-bold mb-4 tracking-widest uppercase border-b border-brand-slate-800 pb-2">
                [ 物理层：星舰拟真工程参数 ]
              </h2>
              <ul className="space-y-4 text-sm mt-6">
                <li className="flex flex-col border-b border-brand-slate-800/50 pb-2">
                  <div className="flex justify-between mb-1 items-start gap-4">
                    <span className="text-brand-slate-500 shrink-0">
                      核能供暖 (拟真发热)
                    </span>
                    <span className="text-white font-bold tracking-tight text-right text-xs">
                      {analysisData?.recommendedTemp || defaultTemp}
                    </span>
                  </div>
                  <span className="text-[10px] text-sky-400/80 mt-1">
                    💡
                    大白话：设备会自动锁定在你最想要的这个温度，不需要别人的体温来温暖你。
                  </span>
                </li>
                <li className="flex flex-col border-b border-brand-slate-800/50 pb-2 mt-3">
                  <div className="flex justify-between mb-1 items-start gap-4">
                    <span className="text-brand-slate-500 shrink-0">
                      曲率引擎 (震波频段)
                    </span>
                    <span className="text-white font-bold tracking-tight text-right text-xs">
                      {analysisData?.recommendedFrequency || defaultFreq}
                    </span>
                  </div>
                  <span className="text-[10px] text-sky-400/80 mt-1">
                    💡
                    大白话：完全按照你喜欢的频率节奏来震动，不用配合别人的节奏委屈自己。
                  </span>
                </li>
                <li className="flex flex-col pb-2 mt-3">
                  <div className="flex justify-between mb-1 items-start gap-4">
                    <span className="text-brand-slate-500 shrink-0">
                      舰表涂装 (机体材质)
                    </span>
                    <span className="text-white font-bold tracking-tight text-right text-xs">
                      {analysisData?.recommendedCmf || defaultCmf}
                    </span>
                  </div>
                  <span className="text-[10px] text-sky-400/80 mt-1">
                    💡 大白话：因为你防线
                    {myPayload.defenseLevel > 60 ? "较高" : "较低"}
                    ，极智中枢为你定制了如上的绝佳材质适配。
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-brand-slate-950 border border-brand-indigo-900/40 p-4 sm:p-6 rounded-sm shadow-md">
              <h2 className="text-sm text-brand-indigo-400 font-bold mb-3 tracking-widest uppercase flex items-center">
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
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
                [ 分析层：AI独立医学客座批注 ]
              </h2>
              <div className="text-xs text-brand-slate-400/80 leading-relaxed space-y-4 mt-4">
                {isLoadingAnalysis ? (
                  <div className="flex flex-col gap-4 animate-pulse pt-2">
                    <div>
                      <div className="h-4 w-1/3 bg-sky-900/40 rounded mb-2"></div>
                      <div className="h-3 w-5/6 bg-brand-slate-800/80 rounded mb-1"></div>
                      <div className="h-3 w-full bg-brand-slate-800/80 rounded"></div>
                    </div>
                    <div>
                      <div className="h-4 w-1/3 bg-brand-indigo-900/40 rounded mb-2"></div>
                      <div className="h-3 w-4/5 bg-brand-slate-800/80 rounded mb-1"></div>
                      <div className="h-3 w-2/3 bg-brand-slate-800/80 rounded"></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p>
                      <strong className="text-sky-300">👨‍⚕️ 医生诊断：</strong>
                      {analysisData?.doctorDiagnosis}
                    </p>
                    <p>
                      <strong className="text-sky-300">🛠️ 架构师建议：</strong>
                      {analysisData?.engineerAnalysis}
                    </p>
                    {analysisData?.hiddenFeedback && myPayload.hiddenNeed && (
                      <p className="text-brand-indigo-400/80 p-3 bg-brand-indigo-900/20 rounded-md border border-brand-indigo-900/40 mt-4">
                        <strong className="text-brand-indigo-300 block mb-2">
                          🔒 你的私密心愿破译：
                        </strong>
                        <span className="italic">"{myPayload.hiddenNeed}"</span>
                        <br />
                        <br />
                        {analysisData.hiddenFeedback}
                      </p>
                    )}
                    <p className="text-sky-400 mt-6 font-bold border-t border-brand-slate-800 pt-3 inline-block text-sm">
                      最终座右铭: &quot;我自己，即是宇宙最大的引力源。&quot;
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* 全网同频共鸣 (取代原有设备图) */}
        <div className="mt-8 relative z-20">
          <ZhihuRecommendationsReal payload={myPayload} />
        </div>

        {/* 深空医学档案 */}
        <div className="mt-8">
          <MedicalDictionary
            defenseLevel={myPayload.defenseLevel}
            tempPreference={myPayload.tempPreference}
            rhythmPerception={myPayload.rhythmPerception}
            hiddenNeed={myPayload.hiddenNeed}
            profileData={myPayload.profileData}
            className="border-sky-900/40 ring-1 ring-sky-500/20"
          />
        </div>

        {/* 底部功能盘 */}
        <footer className="pt-12 text-center space-y-4">
          {/* <SimulationButton
            rhythm={myPayload.rhythmPerception}
            temp={myPayload.tempPreference}
          />
          <br /> */}
          <button
            onClick={() => router.push("/match")}
            className="px-8 py-3 border border-brand-emerald-500/50 text-brand-emerald-400 text-sm font-bold tracking-widest uppercase hover:bg-brand-emerald-500/10 hover:shadow-[0_0_15px_rgba(52,211,153,0.2)] transition-all"
          >
            [ 🎰 盲盒配对 · 去看看还有没有合适的信号 ]
          </button>
          <br />
          <button
            onClick={() => router.push("/")}
            className="px-8 py-3 bg-transparent border border-sky-500/40 text-sky-400 text-sm font-bold tracking-widest uppercase hover:bg-sky-500/10 hover:shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all"
          >
            [ 关闭单人基建协议并重启登舱 ]
          </button>
        </footer>
      </div>
    </main>
  );
}
