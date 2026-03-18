"use client";

import * as React from "react";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAgentStore } from "@/store/useAgentStore";
import { BlueprintRadar } from "@/components/charts/BlueprintRadar";
import ZhihuRecommendationsReal from "@/components/knowledge/ZhihuRecommendations";
import { MedicalDictionary } from "@/components/knowledge/MedicalDictionary";
import { BlueprintChat } from "@/components/chat/BlueprintChat";

/** 模拟试机按钮组件 */
/*
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
*/

export default function BlueprintPage() {
  const router = useRouter();
  const getSerializedPayload = useAgentStore(
    (state) => state.getSerializedPayload,
  );
  const bestMatchUser = useAgentStore((state) => state.bestMatchUser);
  const matchReason = useAgentStore((state) => state.matchReason);
  const [isRendered, setIsRendered] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);

  // 预生成星空背景粒子保持沉浸感 (Moved to useEffect to avoid hydration error)
  const [stars, setStars] = useState<any[]>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: 60 }).map(() => ({
        id: Math.random(),
        width: Math.random() * 2 + 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
        animationDuration: Math.random() * 3 + 2,
        animationDelay: Math.random() * 2,
        opacity: Math.random() * 0.4 + 0.1,
      })),
    );
  }, []);

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
      name: "拦截未知信号源波段",
      value: [
        mockPartnerData.defenseLevel,
        tempToNum(mockPartnerData.tempPreference),
        mockPartnerData.rhythmPerception,
        mockPartnerData.hiddenNeed.length > 0 ? 70 : 40,
        85, // 适配张力虚拟值
      ],
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

  const fetchAnalysis = useCallback(async (isReload = false) => {
    if (!isReload && fetchCalledRef.current) return;
    if (!isReload) fetchCalledRef.current = true;

    setIsLoadingAnalysis(true);
    try {
      const currentPayload = getSerializedPayload();
      const mockPartnerData = {
        defenseLevel: Math.max(0, currentPayload.defenseLevel - 15),
        tempPreference: "温热",
        rhythmPerception: Math.min(100, currentPayload.rhythmPerception + 10),
        hiddenNeed: "接收到匹配信号",
      };

      const res = await fetch("/api/blueprint-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          myPayload: currentPayload,
          partnerData: mockPartnerData,
          isSolo: false,
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
  }, [getSerializedPayload]);

  useEffect(() => {
    // 页面加载时的轻微延迟动画
    const timer = setTimeout(() => setIsRendered(true), 500);
    fetchAnalysis();
    return () => clearTimeout(timer);
  }, [fetchAnalysis]);

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

      <div className="w-full max-w-md md:max-w-6xl md:px-6 mx-auto z-10 space-y-8 mt-10 sm:mt-0">
        {/* 头部摘要: 神秘信号拦截 */}
        <header className="border-l-4 border-brand-rose-500 pl-4 sm:pl-6 py-2 relative z-10 bg-brand-slate-950/40 backdrop-blur-sm -ml-4 pr-4 sm:ml-0 shadow-sm rounded-r-md">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-brand-rose-400 tracking-widest uppercase mb-2 drop-shadow-lg flex items-center gap-2 animate-pulse">
            [系统拦截到高频类星体共振]
          </h1>
          <div className="text-xs sm:text-sm font-bold text-white uppercase flex flex-col sm:flex-row gap-2 sm:items-center sm:space-x-4">
            <span className="text-brand-cyan-500">
              波段解析契合度: 99.8% (极高纯度)
            </span>
            <span className="hidden sm:inline text-brand-slate-500">|</span>
            <span className="text-brand-emerald-400">
              未知信号源:{" "}
              {bestMatchUser
                ? `UNKNOWN_ENTITY_#${bestMatchUser.username.slice(0, 4).toUpperCase()}`
                : "CLASSIFIED_SEC"}
            </span>
          </div>
          <p className="mt-4 text-sm text-brand-slate-300 font-medium leading-relaxed max-w-2xl border-l-2 border-brand-slate-700 pl-3">
            “领航员，在此前 3.4
            亿光年的扫描中，从未见过如此相似的波段反馈。根据初步解译，对方同样在防线测试中表现出了惊人的戒备，且与你一样，偏好冰冷的恒温舱。
            <br />
            <br />
            <span className="text-brand-emerald-400 font-bold block mb-2 text-md">
              ⚠️{" "}
              {matchReason
                ? `系统解码: "${matchReason}"`
                : "结论：在这片深空里，你绝对不是异类。"}
            </span>
          </p>

          {/* Add a direct portal link to the partner's SecondMe profile if available */}
          {/* {bestMatchUser && bestMatchUser.route && (
            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <a
                href={`https://second-me.cn/${bestMatchUser.route}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 bg-brand-cyan-900/40 border border-brand-cyan-500/50 text-brand-cyan-300 text-xs font-bold tracking-widest uppercase hover:bg-brand-cyan-500 hover:text-brand-slate-900 transition-all rounded-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                [ 开启舱门，登陆 Ta 的主页 ]
              </a>
              <span className="text-[10px] text-brand-slate-500 tracking-widest">
                信号源已锁定，随时可发起物理接触。
              </span>
            </div>
          )} */}
        </header>

        {/* 核心内容网格 */}
        <div
          className={`grid grid-cols-1 md:grid-cols-12 gap-8 transition-opacity duration-1000 delay-300 ${isRendered ? "opacity-100" : "opacity-0"}`}
        >
          {/* 左侧：雷达图表区 */}
          <section className="md:col-span-5 lg:col-span-4 bg-brand-slate-900/50 border border-brand-cyan-900/30 rounded-sm p-4 sm:p-6 relative md:sticky md:top-24 h-fit shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            {/* 顶角修饰 */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-cyan-500 rounded-tl-sm" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand-cyan-500 rounded-tr-sm" />

            <h2 className="text-sm text-brand-emerald-400 font-bold mb-4 tracking-widest uppercase border-b border-brand-slate-800 pb-2 flex justify-between">
              <span>[ 拦截信号雷达映射图 ]</span>
              <span className="text-xs text-brand-rose-500 animate-pulse hidden sm:inline">
                解密对方身份...
              </span>
            </h2>
            <div className="mt-2 mix-blend-screen opacity-90 grayscale-[0.1]">
              <BlueprintRadar indicator={radarIndicators} data={radarData} />
            </div>
            <p className="mt-4 text-[10px] text-brand-slate-500 text-center uppercase tracking-widest border-t border-brand-slate-800/60 pt-4">
              "本我数据与拦截波段特征比对"
            </p>
          </section>

          {/* 右侧：工程参数与医学批注池 + 其他模块 */}
          <section className="md:col-span-7 lg:col-span-8 flex flex-col gap-8">
            <div className="space-y-6">
              <div className="bg-brand-slate-900/50 border border-brand-cyan-900/30 p-4 sm:p-6 rounded-sm relative shadow-md">
                {/* 底角修饰 */}
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-brand-cyan-500 rounded-bl-sm" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-cyan-500 rounded-br-sm" />

                <h2 className="text-sm text-brand-cyan-500 font-bold mb-4 tracking-widest uppercase border-b border-brand-slate-800 pb-2">
                  [ 物理层：星舰拟真工程参数 ]
                </h2>
                <ul className="grid grid-cols-1 xl:grid-cols-2 gap-6 text-sm mt-6">
                  <li className="flex flex-col border-b border-brand-slate-800/50 pb-2 h-full">
                    <div className="flex justify-between mb-1 items-start gap-4">
                      <span className="text-brand-slate-500 shrink-0">
                        核能供暖 (拟真发热)
                      </span>
                      <span className="text-white font-bold tracking-tight text-right text-xs">
                        {analysisData?.recommendedTemp || defaultTemp}
                      </span>
                    </div>
                  </li>
                  <li className="flex flex-col border-b border-brand-slate-800/50 pb-2 h-full">
                    <div className="flex justify-between mb-1 items-start gap-4">
                      <span className="text-brand-slate-500 shrink-0">
                        舰表涂装 (机体材质)
                      </span>
                      <span className="text-white font-bold tracking-tight text-right text-xs">
                        {analysisData?.recommendedCmf || defaultCmf}
                      </span>
                    </div>
                  </li>
                  <li className="flex flex-col border-b border-brand-slate-800/50 pb-2 xl:col-span-2 h-full">
                    <div className="flex justify-between mb-1 items-start gap-4">
                      <span className="text-brand-slate-500 shrink-0">
                        曲率引擎 (震波频段)
                      </span>
                      <span className="text-white font-bold tracking-tight text-right text-xs">
                        {analysisData?.recommendedFrequency || defaultFreq}
                      </span>
                    </div>
                  </li>
                  <li className="flex justify-between pb-1 xl:col-span-2 h-full items-center">
                    <span className="text-brand-slate-500">结构抗撕裂系数</span>
                    <span className="text-emerald-400 font-bold tracking-tight text-xs">
                      等级 V (极高)
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-brand-slate-900/40 border border-brand-rose-900/50 p-4 sm:p-6 rounded-sm backdrop-blur-md relative overflow-hidden shadow-md">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-rose-500/5 rounded-full blur-2xl pointer-events-none" />

                <h2 className="text-sm text-brand-rose-400 font-bold mb-4 tracking-widest uppercase flex items-center justify-between border-b border-brand-slate-800/80 pb-2">
                  <span className="flex items-center">
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    [ 共鸣特征提权解译：你们为何如此相似？ ]
                  </span>
                  <button
                    onClick={() => fetchAnalysis(true)}
                    disabled={isLoadingAnalysis}
                    className="text-brand-rose-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="重新生成解译"
                  >
                    <svg className={`w-4 h-4 ${isLoadingAnalysis ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </h2>

                <div className="text-xs sm:text-sm text-brand-slate-300 leading-relaxed space-y-4">
                  {isLoadingAnalysis ? (
                    <div className="flex flex-col gap-5 animate-pulse">
                      <div className="border-l-2 border-brand-cyan-500/30 pl-3">
                        <div className="h-4 w-40 bg-brand-cyan-900/40 rounded mb-2"></div>
                        <div className="h-3 w-full bg-brand-slate-800/80 rounded mb-1"></div>
                        <div className="h-3 w-5/6 bg-brand-slate-800/80 rounded mb-1"></div>
                        <div className="h-3 w-2/3 bg-brand-slate-800/80 rounded"></div>
                      </div>
                      <div className="border-l-2 border-brand-emerald-400/30 pl-3">
                        <div className="h-4 w-40 bg-brand-emerald-900/40 rounded mb-2"></div>
                        <div className="h-3 w-full bg-brand-slate-800/80 rounded mb-1"></div>
                        <div className="h-3 w-3/4 bg-brand-slate-800/80 rounded"></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="border-l-2 border-brand-cyan-500/50 pl-3">
                        <span className="font-bold text-brand-cyan-400 block mb-1">
                          👨‍⚕️ 情感医生诊断：性格齿轮的咬合
                        </span>
                        <p>{analysisData?.doctorDiagnosis}</p>
                      </div>

                      <div className="border-l-2 border-brand-emerald-400/50 pl-3">
                        <span className="font-bold text-brand-emerald-400 block mb-1">
                          🛠️ 工程师解读：冰与火的双人舞
                        </span>
                        <p>{analysisData?.engineerAnalysis}</p>
                      </div>

                      {analysisData?.hiddenFeedback && myPayload.hiddenNeed && (
                        <div className="bg-brand-slate-950/50 p-4 rounded border border-brand-slate-800 shadow-inner mt-4">
                          <span className="font-bold text-brand-rose-400 block mb-2 md:text-sm">
                            🔒 关于你不为人知的隐秘癖好...
                          </span>
                          <p className="italic text-brand-slate-400 border-l-2 border-brand-rose-400/30 pl-2">
                            你在登舱前偷偷写下的话：“{myPayload.hiddenNeed}”
                          </p>
                          <p className="mt-3 text-brand-cyan-300">
                            {analysisData.hiddenFeedback}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 其他模块如内容推荐等可以作为右侧列中的后续区块 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-20">
              <div className="h-full">
                <ZhihuRecommendationsReal payload={myPayload} />
              </div>
              <div className="h-full">
                <MedicalDictionary
                  defenseLevel={myPayload.defenseLevel}
                  tempPreference={myPayload.tempPreference}
                  rhythmPerception={myPayload.rhythmPerception}
                  hiddenNeed={myPayload.hiddenNeed}
                  profileData={myPayload.profileData}
                  className="h-full w-full"
                />
              </div>
            </div>

            {/* =====================
                A2A 实况镜像聊天 
                (自动启动双盲身份探测)
               ===================== */}
            {isRendered && !isLoadingAnalysis && (
              <div className="w-full mt-4">
                <BlueprintChat myPayload={myPayload} bestMatchUser={bestMatchUser ?? null} />
              </div>
            )}
          </section>
        </div>

        {/* 底部功能盘 */}
        <footer className="pt-4 pb-12 text-center space-y-4 relative z-20">
          <button
            onClick={() => router.push("/")}
            className="px-8 py-3 bg-brand-slate-900 shadow-xl border border-brand-cyan-500/30 text-brand-cyan-600 text-sm font-bold tracking-widest uppercase hover:bg-brand-cyan-500/5 hover:text-brand-cyan-400 transition-all mt-6"
          >
            [ 重启领航协议 ]
          </button>
        </footer>
      </div>
    </main>
  );
}
