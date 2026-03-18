"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAgentStore } from "@/store/useAgentStore";
import {
  generatePartnerParams,
  buildPersona,
  buildSystemPrompt,
  calculateCompatibility,
} from "@/lib/matchUtils";
import { AgentPayload, ProfileData, RecommendedUser } from "@/types/agent";

interface ChatMessage {
  role: "self" | "partner";
  content: string;
}

const TOTAL_ROUNDS = 6;

export default function MatchPage() {
  const router = useRouter();
  const getSerializedPayload = useAgentStore(
    (state) => state.getSerializedPayload,
  );
  const discoverUsers = useAgentStore((state) => state.discoverUsers);
  const bestMatchScore = useAgentStore((state) => state.bestMatchScore);
  const bestMatchUser = useAgentStore((state) => state.bestMatchUser);

  // 阶段：matching → reveal → selection → chatting → done
  const [phase, setPhase] = useState<
    "matching" | "reveal" | "selection" | "chatting" | "done"
  >("matching");
  const [matchProgress, setMatchProgress] = useState(0);
  const [partnerParams, setPartnerParams] = useState<AgentPayload | null>(null);
  const [alternatePartners, setAlternatePartners] = useState<RecommendedUser[]>(
    [],
  );
  const [compatibility, setCompatibility] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingRole, setTypingRole] = useState<"self" | "partner">("self");
  const [isTakingOver, setIsTakingOver] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatAbortRef = useRef(false);
  const hasStartedChatRef = useRef(false);
  const selfSessionIdRef = useRef<string | null>(null);
  const partnerSessionIdRef = useRef<string | null>(null);
  const hasInjectedZhihuRef = useRef(false);

  const myPayload = getSerializedPayload();

  // 背景星辰 (Moved to useEffect to avoid hydration error)
  const [stars, setStars] = useState<any[]>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: 50 }).map(() => ({
        id: Math.random(),
        size: Math.random() * 2 + 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
        dur: Math.random() * 5 + 3,
        delay: Math.random() * 3,
      })),
    );
  }, []);

  // 阶段一：自动初始化并强制进入自动聊天
  useEffect(() => {
    if (phase !== "matching") return;

    const interval = setInterval(() => {
      setMatchProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          const partner = generatePartnerParams(myPayload);

          if (bestMatchUser) {
            partner.recommendedPartner = bestMatchUser;
          }

          setPartnerParams(partner);
          setCompatibility(
            bestMatchScore || calculateCompatibility(myPayload, partner),
          );

          // 1秒后直接强制启动聊天流（跳过以前的 Reveal 和 Selection）
          setTimeout(() => {
            // 直接触发开始聊天，不再逗留
            const autoStart = document.getElementById("auto-start-trigger");
            if (autoStart) autoStart.click();
          }, 1000);

          return 100;
        }
        return p + Math.random() * 15 + 5;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [phase, bestMatchUser, bestMatchScore, myPayload]);

  // 自动滚动到最新消息
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: isTyping ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, displayedText, isTyping]);

  // 调用 AI 生成一条消息
  const generateMessage = useCallback(
    async (
      speakingRole: "self" | "partner",
      lastPartnerMessage: string,
    ): Promise<string> => {
      const selfPersona = buildPersona(myPayload, "self");
      const partnerPersona = buildPersona(partnerParams!, "partner");

      const isSelf = speakingRole === "self";
      const currentSessionId = isSelf
        ? selfSessionIdRef.current
        : partnerSessionIdRef.current;

      // 每次会话都必须带有性格设定，因为后端是无状态单次调用
      const systemPrompt = buildSystemPrompt(
        selfPersona,
        partnerPersona,
        speakingRole,
      );

      // ==========================
      // 知乎场景深度注入 (A2A Highlights)
      // 在第 3 轮，由“本机 Agent”自主搜索一个知乎话题并抛出
      // ==========================
      let injectedZhihuTopic = "";
      if (isSelf && messages.length >= 4 && !hasInjectedZhihuRef.current) {
        hasInjectedZhihuRef.current = true;
        try {
          // 根据宿主软肋或对方防备值动态生成搜索词
          const query = myPayload.hiddenNeed?.slice(0, 10) || "亲密关系 试探";
          const zRes = await fetch(
            `/api/zhihu/search?query=${encodeURIComponent(query)}&count=3`,
          );
          const zData = await zRes.json();
          if (zData?.data?.length > 0) {
            const item = zData.data[0];
            injectedZhihuTopic =
              item.target?.title || item.title || item.object?.title || "";
          }
        } catch (e) {
          console.error("Agent Zhihu Injection Failed:", e);
        }
      }

      // 我们喂给当前角色的 Prompt Message，是“另一个人刚才说的话”。
      // 如果没有上一句话，即开场白，给予角色明确的行动指示。
      let messageToSend = lastPartnerMessage;
      if (!messageToSend) {
        messageToSend = isSelf
          ? "（系统事件：深空舱门已开启，你们的心智频段已配对。请遵守你的人设，以一句符合你风格的话打破沉默，开启你们的会话。请直接输出你打算说的话，字数简练，不用加任何解析说明。）"
          : "（系统事件：对方进入了你的频段，但似乎在等待你的声音。请你率先开启话题。）";
      } else {
        messageToSend = `[对方刚才抛出的讯息]: "${lastPartnerMessage}"\n(请根据你的人设特点，简练回应。不要加上名字前缀，真实输出。)\n`;

        if (injectedZhihuTopic) {
          messageToSend += `\n【核心指令突发覆盖 / 本机 Agent 潜意识暴走】：你在引力网(知乎)上突然看到了一个热门话题叫做《${injectedZhihuTopic}》。现在，请你在回复对方的话语中，刻意且自然地引用或抛出这个知乎话题，试图用来试探对方对此的反应和底层价值观！必须提及！`;
        }
      }

      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: messageToSend,
            systemPrompt,
            sessionId: currentSessionId,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          console.error("Chat API error:", err);
          return isSelf
            ? "（本机感官神经元断开连接...）"
            : "（伴侣信号出现宇宙射线干扰...）";
        }

        const data = await res.json();

        // 存储对应角色新生成的 SessionId
        if (data.sessionId) {
          if (isSelf) selfSessionIdRef.current = data.sessionId;
          else partnerSessionIdRef.current = data.sessionId;
        }

        return data.content;
      } catch (e) {
        console.error("Fetch error:", e);
        return "（深空通讯暂时中断...）";
      }
    },
    [myPayload, partnerParams],
  );

  // Agent 推理日志库
  const getRandomReasoningLog = useCallback((role: "self" | "partner") => {
    const logs =
      role === "self"
        ? [
            "[Agent 正在调取宿主心智图谱...]",
            "[Agent 正在分析目标防御机制...]",
            "[Agent 试图寻找兴趣重载点...]",
            "[Agent 正在构建语义共振域...]",
          ]
        : [
            "[目标 Agent 识别到了你的试探...]",
            "[目标 Agent 正在比对行为模型...]",
            "[目标 Agent 正在重组表达神经元...]",
            "[目标 Agent 启动了同理心代偿...]",
          ];
    return logs[Math.floor(Math.random() * logs.length)];
  }, []);

  // 打字机效果
  const typewriterDisplay = useCallback(
    async (text: string, role: "self" | "partner"): Promise<void> => {
      setIsTyping(true);
      setTypingRole(role);
      setDisplayedText("");

      for (let i = 0; i < text.length; i++) {
        if (chatAbortRef.current) break;
        // Faster typing for Agents, since they're machines
        await new Promise((r) => setTimeout(r, 20 + Math.random() * 20));
        setDisplayedText(text.slice(0, i + 1));
      }

      // 略微停顿，让用户看清最后一刻打完的字
      await new Promise((r) => setTimeout(r, 400));
      setIsTyping(false);
      setDisplayedText("");
    },
    [],
  );

  // 阶段三：自动对话循环
  const startConversation = useCallback(async () => {
    if (!partnerParams || hasStartedChatRef.current) return;
    hasStartedChatRef.current = true;
    setPhase("chatting");
    chatAbortRef.current = false;

    const chatHistory: ChatMessage[] = [];

    let lastMessageContent = "";

    for (let round = 0; round < TOTAL_ROUNDS; round++) {
      if (chatAbortRef.current) break;

      const speakingRole: "self" | "partner" =
        round % 2 === 0 ? "self" : "partner";
      setCurrentRound(round + 1);

      // "开始生成"前的停顿 (推理等待期)
      setIsTyping(true);
      setTypingRole(speakingRole);
      setDisplayedText(""); // Clear text to show reasoning logs first
      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));

      if (chatAbortRef.current) break;

      // 调用 AI 请求 (如果是第一句话，强行写死以确保对话不跑偏)
      let content;
      if (round === 0) {
        content =
          "（建立连接中...）终于找到你的频段了。这片深空中太安静了，你...也一直在找同一个频率的人吗？";
      } else {
        content = await generateMessage(speakingRole, lastMessageContent);
      }

      if (chatAbortRef.current) break;

      // 保存这段话交给下一个人当作输入
      lastMessageContent = content;

      // 打字机显示真实文本 (覆盖掉正在推理的动画)
      await typewriterDisplay(content, speakingRole);

      if (chatAbortRef.current) break;

      // 打字结束后，立即将完整的消息推入数组，触发气泡渲染
      chatHistory.push({ role: speakingRole, content });
      setMessages([...chatHistory]);

      // 消息发完后自然等待几秒钟再进入下一轮，模拟真实吸收信息的时间
      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
    }

    setPhase("done");
  }, [partnerParams, generateMessage, typewriterDisplay]);

  // 离开时中止
  useEffect(() => {
    return () => {
      chatAbortRef.current = true;
    };
  }, []);

  // 动态解密进度
  const isFullyUnlocked = phase === "done";
  // 满进度（6轮对话完之前）最高显示到 88%
  const unlockProgress = isFullyUnlocked
    ? 100
    : Math.min(88, Math.round((messages.length / TOTAL_ROUNDS) * 88));
  const maskedPartnerName = partnerParams?.recommendedPartner?.username
    ? `UNKNOWN_ENTITY_#${partnerParams.recommendedPartner.username.slice(0, 4).toUpperCase()}`
    : "CLASSIFIED_ENTITY";

  return (
    <main className="min-h-screen bg-brand-slate-950 text-white font-mono relative overflow-hidden">
      {/* 深空背景 */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.06)_0%,transparent_70%)] mix-blend-screen" />
        {stars.map((p) => (
          <div
            key={p.id}
            className="absolute bg-white/20 rounded-full animate-pulse"
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

      <div className="relative z-10 max-w-md mx-auto px-4 py-6 min-h-screen flex flex-col">
        {/* 返回按钮 */}
        <button
          onClick={() => {
            chatAbortRef.current = true;
            router.back();
          }}
          className="text-brand-slate-400 hover:text-brand-cyan-500 flex items-center space-x-2 text-xs font-bold tracking-widest uppercase transition-colors mb-6"
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

        {/* ═══ 阶段一：配对动画 ═══ */}
        {phase === "matching" && (
          <div className="flex-1 flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease-out]">
            <div className="mb-8 relative">
              <div
                className="w-24 h-24 rounded-full border-2 border-brand-cyan-500/30 flex items-center justify-center animate-spin"
                style={{ animationDuration: "3s" }}
              >
                <div
                  className="w-16 h-16 rounded-full border border-brand-emerald-400/40 animate-spin"
                  style={{
                    animationDuration: "2s",
                    animationDirection: "reverse",
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-brand-cyan-500/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
              </div>
            </div>

            <h2 className="text-lg font-bold text-brand-cyan-400 tracking-widest uppercase mb-4 animate-pulse">
              正在深空频段搜索兼容灵魂...
            </h2>

            <div className="w-64 h-1.5 bg-brand-slate-800 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-brand-cyan-500 to-brand-emerald-400 rounded-full transition-all duration-200"
                style={{ width: `${Math.min(100, matchProgress)}%` }}
              />
            </div>
            <span className="text-[10px] text-brand-slate-500 tracking-widest">
              频段扫描: {Math.min(100, Math.round(matchProgress))}%
            </span>
          </div>
        )}

        {/* ═══ 阶段二：匹配揭晓 ═══ */}
        {phase === "reveal" && partnerParams && (
          <div className="flex-1 flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease-out]">
            <div className="mb-6 text-center">
              <span className="text-4xl mb-4 block animate-bounce">🎯</span>
              <h2 className="text-xl font-black text-white tracking-widest uppercase mb-2">
                信号锁定！
              </h2>
              <p className="text-brand-emerald-400 font-bold text-lg tracking-wide">
                灵魂契合度: <span className="text-2xl">{compatibility}%</span>
              </p>
            </div>

            {/* 参数对比 */}
            <div className="w-full max-w-sm bg-brand-slate-900/60 border border-brand-slate-800 rounded-lg p-5 mb-8 space-y-3">
              <h3 className="text-[10px] text-brand-slate-500 font-bold tracking-widest uppercase mb-3 text-center">
                参数对比
              </h3>
              {[
                {
                  label: "防线韧性",
                  self: `${myPayload.defenseLevel}/100`,
                  partner: `${partnerParams.defenseLevel}/100`,
                },
                {
                  label: "温度偏好",
                  self: myPayload.tempPreference,
                  partner: partnerParams.tempPreference,
                },
                {
                  label: "节奏感知",
                  self: `${myPayload.rhythmPerception}/100`,
                  partner: `${partnerParams.rhythmPerception}/100`,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-brand-cyan-400 w-16 font-bold">
                    🧑‍🚀 {row.self}
                  </span>
                  <span className="text-brand-slate-600 text-[10px] tracking-widest">
                    {row.label}
                  </span>
                  <span
                    className="text-brand-emerald-400 w-16 text-right font-bold truncate"
                    title={row.partner}
                  >
                    {row.partner} 👽
                  </span>
                </div>
              ))}
            </div>

            {partnerParams.recommendedPartner && (
              <div className="w-full max-w-sm bg-brand-cyan-900/20 border border-brand-cyan-800/40 rounded-lg p-3 mb-8 text-center text-xs">
                <span className="text-brand-cyan-400 tracking-widest block mb-1">
                  已捕获真实引力波
                </span>
                <span className="text-brand-slate-300">
                  身份签名：
                  {partnerParams.recommendedPartner.title ||
                    partnerParams.recommendedPartner.hook ||
                    "神秘旅行者"}
                </span>
              </div>
            )}

            <button
              onClick={startConversation}
              className="px-8 py-3 border border-brand-cyan-500/50 text-brand-cyan-400 text-sm font-bold tracking-widest uppercase hover:bg-brand-cyan-500/10 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all rounded-md animate-pulse"
            >
              [ 🎧 开始监听对话 ]
            </button>
          </div>
        )}

        {/* ═══ 阶段二.五：候补选择 (匹配失败) ═══ */}
        {phase === "selection" && (
          <div className="flex-1 flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease-out] w-full max-w-md mx-auto">
            <div className="mb-6 text-center">
              <span className="text-4xl mb-4 block animate-pulse">📡</span>
              <h2 className="text-xl font-black text-brand-rose-400 tracking-widest uppercase mb-2">
                信号微弱 · 频段错位
              </h2>
              <p className="text-brand-slate-400 text-sm tracking-wide">
                初次尝试未形成完美共振，契合度仅为{" "}
                <span className="text-white font-bold">{compatibility}%</span>
              </p>
              <p className="text-xs text-brand-cyan-500 mt-2">
                但系统捕获到了以下几组相似频率的求救信号，由您亲自决定连接对象：
              </p>
            </div>

            <div className="w-full space-y-4 mb-8">
              {alternatePartners.length > 0 ? (
                alternatePartners.map((user, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!partnerParams) return;
                      // 更新伴侣参数为选中的用户并进入 reveal 进行确认
                      const newPartner = {
                        ...partnerParams,
                        recommendedPartner: user,
                      };
                      setPartnerParams(newPartner);
                      // 假设手动选择的人加点感情分，直接设置一个稍微高一点或平均的契合度，或者重算
                      setCompatibility(
                        calculateCompatibility(myPayload, newPartner),
                      );
                      setPhase("reveal");
                    }}
                    className="w-full text-left bg-brand-slate-900/60 border border-brand-slate-700 hover:border-brand-emerald-400 hover:bg-brand-emerald-900/10 p-4 rounded-lg transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-brand-emerald-400 text-xs font-bold tracking-widest uppercase">
                        [ 发起连接 ]
                      </span>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <span className="font-bold text-white text-base">
                        👽 {user.username}
                      </span>
                      <span className="text-xs text-brand-cyan-400">
                        {user.title || "神秘探索者"}
                      </span>
                      {user.hook && (
                        <span className="text-[10px] text-brand-slate-400 italic bg-brand-slate-950/50 p-2 rounded block">
                          "{user.hook}"
                        </span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center text-sm text-brand-slate-500">
                  当前象限未发现其他活跃信号。
                  <br className="mb-4" />
                  <button
                    onClick={() => setPhase("reveal")}
                    className="px-6 py-2 mt-4 border border-brand-cyan-500/50 text-brand-cyan-400 text-xs font-bold tracking-widest uppercase hover:bg-brand-cyan-500/10 rounded-md"
                  >
                    [ 强行与最初目标进行连接 ]
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setPhase("matching");
                setMatchProgress(0);
                setPartnerParams(null);
              }}
              className="text-[10px] text-brand-slate-500 hover:text-white tracking-widest uppercase transition-colors"
            >
              [ 重新扫描全部频段 ]
            </button>
          </div>
        )}

        {/* ═══ 阶段三：AI 自动对话 ═══ */}
        {(phase === "chatting" || phase === "done") && (
          <div className="flex-1 flex flex-col animate-[fadeIn_0.3s_ease-out]">
            {/* 对话头部 */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xs text-brand-cyan-400">🧑‍🚀 本我</span>
                <span className="text-brand-slate-600">⚡</span>
                <span
                  className={`text-xs ${isFullyUnlocked ? "text-brand-emerald-400" : "text-brand-rose-500 animate-pulse"}`}
                >
                  👽{" "}
                  {isFullyUnlocked
                    ? partnerParams?.recommendedPartner?.username
                    : maskedPartnerName}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-brand-slate-600 tracking-widest mb-1">
                  神经波段同步率: {unlockProgress}%
                </span>
                <div className="w-24 h-1 bg-brand-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-rose-500 transition-all duration-500"
                    style={{ width: `${unlockProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 对话消息列表 */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-[300px] max-h-[55vh]">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "self" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-4 sm:px-5 py-3 text-sm sm:text-base leading-relaxed animate-[fadeIn_0.3s_ease-out] relative ${
                      msg.role === "self"
                        ? "bg-brand-cyan-950/40 border border-brand-cyan-500/30 text-brand-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.15)] rounded-tr-none"
                        : "bg-brand-slate-900/60 border border-brand-emerald-500/20 text-brand-slate-300 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] rounded-tl-none"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold tracking-wider block mb-2 opacity-70 uppercase ${msg.role === "self" ? "text-right text-brand-cyan-400" : "text-left text-brand-emerald-400"}`}
                    >
                      {msg.role === "self"
                        ? "[ 本机 Agent 代理 ]"
                        : "[ 目标 Agent 代理 ]"}
                    </span>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}

              {/* 正在打字的消息 */}
              {isTyping && (
                <div
                  className={`flex ${typingRole === "self" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                      typingRole === "self"
                        ? "bg-brand-cyan-950/20 border border-brand-cyan-500/30 text-brand-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.1)] rounded-tr-none"
                        : "bg-brand-slate-900/40 border border-brand-emerald-500/30 text-brand-emerald-500 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] rounded-tl-none"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold tracking-wider block mb-1 opacity-50 uppercase ${typingRole === "self" ? "text-right" : "text-left"}`}
                    >
                      {typingRole === "self"
                        ? "[ 本机 Agent 执行中 ]"
                        : "[ 目标 Agent 响应中 ]"}
                    </span>
                    {/* 如果正在打印文字就显示打字效果，否则显示推理日志 */}
                    {displayedText ? (
                      <>
                        {displayedText}
                        <span className="inline-block w-1.5 h-3 ml-1 bg-current animate-pulse align-middle" />
                      </>
                    ) : (
                      <div className="font-mono text-xs flex gap-1 items-center opacity-80 animate-pulse">
                        <span>{getRandomReasoningLog(typingRole)}</span>
                        <span className="w-1.5 h-3 bg-current block" />
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* 对话结束 - 终极身份解密 (H2H Handover) */}
            {phase === "done" && (
              <div className="mt-4 pt-6 border-t border-brand-slate-800 text-center space-y-6 animate-[fadeIn_0.5s_ease-out]">
                <div
                  className={`transition-all duration-700 ${isTakingOver ? "scale-105" : "scale-100"}`}
                >
                  <div
                    className={`bg-brand-slate-900/80 border overflow-hidden rounded-lg p-6 relative shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-colors duration-700
                    ${isTakingOver ? "border-brand-emerald-400 bg-brand-emerald-950/40" : "border-brand-emerald-500/50"}
                  `}
                  >
                    <div className="absolute inset-0 bg-brand-emerald-400/5 animate-pulse mix-blend-screen pointer-events-none" />
                    <div className="relative z-10">
                      <h3 className="text-lg md:text-xl text-brand-emerald-400 font-black tracking-widest uppercase mb-4 animate-[fadeInTop_0.5s_ease-out]">
                        {isTakingOver
                          ? "🟢 真人直连通道已建立"
                          : "🔒 Agent 观测完毕：档案完全解锁"}
                      </h3>

                    {partnerParams?.recommendedPartner ? (
                      <div className="text-left bg-brand-slate-950/50 p-4 rounded-md border border-brand-slate-700">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-16 h-16 rounded-full bg-brand-slate-800 border-2 border-brand-emerald-400 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                            👽
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-white mb-1">
                              {partnerParams.recommendedPartner.username}
                            </h4>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-brand-cyan-400">
                                {partnerParams.recommendedPartner.title ||
                                  "神秘领航员"}
                              </p>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-emerald-900/50 text-brand-emerald-400 border border-brand-emerald-500/30">
                                灵魂契合度: {compatibility}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 mt-4">
                          {partnerParams.recommendedPartner.hook && (
                            <div className="text-sm text-brand-slate-300 italic border-l-2 border-brand-emerald-500/50 pl-3">
                              "{partnerParams.recommendedPartner.hook}"
                            </div>
                          )}
                          <p className="text-xs text-brand-slate-400 leading-relaxed">
                            {partnerParams.recommendedPartner
                              .briefIntroduction ||
                              "两级 Agent 的观测报告指出，你们的底层神经元展现出了惊人的共振频率。"}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-brand-slate-800 flex flex-col items-center gap-4">
                          {!isTakingOver ? (
                            <>
                              <p className="text-[10px] text-brand-slate-500 italic">
                                "Agent 代理已退下，前方为真实星域..."
                              </p>
                              <button
                                onClick={() => setIsTakingOver(true)}
                                className="w-full sm:w-auto px-8 py-3 bg-brand-emerald-600/10 border-2 border-brand-emerald-500 text-brand-emerald-400 text-sm font-black tracking-widest uppercase hover:bg-brand-emerald-500 hover:text-brand-slate-950 transition-all rounded-md shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-pulse hover:animate-none"
                              >
                                [ 接管通讯 / 建立真人直连 ]
                              </button>
                            </>
                          ) : (
                            <div className="w-full flex flex-col items-center gap-4 animate-[fadeIn_0.5s_ease-out]">
                              <div className="flex items-center gap-3 text-brand-emerald-400 mb-2">
                                <span className="w-2 h-2 rounded-full bg-brand-emerald-400 animate-ping" />
                                <span className="text-xs font-bold tracking-widest uppercase">
                                  已成功接管频段
                                </span>
                              </div>
                              <a
                                href={`https://app.secondme.me/${partnerParams.recommendedPartner.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto relative z-20 cursor-pointer inline-block text-center px-8 py-3 bg-brand-emerald-500 border-2 border-brand-emerald-500 text-white text-sm font-black tracking-widest uppercase hover:bg-brand-emerald-400 hover:text-brand-slate-950 transition-all rounded-md shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                              >
                                [ 🚀 登陆 Ta 的真实主页 ]
                              </a>
                              <p className="text-[10px] text-brand-slate-500 mt-2">
                                提示：您现在可以代表本我，与 Ta
                                展开真实的人类对话。
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-center mt-6">
                  <button
                    onClick={() => {
                      setPhase("matching");
                      setMessages([]);
                      setCurrentRound(0);
                      setMatchProgress(0);
                      setPartnerParams(null);
                      selfSessionIdRef.current = null;
                      partnerSessionIdRef.current = null;
                      hasInjectedZhihuRef.current = false;
                      hasStartedChatRef.current = false;
                    }}
                    className="px-6 py-2.5 border border-brand-emerald-500/50 text-brand-emerald-400 text-xs font-bold tracking-widest uppercase hover:bg-brand-emerald-500/10 transition-all rounded-md"
                  >
                    [ 🎰 再配一次 ]
                  </button>
                  {/* The auto-start-trigger was moved outside conditional rendering */}
                  <div className="hidden"></div>
                  <button
                    onClick={() => router.push("/")}
                    className="px-6 py-2.5 border border-brand-cyan-500/50 text-brand-cyan-400 text-xs font-bold tracking-widest uppercase hover:bg-brand-cyan-500/10 transition-all rounded-md"
                  >
                    [ 返回首页 ]
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 隐藏辅助触发按钮，用于自动跳过阶段 (Moved here to ensure it is always in the DOM) */}
      <button
        id="auto-start-trigger"
        onClick={startConversation}
        className="hidden"
      />
    </main>
  );
}
