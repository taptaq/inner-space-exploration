"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { generatePartnerParams, buildPersona, buildSystemPrompt, calculateCompatibility } from "@/lib/matchUtils";
import { AgentPayload, RecommendedUser } from "@/types/agent";

interface ChatMessage {
  role: "self" | "partner";
  content: string;
}

const TOTAL_ROUNDS = 6;

interface BlueprintChatProps {
  myPayload: AgentPayload;
  bestMatchUser: RecommendedUser | null;
}

export function BlueprintChat({ myPayload, bestMatchUser }: BlueprintChatProps) {
  const [partnerParams, setPartnerParams] = useState<AgentPayload | null>(null);
  const [compatibility, setCompatibility] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingRole, setTypingRole] = useState<"self" | "partner">("self");
  const [displayedText, setDisplayedText] = useState("");
  const [phase, setPhase] = useState<"chatting" | "done">("chatting");
  const [isTakingOver, setIsTakingOver] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatAbortRef = useRef(false);
  const hasStartedChatRef = useRef(false);
  const selfSessionIdRef = useRef<string | null>(null);
  const partnerSessionIdRef = useRef<string | null>(null);
  const hasInjectedZhihuRef = useRef(false);

  useEffect(() => {
    // Initialize partnerParams
    const partner = generatePartnerParams(myPayload);
    if (bestMatchUser) {
      partner.recommendedPartner = bestMatchUser;
    }
    setPartnerParams(partner);
    setCompatibility(calculateCompatibility(myPayload, partner));
  }, [myPayload, bestMatchUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: isTyping ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, displayedText, isTyping]);

  const generateMessage = useCallback(
    async (speakingRole: "self" | "partner", lastPartnerMessage: string): Promise<string> => {
      if (!partnerParams) return "";
      const selfPersona = buildPersona(myPayload, "self");
      const partnerPersona = buildPersona(partnerParams, "partner");

      const isSelf = speakingRole === "self";
      const currentSessionId = isSelf ? selfSessionIdRef.current : partnerSessionIdRef.current;
      const systemPrompt = buildSystemPrompt(selfPersona, partnerPersona, speakingRole);

      let injectedZhihuTopic = "";
      if (isSelf && messages.length >= 4 && !hasInjectedZhihuRef.current) {
        hasInjectedZhihuRef.current = true;
        try {
          const query = myPayload.hiddenNeed?.slice(0, 10) || "亲密关系 试探";
          const zRes = await fetch(`/api/zhihu/search?query=${encodeURIComponent(query)}&count=3`);
          const zData = await zRes.json();
          if (zData?.data?.length > 0) {
            const item = zData.data[0];
            injectedZhihuTopic = item.target?.title || item.title || item.object?.title || "";
          }
        } catch (e) {
          console.error("Agent Zhihu Injection Failed:", e);
        }
      }

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
          return isSelf ? "（本机感官神经元断开连接...）" : "（伴侣信号出现宇宙射线干扰...）";
        }

        const data = await res.json();
        if (data.sessionId) {
          if (isSelf) selfSessionIdRef.current = data.sessionId;
          else partnerSessionIdRef.current = data.sessionId;
        }

        return data.content;
      } catch (e) {
        return "（深空通讯暂时中断...）";
      }
    },
    [myPayload, partnerParams, messages.length]
  );

  const getRandomReasoningLog = useCallback((role: "self" | "partner") => {
    const logs = role === "self"
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

  const typewriterDisplay = useCallback(async (text: string, role: "self" | "partner"): Promise<void> => {
    setIsTyping(true);
    setTypingRole(role);
    setDisplayedText("");

    for (let i = 0; i < text.length; i++) {
      if (chatAbortRef.current) break;
      await new Promise((r) => setTimeout(r, 20 + Math.random() * 20));
      setDisplayedText(text.slice(0, i + 1));
    }

    await new Promise((r) => setTimeout(r, 400));
    setIsTyping(false);
    setDisplayedText("");
  }, []);

  const startConversation = useCallback(async () => {
    if (!partnerParams || hasStartedChatRef.current) return;
    hasStartedChatRef.current = true;
    setPhase("chatting");
    chatAbortRef.current = false;

    const chatHistory: ChatMessage[] = [];
    let lastMessageContent = "";

    for (let round = 0; round < TOTAL_ROUNDS; round++) {
      if (chatAbortRef.current) break;

      const speakingRole: "self" | "partner" = round % 2 === 0 ? "self" : "partner";
      setCurrentRound(round + 1);

      setIsTyping(true);
      setTypingRole(speakingRole);
      setDisplayedText(""); 
      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));

      if (chatAbortRef.current) {
        setIsTyping(false);
        break;
      }

      let content;
      if (round === 0) {
        content = "（建立连接中...）终于找到你的频段了。这片深空中太安静了，你...也一直在找同一个频率的人吗？";
      } else {
        content = await generateMessage(speakingRole, lastMessageContent);
      }

      if (chatAbortRef.current) break;

      lastMessageContent = content;
      await typewriterDisplay(content, speakingRole);

      if (chatAbortRef.current) break;

      chatHistory.push({ role: speakingRole, content });
      setMessages([...chatHistory]);

      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
    }

    setPhase("done");
  }, [partnerParams, generateMessage, typewriterDisplay]);

  // Start chat automatically when partnerParams are ready
  useEffect(() => {
    if (partnerParams) {
      chatAbortRef.current = false;
      hasStartedChatRef.current = false;
      startConversation();
    }
    return () => {
      chatAbortRef.current = true;
    };
  }, [partnerParams, startConversation]);

  const isFullyUnlocked = phase === "done";
  const unlockProgress = isFullyUnlocked ? 100 : Math.min(88, Math.round((messages.length / TOTAL_ROUNDS) * 88));
  const maskedPartnerName = bestMatchUser ? `UNKNOWN_ENTITY_#${bestMatchUser.username.slice(0, 4).toUpperCase()}` : "CLASSIFIED_ENTITY";

  if (!partnerParams) return null;

  return (
    <div className="w-full flex-1 flex flex-col animate-[fadeIn_0.5s_ease-out] mt-12 mb-12">
      {/* 对话头部 */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-xs text-brand-cyan-400 font-bold uppercase tracking-widest">[ 本机 Agent 测线 ]</span>
          <span className="text-brand-slate-600 animate-pulse">⚡</span>
          <span className={`text-xs font-bold uppercase tracking-widest ${isFullyUnlocked ? "text-brand-emerald-400" : "text-brand-rose-500 animate-pulse"}`}>
            [ {isFullyUnlocked ? bestMatchUser?.username || "异星灵魂" : maskedPartnerName} ]
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-brand-slate-600 tracking-widest mb-1">
            灵魂解码进度: {unlockProgress}%
          </span>
          <div className="w-24 h-1 bg-brand-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-brand-rose-500 transition-all duration-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" style={{ width: `${unlockProgress}%` }} />
          </div>
        </div>
      </div>

      {/* 对话消息列表 */}
      <div className="flex-1 space-y-4 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "self" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-md px-4 py-3 text-sm leading-relaxed animate-[fadeIn_0.3s_ease-out] relative ${
                msg.role === "self"
                  ? "bg-brand-cyan-950/40 border border-brand-cyan-500/30 text-brand-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.15)] rounded-tr-none"
                  : "bg-brand-slate-900/60 border border-brand-emerald-500/20 text-brand-slate-300 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] rounded-tl-none"
              }`}
            >
              <span className={`text-[9px] font-bold tracking-wider block mb-2 opacity-70 uppercase ${msg.role === "self" ? "text-right text-brand-cyan-400" : "text-left text-brand-emerald-400"}`}>
                {msg.role === "self" ? "[ 本机镜像 ]" : "[ 访客镜像 ]"}
              </span>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {/* 正在打字的消息 */}
        {isTyping && (
          <div className={`flex ${typingRole === "self" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded-md px-4 py-3 text-sm leading-relaxed ${
                typingRole === "self"
                  ? "bg-brand-cyan-950/20 border border-brand-cyan-500/30 text-brand-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.1)] rounded-tr-none"
                  : "bg-brand-slate-900/40 border border-brand-emerald-500/30 text-brand-emerald-500 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] rounded-tl-none"
              }`}
            >
              <span className={`text-[9px] font-bold tracking-wider block mb-1 opacity-50 uppercase ${typingRole === "self" ? "text-right" : "text-left"}`}>
                {typingRole === "self" ? "[ 本机执行算力 ]" : "[ 访客响应算力 ]"}
              </span>
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
      {phase === "done" && bestMatchUser && (
        <div className="mt-8 border-t border-brand-slate-800 pt-8 animate-[fadeIn_0.5s_ease-out]">
          <div className={`bg-brand-slate-900/80 border overflow-hidden rounded-md p-6 relative shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-colors duration-700
              ${isTakingOver ? "border-brand-emerald-400 bg-brand-emerald-950/40" : "border-brand-emerald-500/50"}
            `}
          >
            <div className="absolute inset-0 bg-brand-emerald-400/5 animate-pulse mix-blend-screen pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center">
              <h3 className="text-lg text-brand-emerald-400 font-black tracking-widest uppercase mb-6 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                {isTakingOver ? "🟢 物理通讯直连成功" : "🔒 Agent 共鸣完成：对方资料已解锁"}
              </h3>

              <div className="w-full bg-brand-slate-950/50 p-4 rounded border border-brand-slate-700 mb-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded bg-brand-slate-800 border border-brand-emerald-400 flex items-center justify-center text-xl shrink-0">
                  👽
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-white mb-1">
                    {bestMatchUser.username}
                  </h4>
                  <p className="text-[10px] text-brand-cyan-400 tracking-widest uppercase mb-1">
                    {bestMatchUser.title || "深空旅行者"}
                  </p>
                  <p className="text-xs text-brand-slate-400 italic">
                    {bestMatchUser.hook || "期待与你在深空相遇。"}
                  </p>
                </div>
              </div>

              {!isTakingOver ? (
                <>
                  <p className="text-[10px] text-brand-slate-500 italic mb-4 text-center">
                    两只 Agent 的互相试探已结束，现在由您亲自登舰接管...
                  </p>
                  <button
                    onClick={() => setIsTakingOver(true)}
                    className="w-full relative px-8 py-3 bg-brand-emerald-600/10 border border-brand-emerald-500 text-brand-emerald-400 text-sm font-black tracking-widest uppercase hover:bg-brand-emerald-500 hover:text-brand-slate-950 transition-all rounded shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-pulse hover:animate-none"
                  >
                    [ 剥离虚拟连接 / 开启物理对讲 ]
                  </button>
                </>
              ) : (
                <div className="w-full flex flex-col items-center animate-[fadeIn_0.5s_ease-out]">
                  <a
                    href={`https://app.secondme.me/${bestMatchUser.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center px-8 py-4 bg-brand-emerald-500 text-white text-sm font-black tracking-[0.2em] uppercase hover:bg-brand-emerald-400 hover:text-brand-slate-900 transition-all rounded shadow-[0_0_30px_rgba(16,185,129,0.5)] glow-effect-intense"
                  >
                    [ 🛸 破仓汇合：登陆 Ta 的 SecondMe 基地 ]
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
