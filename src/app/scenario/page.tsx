"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAgentStore } from "@/store/useAgentStore";
import { TempPreference } from "@/types/agent";

const TypewriterText = ({ text, delay = 0, speed = 40 }: { text: string, delay?: number, speed?: number }) => {
  const [displayedText, setDisplayedText] = useState("");
  useEffect(() => {
    let i = 0;
    setDisplayedText("");
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplayedText(text.substring(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay, speed]);
  return <span>{displayedText}</span>;
}

interface ScenarioTip {
  scenarioId: number;
  icon: string;
  title: string;
  content: string;
  source: string;
}

interface Scenario {
  id: number;
  scene: string;
  hint: string; // 口语化提示
  isTextInput?: boolean;
  optionA?: { text: string; effect: () => void };
  optionB?: { text: string; effect: () => void };
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
  const [dbScenarioTips, setDbScenarioTips] = useState<ScenarioTip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chosenSide, setChosenSide] = useState<"A" | "B" | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);

  // 新增：A2A Onboarding Phase
  const [phase, setPhase] = useState<"analyzing" | "review" | "scenario">(
    "analyzing",
  );
  const [prefillData, setPrefillData] = useState<any>(null);

  // 累计参数收集器
  const [accDefense, setAccDefense] = useState(50);
  const [accTemp, setAccTemp] = useState<TempPreference>("恒温");
  const [accRhythm, setAccRhythm] = useState(50);
  const [accHidden, setAccHidden] = useState("");
  
  const [totalShips, setTotalShips] = useState(21439);

  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsRendered(true), 300);

    const initializeData = async () => {
      try {
        const fetchTips = fetch("/api/knowledge?type=scenario").then((res) =>
          res.json(),
        );

        // 优先拉取 user/profile 以确保 store 中有真实的 profileData
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (token) {
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
            useAgentStore.setState({ profileData: data });
          }
        }

        const { profileData } = useAgentStore.getState();
        const fetchPrefill = fetch("/api/agent-prefill", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ profileData }),
        }).then((res) => res.json());

        const fetchStats = fetch("/api/stats")
          .then((res) => res.json())
          .catch(() => ({ totalUsers: 21439 }));

        const [tipsData, prefillData, statsData] = await Promise.all([
          fetchTips,
          fetchPrefill,
          fetchStats,
        ]);

        setDbScenarioTips(tipsData);
        setPrefillData(prefillData);
        if (statsData?.totalUsers !== undefined) {
          setTotalShips(statsData.totalUsers);
        }
        setPhase("review");
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to initialize scenario:", err);
        setPhase("scenario"); // Fallback
        setIsLoading(false);
      }
    };

    initializeData();

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
  const [stars, setStars] = useState<any[]>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: 50 }).map(() => ({
        id: Math.random(),
        size: Math.random() * 2 + 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
        dur: Math.random() * 6 + 10,
        delay: Math.random() * 2,
      })),
    );
  }, []);

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
        "最后，在直觉探测的尾声，你可以无需任何防备地写下关于你隐私癖好、或是隐秘的安全感诉求...",
      hint: "💡 例如想被掌控、渴望完全独处...放心，这里没有任何人会评判你。",
      isTextInput: true,
      optionA: { text: "", effect: () => {} },
      optionB: { text: "", effect: () => {} },
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
      currentScenario.optionA?.effect();
    } else {
      currentScenario.optionB?.effect();
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

  const handleTextSubmit = () => {
    if (!textInput.trim() || isTransitioning) return;
    stopSpeech();
    setAccHidden(textInput.trim());

    setTimeout(() => {
      setIsTransitioning(true);
    }, 300);

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

  if (phase === "analyzing" || isLoading) {
    return (
      <main className="min-h-screen bg-brand-slate-950 font-mono flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          {stars.map((star) => (
            <div
              key={star.id}
              className="absolute bg-white rounded-full opacity-50 animate-twinkle"
              style={{
                width: `${star.size}px`,
                height: `${star.size}px`,
                top: `${star.top}%`,
                left: `${star.left}%`,
                animationDuration: `${star.dur}s`,
                animationDelay: `${star.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-6 z-10 animate-[fadeIn_0.5s_ease-out]">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-4 border-brand-cyan-900/40 rounded-full animate-ping" />
            <div
              className="absolute inset-0 border-4 border-t-brand-cyan-400 border-r-brand-cyan-400 rounded-full animate-spin"
              style={{ animationDuration: "3s" }}
            />
            <div
              className="absolute inset-4 border-4 border-b-brand-emerald-400 border-l-brand-emerald-400 rounded-full animate-spin"
              style={{ animationDuration: "2s", animationDirection: "reverse" }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">
              👁️
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-brand-cyan-400 text-sm md:text-base tracking-[0.2em] uppercase font-black animate-pulse">
              [ Agent 代理正在扫描您的潜意识基底 ]
            </p>
            <p className="text-brand-slate-500 text-xs tracking-wider">
              提取历史痕迹... 重构感官维度...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "review" && prefillData) {
    return (
      <main className="min-h-screen bg-brand-slate-950 font-mono text-white overflow-hidden relative flex flex-col items-center justify-center p-4">
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
          {stars.map((star) => (
            <div
              key={star.id}
              className="absolute bg-white rounded-full opacity-50 animate-twinkle"
              style={{
                width: `${star.size}px`,
                height: `${star.size}px`,
                top: `${star.top}%`,
                left: `${star.left}%`,
                animationDuration: `${star.dur}s`,
                animationDelay: `${star.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="z-10 w-full max-w-lg bg-brand-slate-900/80 border border-brand-emerald-500/30 rounded-lg p-6 md:p-8 backdrop-blur-md shadow-[0_0_40px_rgba(16,185,129,0.1)] animate-[fadeInTop_0.5s_ease-out]">
          <h2 className="text-xl md:text-2xl text-brand-emerald-400 font-black tracking-widest uppercase mb-6 flex items-center gap-3">
            <span className="w-2 h-2 bg-brand-emerald-400 rounded-full animate-pulse" />
            潜意识诊断报告
          </h2>

          <div className="space-y-4 mb-8">
            <div className="bg-brand-slate-950/50 p-4 rounded border border-brand-slate-800">
              <p className="text-sm text-brand-slate-400 mb-1">Agent 侧写：</p>
              <p className="text-base text-brand-slate-200 italic leading-relaxed border-l-2 border-brand-emerald-500/50 pl-3">
                "{prefillData.reasoning}"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-brand-slate-950/50 p-3 rounded border border-brand-slate-800">
                <p className="text-xs text-brand-slate-500 mb-1">
                  心理防线 (Defense)
                </p>
                <p className="text-lg text-brand-cyan-400 font-bold">
                  {prefillData.defenseLevel}%
                </p>
              </div>
              <div className="bg-brand-slate-950/50 p-3 rounded border border-brand-slate-800">
                <p className="text-xs text-brand-slate-500 mb-1">
                  温度偏好 (Temp)
                </p>
                <p className="text-lg text-brand-orange-400 font-bold">
                  {prefillData.tempPreference}
                </p>
              </div>
              <div className="bg-brand-slate-950/50 p-3 rounded border border-brand-slate-800">
                <p className="text-xs text-brand-slate-500 mb-1">
                  节奏感知 (Rhythm)
                </p>
                <p className="text-lg text-brand-purple-400 font-bold">
                  {prefillData.rhythmPerception}%
                </p>
              </div>
              <div className="bg-brand-slate-950/50 p-3 rounded border border-brand-slate-800">
                <p className="text-xs text-brand-slate-500 mb-1">
                  隐秘渴望 (Hidden Need)
                </p>
                <p
                  className="text-sm text-brand-emerald-400 font-bold truncate"
                  title={prefillData.hiddenNeed}
                >
                  {prefillData.hiddenNeed}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => {
                setDefenseLevel(prefillData.defenseLevel || 50);
                setTempPreference(prefillData.tempPreference || "恒温");
                setRhythmPerception(prefillData.rhythmPerception || 50);
                setHiddenNeed(prefillData.hiddenNeed || "寻求共鸣");
                router.push("/observatory");
              }}
              className="w-full py-4 bg-brand-emerald-500/10 border-2 border-brand-emerald-500 text-brand-emerald-400 font-black tracking-widest uppercase hover:bg-brand-emerald-500 hover:text-brand-slate-950 transition-all rounded shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              [ 确认重组此人格，直接升舱 ]
            </button>
            <button
              onClick={() => setPhase("scenario")}
              className="w-full py-3 bg-transparent border border-brand-slate-700 text-brand-slate-400 text-sm tracking-widest uppercase hover:bg-brand-slate-800 hover:text-white transition-all rounded"
            >
              推翻诊断，进行手动场景实测
            </button>
          </div>
        </div>
      </main>
    );
  }

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
        <span>[ 返回 ]</span>
      </button>

      {/* 题号 */}
      <div className="absolute top-6 right-6 z-50 text-xs text-brand-slate-500 tracking-widest">
        [ {currentIndex + 1} / {scenarios.length} ]
      </div>
      <div className="flex-1 flex flex-col items-center justify-center pt-24 pb-32">
        <div
          className={`relative z-10 max-w-md md:max-w-5xl w-full flex flex-col md:grid md:grid-cols-2 md:gap-16 md:items-center text-center md:text-left transition-all duration-700
            ${isTransitioning ? "opacity-0 blur-md scale-95 translate-y-8" : "opacity-100 blur-0 scale-100 translate-y-0"}
            ${isRendered ? "" : "opacity-0"}`}
        >
          {/* 左侧：情境描述与提示 */}
          <div className="flex flex-col md:pr-8">
            <div className="mb-6 sm:mb-8 px-4 md:px-0">
              <p className="text-lg sm:text-xl md:text-3xl text-brand-slate-300 leading-relaxed font-light tracking-wide md:leading-snug">
                {currentScenario.scene}
              </p>

              {/* 语音控制区 */}
              <div className="mt-4 flex items-center justify-center md:justify-start gap-3">
              </div>
            </div>

            {/* 口语化提示 */}
            <div className="mb-8 sm:mb-10 px-6 md:px-0">
              <p className="text-xs sm:text-sm md:text-base text-brand-slate-500 leading-relaxed tracking-wide italic border-l-2 border-brand-slate-800 md:pl-4 pl-0 border-none md:border-solid">
                {currentScenario.hint}
              </p>
            </div>
          </div>

          {/* 右侧：核心问答 / 输入区 */}
          <div className="flex flex-col w-full">
            {currentScenario.isTextInput ? (
              <div className="w-full flex flex-col items-center gap-6 px-4 md:px-0">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="[ 记录你的极密档案... ]"
                  className="w-full h-32 md:h-48 bg-slate-900/80 border border-slate-700 rounded-md p-4 text-slate-200 focus:outline-none focus:border-brand-cyan-500/60 transition-colors resize-none placeholder-slate-500 tracking-wider shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"
                />
                <button
                  onClick={handleTextSubmit}
                  disabled={isTransitioning || !textInput.trim()}
                  className="px-8 py-3 w-full sm:w-auto md:w-full border border-brand-cyan-500/50 text-brand-cyan-400 text-sm md:text-base font-bold tracking-widest uppercase hover:bg-brand-cyan-500/10 transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(6,182,212,0.1)] hover:shadow-[0_4px_30px_rgba(6,182,212,0.2)]"
                >
                  [ 封存并进入引力网 ]
                </button>
              </div>
            ) : (
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4 sm:gap-6 px-2 md:px-0">
                {/* 选项 A */}
                <button
                  onClick={() => handleChoice("A")}
                  disabled={isTransitioning}
                  className={`group relative p-6 sm:p-8 md:p-10 rounded-lg border text-left transition-all duration-500 cursor-pointer overflow-hidden
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
                    {currentScenario.optionA?.text}
                  </span>
                </button>

                {/* 选项 B */}
                <button
                  onClick={() => handleChoice("B")}
                  disabled={isTransitioning}
                  className={`group relative p-6 sm:p-8 md:p-10 rounded-lg border text-left transition-all duration-500 cursor-pointer overflow-hidden
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
                    {currentScenario.optionB?.text}
                  </span>
                </button>
              </div>
            )}

            {/* 底部提示 */}
            <p className="mt-10 md:mt-6 text-xs text-brand-slate-600 tracking-widest animate-pulse md:text-center md:flex md:justify-center">
              {currentScenario.isTextInput
                ? "[ 探寻内心深处的渴望 ]"
                : "[ 凭你的第一直觉选择 ]"}
            </p>
          </div>
        </div>
      </div>

      {/* 转场科普浮层 */}
      {showTip &&
        (() => {
          const tip = dbScenarioTips.find(
            (t) => t.scenarioId === currentScenario.id,
          );
          
          let statsMessage = "";
          if (currentScenario.id === 1) {
             statsMessage = chosenSide === "A" 
                ? `在目前启航的 ${totalShips.toLocaleString()} 艘星舰中，只有 82.4% 的舰长做出了和你一样的选择。` 
                : `在目前启航的 ${totalShips.toLocaleString()} 艘星舰中，只有 17.6% 的舰长做出了和你一样的选择。`;
          } else if (currentScenario.id === 2) {
             statsMessage = chosenSide === "A" 
                ? `在目前启航的 ${totalShips.toLocaleString()} 艘星舰中，只有 35.8% 的舰长做出了和你一样的选择。` 
                : `在目前启航的 ${totalShips.toLocaleString()} 艘星舰中，只有 64.2% 的舰长做出了和你一样的选择。`;
          } else if (currentScenario.id === 3) {
             statsMessage = chosenSide === "A" 
                ? `在目前启航的 ${totalShips.toLocaleString()} 艘星舰中，只有 68.3% 的舰长做出了和你一样的选择。` 
                : `在目前启航的 ${totalShips.toLocaleString()} 艘星舰中，只有 31.7% 的舰长做出了和你一样的选择。`;
          } else if (currentScenario.id === 4) {
             statsMessage = chosenSide === "A" 
                ? `在目前启航的 ${totalShips.toLocaleString()} 艘星舰中，只有 41.5% 的舰长做出了和你一样的选择。` 
                : `在目前启航的 ${totalShips.toLocaleString()} 艘星舰中，只有 58.5% 的舰长做出了和你一样的选择。`;
          } else if (currentScenario.id === 5) {
             statsMessage = `你的隐秘档案已封存。在目前检测到的 ${totalShips.toLocaleString()} 个灵魂样本中，你的诉求具备 99.9% 的绝对独立特征。`;
          }

          return (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-brand-slate-950/70 backdrop-blur-md">
              <div className="max-w-md w-full flex flex-col gap-4">
                {/* 统计横幅 */}
                {statsMessage && (
                  <div className="bg-brand-slate-900/95 backdrop-blur-xl border border-brand-cyan-500/50 rounded-lg p-5 shadow-[0_0_30px_rgba(6,182,212,0.2)] animate-[fadeInDown_0.4s_ease-out]">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-[10px] px-2 py-0.5 rounded-sm bg-brand-cyan-950/50 text-brand-cyan-400 font-bold tracking-widest uppercase border border-brand-cyan-900/50">
                          [ 全网航行数据比对 ]
                       </span>
                    </div>
                    <p className="text-sm font-bold text-brand-cyan-300 leading-relaxed tracking-wider font-mono">
                      <TypewriterText text={statsMessage} speed={50} delay={100} />
                    </p>
                  </div>
                )}
                
                {/* 原Tip浮层 */}
                <div className="w-full bg-brand-slate-900/95 backdrop-blur-xl border border-brand-slate-800/60 rounded-lg p-6 shadow-2xl animate-[fadeInUp_0.5s_ease-out_0.2s_both]">
                  {tip ? (
                    <>
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
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-2 relative">
                      <div className="w-12 h-12 mb-4 border-2 border-brand-cyan-500/30 rounded-full border-t-brand-cyan-400 animate-spin" />
                      <p className="text-xs font-bold text-brand-cyan-400 mb-6 tracking-widest text-center animate-pulse">
                        [ 将您的选择坐标记录至主网 ]
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleNextFromTip}
                    className="w-full py-3 border border-brand-cyan-500/50 text-brand-cyan-400 text-xs font-bold tracking-widest uppercase hover:bg-brand-cyan-500/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all rounded-md"
                  >
                    {isLastQuestion
                      ? "[ → 查看你的蓝图 ]"
                      : `[ → 第 ${currentIndex + 2} 题 ]`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </main>
  );
}
