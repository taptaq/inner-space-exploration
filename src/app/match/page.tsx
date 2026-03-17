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
import { MedicalDictionary } from "@/components/knowledge/MedicalDictionary";

interface ChatMessage {
  role: "self" | "partner";
  content: string;
}

const TOTAL_ROUNDS = 8;

export default function MatchPage() {
  const router = useRouter();
  const getSerializedPayload = useAgentStore((state) => state.getSerializedPayload);
  const discoverUsers = useAgentStore((state) => state.discoverUsers);
  const bestMatchScore = useAgentStore((state) => state.bestMatchScore);
  const bestMatchUser = useAgentStore((state) => state.bestMatchUser);

  // 阶段：matching → reveal → selection → chatting → done
  const [phase, setPhase] = useState<
    "matching" | "reveal" | "selection" | "chatting" | "done"
  >("matching");
  const [matchProgress, setMatchProgress] = useState(0);
  const [partnerParams, setPartnerParams] = useState<AgentPayload | null>(null);
  const [alternatePartners, setAlternatePartners] = useState<RecommendedUser[]>([]);
  const [compatibility, setCompatibility] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingRole, setTypingRole] = useState<"self" | "partner">("self");
  const [displayedText, setDisplayedText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatAbortRef = useRef(false);
  const selfSessionIdRef = useRef<string | null>(null);
  const partnerSessionIdRef = useRef<string | null>(null);

  const myPayload = getSerializedPayload();

  // 背景星辰
  const stars = useMemo(
    () =>
      Array.from({ length: 50 }).map(() => ({
        id: Math.random(),
        size: Math.random() * 2 + 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
        dur: Math.random() * 5 + 3,
        delay: Math.random() * 3,
      })),
    [],
  );



  // 阶段一：配对动画
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
          setCompatibility(bestMatchScore || calculateCompatibility(myPayload, partner));
          
          setTimeout(() => {
            if ((bestMatchScore || 0) >= 85) {
              setPhase("reveal");
            } else {
              // 为用户筛选最多 3 位其他的备选人
              const alternates = (discoverUsers || [])
                .filter(u => u.username !== bestMatchUser?.username)
                .slice(0, 3);
              setAlternatePartners(alternates);
              setPhase("selection");
            }
          }, 300);
          return 100;
        }
        return p + Math.random() * 8 + 2;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [phase]);

  // 自动滚动到最新消息
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, displayedText]);

  // 调用 AI 生成一条消息
  const generateMessage = useCallback(
    async (
      speakingRole: "self" | "partner",
      lastPartnerMessage: string
    ): Promise<string> => {
      const selfPersona = buildPersona(myPayload, "self");
      const partnerPersona = buildPersona(partnerParams!, "partner");
      
      const isSelf = speakingRole === "self";
      const currentSessionId = isSelf ? selfSessionIdRef.current : partnerSessionIdRef.current;
      
      // 首次会话分配性格设定
      let systemPrompt;
      if (!currentSessionId) {
        systemPrompt = buildSystemPrompt(selfPersona, partnerPersona, speakingRole);
      }

      // 我们喂给当前角色的 Prompt Message，是“另一个人刚才说的话”。
      // 如果没有上一句话，即开场白，给予角色明确的行动指示。
      let messageToSend = lastPartnerMessage;
      if (!messageToSend) {
        messageToSend = isSelf
          ? "（系统事件：深空舱门已开启，你们的心智频段已配对。请遵守你的人设，以一句符合你风格的话打破沉默，开启你们的会话。请直接输出你打算说的话，字数简练，不用加任何解析说明。）"
          : "（系统事件：对方进入了你的频段，但似乎在等待你的声音。请你率先开启话题。）";
      } else {
        messageToSend = `[对方刚才抛出的讯息]: "${lastPartnerMessage}"\n(请根据你的人设特点，简练回应。不要加上名字前缀，像真实聊天一样输出你的回话即可。)`;
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

  // 打字机效果
  const typewriterDisplay = useCallback(
    async (text: string, role: "self" | "partner"): Promise<void> => {
      setIsTyping(true);
      setTypingRole(role);
      setDisplayedText("");

      for (let i = 0; i < text.length; i++) {
        if (chatAbortRef.current) break;
        await new Promise((r) => setTimeout(r, 40 + Math.random() * 30));
        setDisplayedText(text.slice(0, i + 1));
      }

      setIsTyping(false);
      setDisplayedText("");
    },
    [],
  );

  // 阶段三：自动对话循环
  const startConversation = useCallback(async () => {
    if (!partnerParams) return;
    setPhase("chatting");
    chatAbortRef.current = false;

    const chatHistory: ChatMessage[] = [];

    let lastMessageContent = "";

    for (let round = 0; round < TOTAL_ROUNDS; round++) {
      if (chatAbortRef.current) break;

      const speakingRole: "self" | "partner" =
        round % 2 === 0 ? "self" : "partner";
      setCurrentRound(round + 1);

      // "正在输入" 停顿
      setIsTyping(true);
      setTypingRole(speakingRole);
      setDisplayedText("");
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));

      if (chatAbortRef.current) break;

      // 调用 AI
      const content = await generateMessage(speakingRole, lastMessageContent);

      if (chatAbortRef.current) break;

      // 保存这段话交给下一个人当作发送消息
      lastMessageContent = content;

      // 打字机显示
      await typewriterDisplay(content, speakingRole);

      if (chatAbortRef.current) break;

      // 添加到历史
      const newMsg: ChatMessage = { role: speakingRole, content };
      chatHistory.push(newMsg);
      setMessages([...chatHistory]);

      // 间隔停顿
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
    }

    setPhase("done");
  }, [partnerParams, generateMessage, typewriterDisplay]);

  // 离开时中止
  useEffect(() => {
    return () => {
      chatAbortRef.current = true;
    };
  }, []);

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

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 min-h-screen flex flex-col">
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
              <div className="w-24 h-24 rounded-full border-2 border-brand-cyan-500/30 flex items-center justify-center animate-spin" style={{ animationDuration: "3s" }}>
                <div className="w-16 h-16 rounded-full border border-brand-emerald-400/40 animate-spin" style={{ animationDuration: "2s", animationDirection: "reverse" }}>
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
                灵魂契合度:{" "}
                <span className="text-2xl">{compatibility}%</span>
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
                  <span className="text-brand-emerald-400 w-16 text-right font-bold truncate" title={row.partner}>
                    {row.partner} 👽
                  </span>
                </div>
              ))}
            </div>

            {partnerParams.recommendedPartner && (
              <div className="w-full max-w-sm bg-brand-cyan-900/20 border border-brand-cyan-800/40 rounded-lg p-3 mb-8 text-center text-xs">
                <span className="text-brand-cyan-400 tracking-widest block mb-1">已捕获真实引力波</span>
                <span className="text-brand-slate-300">身份签名：{partnerParams.recommendedPartner.title || partnerParams.recommendedPartner.hook || "神秘旅行者"}</span>
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
          <div className="flex-1 flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease-out] w-full max-w-2xl mx-auto">
            <div className="mb-6 text-center">
              <span className="text-4xl mb-4 block animate-pulse">📡</span>
              <h2 className="text-xl font-black text-brand-rose-400 tracking-widest uppercase mb-2">
                信号微弱 · 频段错位
              </h2>
              <p className="text-brand-slate-400 text-sm tracking-wide">
                初次尝试未形成完美共振，契合度仅为 <span className="text-white font-bold">{compatibility}%</span>
              </p>
              <p className="text-xs text-brand-cyan-500 mt-2">
                但系统捕获到了以下几组相似频率的求救信号，由您亲自决定连接对象：
              </p>
            </div>

            <div className="w-full space-y-4 mb-8">
              {alternatePartners.length > 0 ? alternatePartners.map((user, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (!partnerParams) return;
                    // 更新伴侣参数为选中的用户并进入 reveal 进行确认
                    const newPartner = { ...partnerParams, recommendedPartner: user };
                    setPartnerParams(newPartner);
                    // 假设手动选择的人加点感情分，直接设置一个稍微高一点或平均的契合度，或者重算
                    setCompatibility(calculateCompatibility(myPayload, newPartner));
                    setPhase("reveal");
                  }}
                  className="w-full text-left bg-brand-slate-900/60 border border-brand-slate-700 hover:border-brand-emerald-400 hover:bg-brand-emerald-900/10 p-4 rounded-lg transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-brand-emerald-400 text-xs font-bold tracking-widest uppercase">[ 发起连接 ]</span>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <span className="font-bold text-white text-base">👽 {user.username}</span>
                    <span className="text-xs text-brand-cyan-400">{user.title || "神秘探索者"}</span>
                    {user.hook && (
                      <span className="text-[10px] text-brand-slate-400 italic bg-brand-slate-950/50 p-2 rounded block">
                        "{user.hook}"
                      </span>
                    )}
                  </div>
                </button>
              )) : (
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
                <span className="text-xs text-brand-emerald-400">
                  👽 异星灵魂
                </span>
              </div>
              <span className="text-[10px] text-brand-slate-600 tracking-widest">
                {phase === "done"
                  ? `对话结束 · ${messages.length} 轮`
                  : `对话中 · ${currentRound}/${TOTAL_ROUNDS}`}
              </span>
            </div>

            {/* 对话消息列表 */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-[300px] max-h-[55vh]">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "self" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-3 text-sm leading-relaxed animate-[fadeIn_0.3s_ease-out] ${
                      msg.role === "self"
                        ? "bg-brand-cyan-950/40 border border-brand-cyan-800/30 text-brand-slate-300"
                        : "bg-brand-emerald-950/40 border border-brand-emerald-800/30 text-brand-slate-300"
                    }`}
                  >
                    <span className="text-[10px] font-bold tracking-wider block mb-1 opacity-50">
                      {msg.role === "self" ? "🧑‍🚀 本我" : `👽 ${partnerParams?.recommendedPartner?.username || "异星灵魂"}`}
                    </span>
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* 正在打字的消息 */}
              {isTyping && (
                <div
                  className={`flex ${typingRole === "self" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                      typingRole === "self"
                        ? "bg-brand-cyan-950/40 border border-brand-cyan-800/30 text-brand-slate-300"
                        : "bg-brand-emerald-950/40 border border-brand-emerald-800/30 text-brand-slate-300"
                    }`}
                  >
                    <span className="text-[10px] font-bold tracking-wider block mb-1 opacity-50">
                      {typingRole === "self" ? "🧑‍🚀 本我" : `👽 ${partnerParams?.recommendedPartner?.username || "异星灵魂"}`}
                    </span>
                    {displayedText || (
                      <span className="animate-pulse text-brand-slate-500">
                        正在输入...
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* 对话结束 */}
            {phase === "done" && (
              <div className="mt-4 pt-4 border-t border-brand-slate-800 text-center space-y-4 animate-[fadeIn_0.5s_ease-out]">
                <div className="bg-brand-slate-900/60 border border-brand-slate-700 rounded-lg p-5">
                  <p className="text-xs text-brand-slate-400 mb-2">
                    ✨ 深空对话实验结束
                  </p>
                  <p className="text-sm text-white font-bold">
                    灵魂契合度: {compatibility}% · 共 {messages.length} 轮对话
                  </p>
                  <p className="text-xs text-brand-slate-500 mt-2">
                    这段对话揭示了你们之间微妙的化学反应。
                    <br />
                    也许在茫茫宇宙中，真的有一个频率和你共振的灵魂。
                  </p>
                </div>
                
                <div className="mt-4 text-left">
                  <MedicalDictionary
                    defenseLevel={myPayload.defenseLevel}
                    tempPreference={myPayload.tempPreference}
                    rhythmPerception={myPayload.rhythmPerception}
                  />
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
                    }}
                    className="px-6 py-2.5 border border-brand-emerald-500/50 text-brand-emerald-400 text-xs font-bold tracking-widest uppercase hover:bg-brand-emerald-500/10 transition-all rounded-md"
                  >
                    [ 🎰 再配一次 ]
                  </button>
                  {partnerParams?.recommendedPartner?.route ? (
                    <a
                      href={`https://second-me.cn/${partnerParams.recommendedPartner.route}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-2.5 bg-brand-cyan-500/20 border border-brand-cyan-500/50 text-brand-cyan-400 text-xs font-bold tracking-widest uppercase hover:bg-brand-cyan-500/40 transition-all rounded-md flex items-center gap-2"
                    >
                      [ 去 Ta 的主页逛逛 ]
                    </a>
                  ) : (
                    <button
                      onClick={() => router.push("/")}
                      className="px-6 py-2.5 border border-brand-cyan-500/50 text-brand-cyan-400 text-xs font-bold tracking-widest uppercase hover:bg-brand-cyan-500/10 transition-all rounded-md"
                    >
                      [ 返回首页 ]
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
