"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAgentStore } from "@/store/useAgentStore";
import { TempPreference } from "@/types/agent";
import { scenarioTips } from "@/data/medicalKnowledge";

interface Scenario {
  id: number;
  scene: string;
  hint: string; // 口语化提示
  optionA: { text: string; effect: () => void };
  optionB: { text: string; effect: () => void };
}

export default function ScenarioPage() {
  const router = useRouter();
  const {
    setDefenseLevel,
    setTempPreference,
    setRhythmPerception,
    setHiddenNeed,
  } = useAgentStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [chosenSide, setChosenSide] = useState<"A" | "B" | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);

  // 累计参数收集器
  const [accDefense, setAccDefense] = useState(50);
  const [accTemp, setAccTemp] = useState<TempPreference>("恒温");
  const [accRhythm, setAccRhythm] = useState(50);
  const [accHidden, setAccHidden] = useState("");

  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsRendered(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // 加载可用语音列表
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const loadVoices = () => {
      const voices = synth.getVoices().filter((v) => v.lang.startsWith("zh"));
      setAvailableVoices(voices);
    };

    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => {
      synth.removeEventListener("voiceschanged", loadVoices);
      synth.cancel();
    };
  }, []);

  // 星空背景粒子
  const stars = useMemo(
    () =>
      Array.from({ length: 50 }).map(() => ({
        id: Math.random(),
        size: Math.random() * 2 + 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
        dur: Math.random() * 6 + 10,
        delay: Math.random() * 2,
      })),
    [],
  );

  // 根据性别偏好选择最佳声音
  const pickVoice = useCallback(
    (gender: "female" | "male"): SpeechSynthesisVoice | null => {
      if (availableVoices.length === 0) return null;

      // 常见中文女声/男声关键词
      const femaleKeys = [
        "female",
        "ting-ting",
        "sinji",
        "lili",
        "xiaoxiao",
        "xiaoyi",
        "女",
      ];
      const maleKeys = ["male", "damayolo", "yunxi", "yunyang", "男"];
      const keys = gender === "female" ? femaleKeys : maleKeys;

      const match = availableVoices.find((v) =>
        keys.some((k) => v.name.toLowerCase().includes(k)),
      );
      return match || availableVoices[0];
    },
    [availableVoices],
  );

  // 语音播放/停止
  const toggleSpeech = useCallback(
    (text: string) => {
      const synth = window.speechSynthesis;
      if (!synth) return;

      if (synth.speaking) {
        synth.cancel();
        setIsSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      utterance.rate = 0.9;
      utterance.pitch = voiceGender === "female" ? 1.1 : 0.85;

      const selectedVoice = pickVoice(voiceGender);
      if (selectedVoice) utterance.voice = selectedVoice;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      speechUtteranceRef.current = utterance;
      setIsSpeaking(true);
      synth.speak(utterance);
    },
    [voiceGender, pickVoice],
  );

  // 切题时停止语音
  const stopSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const scenarios: Scenario[] = [
    {
      id: 1,
      scene:
        "飞船突然失去重力，你的身体开始不受控地漂浮。身旁刚好有一个人，也在失重中缓缓飘向你……",
      hint: "💡 这道题想知道：当身体不受控地靠近另一个人，你的第一反应是保护自己，还是顺其自然？",
      optionA: {
        text: "🫸 本能地抓住扶手，稳住自己的身体",
        effect: () => setAccDefense((d) => Math.min(100, d + 20)),
      },
      optionB: {
        text: "🫳 松开手，放任自己的身体飘向他",
        effect: () => setAccDefense((d) => Math.max(0, d - 20)),
      },
    },
    {
      id: 2,
      scene:
        "飞船气闸发生泄漏，舱内温度剧烈变化中。系统发出紧急温度选择，你最渴望的环境温度是——",
      hint: "💡 简单来说：你更喜欢冰凉的刺激感，还是灼热的包围感？",
      optionA: {
        text: "❄️ 极光冰原：冰凉穿骨，清醒而颤栗",
        effect: () => setAccTemp("极寒"),
      },
      optionB: {
        text: "🔥 恒星表面：灼热融化一切边界",
        effect: () => setAccTemp("熔毁"),
      },
    },
    {
      id: 3,
      scene:
        "所有通讯信号中断了。漫长的寂静中，飞船壁传来一阵震动，你本能地期待那个震动的节奏是……",
      hint: "💡 这道题想知道：你更喜欢慢节奏的温柔感，还是快节奏的强烈冲击？",
      optionA: {
        text: "🌊 海浪般缓慢而连绵的，如同胸膛上安静的心跳",
        effect: () => setAccRhythm((r) => Math.max(10, r - 20)),
      },
      optionB: {
        text: "⚡ 急促且密集的，像失控的引擎不给你任何喘息",
        effect: () => setAccRhythm((r) => Math.min(100, r + 25)),
      },
    },
    {
      id: 4,
      scene:
        "在深空最孤独的角落，通讯屏亮了。一封匿名密信到达——来自某个陌生的异星灵魂……",
      hint: "💡 换句话说：面对未知的东西，你是谨慎型还是冲动型？",
      optionA: {
        text: "🔍 小心翼翼地打开，反复品读每一个字",
        effect: () => setAccDefense((d) => Math.min(100, d + 10)),
      },
      optionB: {
        text: "💥 一把撕开，不管写了什么，先感受冲击再说",
        effect: () => setAccDefense((d) => Math.max(0, d - 10)),
      },
    },
    {
      id: 5,
      scene:
        "坍缩倒计时开始了。宇宙即将重启，你只有最后一秒的自由意志。你选择——",
      hint: "💡 最后一题：你更享受一个人的独处时光，还是和某个人缠绵到不分彼此？",
      optionA: {
        text: "🪐 一个人静静地漂流，在寂寥中与自己和解",
        effect: () => setAccHidden("渴望独处时与自我的极致对话"),
      },
      optionB: {
        text: "🔗 和某个人纠缠到宇宙尽头，永不松手",
        effect: () => setAccHidden("渴望与灵魂共振的人产生不可分割的羁绊"),
      },
    },
  ];

  const isLastQuestion = currentIndex >= scenarios.length - 1;
  const currentScenario = scenarios[currentIndex];
  const progress = ((currentIndex + 1) / scenarios.length) * 100;

  const handleChoice = (side: "A" | "B") => {
    if (isTransitioning) return;
    setChosenSide(side);
    stopSpeech();

    // 执行隐式参数映射
    if (side === "A") {
      currentScenario.optionA.effect();
    } else {
      currentScenario.optionB.effect();
    }

    // 过渡动画 + 科普 tip 展示
    setTimeout(() => {
      setIsTransitioning(true);
    }, 300);

    // 显示科普小贴士（用户手动点击才继续）
    setTimeout(() => {
      setShowTip(true);
    }, 600);
  };

  // 用户点击科普卡片上的“下一题”按钮
  const handleNextFromTip = () => {
    setShowTip(false);
    if (isLastQuestion) {
      setDefenseLevel(accDefense);
      setTempPreference(accTemp);
      setRhythmPerception(accRhythm);
      setHiddenNeed(accHidden);
      router.push("/observatory");
    } else {
      setCurrentIndex((i) => i + 1);
      setChosenSide(null);
      setIsTransitioning(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-slate-950 text-white font-mono flex flex-col items-center justify-center relative overflow-hidden p-4">
      {/* 深空背景 */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.08)_0%,transparent_70%)] mix-blend-screen" />
        {isRendered &&
          stars.map((p) => (
            <div
              key={p.id}
              className="absolute bg-white/30 rounded-full animate-pulse"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                top: `${p.top}%`,
                left: `${p.left}%`,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
      </div>

      {/* 进度条 */}
      <div className="absolute top-0 left-0 right-0 h-1 z-50">
        <div
          className="h-full bg-gradient-to-r from-brand-cyan-500 to-brand-emerald-400 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 返回按钮 */}
      <button
        onClick={() => {
          stopSpeech();
          router.back();
        }}
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
        <span>[ 返回 ]</span>
      </button>

      {/* 题号 */}
      <div className="absolute top-6 right-6 z-50 text-xs text-brand-slate-500 tracking-widest">
        [ {currentIndex + 1} / {scenarios.length} ]
      </div>

      {/* 核心问答区 */}
      <div
        className={`relative z-10 max-w-2xl w-full flex flex-col items-center text-center transition-all duration-700
        ${isTransitioning ? "opacity-0 scale-95 -translate-y-4" : "opacity-100 scale-100 translate-y-0"}
        ${isRendered ? "" : "opacity-0"}`}
      >
        {/* 情境描述 */}
        <div className="mb-6 sm:mb-8 px-4">
          <p className="text-lg sm:text-xl md:text-2xl text-brand-slate-300 leading-relaxed font-light tracking-wide">
            {currentScenario.scene}
          </p>

          {/* 语音控制区 */}
          <div className="mt-4 flex items-center justify-center gap-3">
            {/* 语音播放按钮 */}
            {/* <button
              onClick={() => toggleSpeech(currentScenario.scene)}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full border transition-all duration-300 text-xs tracking-wider
                ${isSpeaking
                  ? "border-brand-cyan-400/60 bg-brand-cyan-950/40 text-brand-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  : "border-brand-slate-700 bg-brand-slate-900/50 text-brand-slate-400 hover:border-brand-cyan-500/40 hover:text-brand-cyan-400"
                }`}
            >
              {isSpeaking ? (
                <>
                  <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                  <span>播放中…</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.5l5-4v15l-5-4H4a1 1 0 01-1-1v-5a1 1 0 011-1h2.5z" />
                  </svg>
                  <span>🔊 朗读情境</span>
                </>
              )}
            </button> */}

            {/* 男/女声切换 */}
            {/* <div className="inline-flex items-center rounded-full border border-brand-slate-700 bg-brand-slate-900/50 overflow-hidden text-[10px] tracking-wider">
              <button
                onClick={() => {
                  stopSpeech();
                  setVoiceGender("female");
                }}
                className={`px-3 py-2 transition-all duration-300 ${
                  voiceGender === "female"
                    ? "bg-brand-cyan-500/20 text-brand-cyan-400 font-bold"
                    : "text-brand-slate-500 hover:text-brand-slate-300"
                }`}
              >
                ♀ 女声
              </button>
              <div className="w-px h-4 bg-brand-slate-700" />
              <button
                onClick={() => {
                  stopSpeech();
                  setVoiceGender("male");
                }}
                className={`px-3 py-2 transition-all duration-300 ${
                  voiceGender === "male"
                    ? "bg-brand-cyan-500/20 text-brand-cyan-400 font-bold"
                    : "text-brand-slate-500 hover:text-brand-slate-300"
                }`}
              >
                ♂ 男声
              </button>
            </div> */}
          </div>
        </div>

        {/* 口语化提示 */}
        <div className="mb-8 sm:mb-10 px-6">
          <p className="text-xs sm:text-sm text-brand-slate-500 leading-relaxed tracking-wide italic">
            {currentScenario.hint}
          </p>
        </div>

        {/* 双选项 */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 px-2">
          {/* 选项 A */}
          <button
            onClick={() => handleChoice("A")}
            disabled={isTransitioning}
            className={`group relative p-6 sm:p-8 rounded-lg border text-left transition-all duration-500 cursor-pointer overflow-hidden
              ${
                chosenSide === "A"
                  ? "border-brand-cyan-400 bg-brand-cyan-950/40 shadow-[0_0_30px_rgba(6,182,212,0.3)] scale-[1.02]"
                  : chosenSide === "B"
                    ? "border-brand-slate-800 opacity-30 scale-95"
                    : "border-brand-slate-700 hover:border-brand-cyan-500/60 bg-brand-slate-900/30 hover:bg-brand-cyan-950/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]"
              }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="relative text-sm sm:text-base text-brand-slate-300 group-hover:text-white transition-colors leading-relaxed block">
              {currentScenario.optionA.text}
            </span>
          </button>

          {/* 选项 B */}
          <button
            onClick={() => handleChoice("B")}
            disabled={isTransitioning}
            className={`group relative p-6 sm:p-8 rounded-lg border text-left transition-all duration-500 cursor-pointer overflow-hidden
              ${
                chosenSide === "B"
                  ? "border-brand-emerald-400 bg-brand-emerald-950/40 shadow-[0_0_30px_rgba(52,211,153,0.3)] scale-[1.02]"
                  : chosenSide === "A"
                    ? "border-brand-slate-800 opacity-30 scale-95"
                    : "border-brand-slate-700 hover:border-brand-emerald-500/60 bg-brand-slate-900/30 hover:bg-brand-emerald-950/20 hover:shadow-[0_0_20px_rgba(52,211,153,0.1)]"
              }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="relative text-sm sm:text-base text-brand-slate-300 group-hover:text-white transition-colors leading-relaxed block">
              {currentScenario.optionB.text}
            </span>
          </button>
        </div>

        {/* 底部提示 */}
        <p className="mt-10 text-xs text-brand-slate-600 tracking-widest animate-pulse">
          [ 凭你的第一直觉选择 ]
        </p>
      </div>

      {/* 转场科普浮层 */}
      {showTip && (() => {
        const tip = scenarioTips.find((t) => t.scenarioId === currentScenario.id);
        if (!tip) return null;
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-slate-950/60 backdrop-blur-sm">
            <div className="max-w-md w-full bg-brand-slate-900/95 backdrop-blur-xl border border-brand-cyan-800/40 rounded-lg p-6 shadow-[0_0_40px_rgba(6,182,212,0.15)] animate-[fadeIn_0.5s_ease-out]">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{tip.icon}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-cyan-500/15 text-brand-cyan-400 font-bold tracking-widest uppercase">
                  🔬 深空医典
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-2 tracking-wide">
                {tip.title}
              </h3>
              <p className="text-xs text-brand-slate-400 leading-relaxed mb-3">
                {tip.content}
              </p>
              <p className="text-[10px] text-brand-slate-600 italic mb-5">
                — {tip.source}
              </p>
              <button
                onClick={handleNextFromTip}
                className="w-full py-3 border border-brand-cyan-500/50 text-brand-cyan-400 text-xs font-bold tracking-widest uppercase hover:bg-brand-cyan-500/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all rounded-md"
              >
                {isLastQuestion ? "[ → 查看你的蓝图 ]" : `[ → 第 ${currentIndex + 2} 题 ]`}
              </button>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
