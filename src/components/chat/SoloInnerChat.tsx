"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AgentPayload } from "@/types/agent";
import { sanitizeHiddenNeed } from "@/lib/matchUtils";

interface ChatMessage {
  role: "superego" | "id";
  content: string;
}

const TOTAL_ROUNDS = 6;

interface SoloInnerChatProps {
  myPayload: AgentPayload;
  zhihuItems?: any[] | null;
}

export function SoloInnerChat({ myPayload, zhihuItems }: SoloInnerChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingRole, setTypingRole] = useState<"superego" | "id">("superego");
  const [displayedText, setDisplayedText] = useState("");
  const [phase, setPhase] = useState<"chatting" | "done">("chatting");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatAbortRef = useRef(false);
  const hasStartedChatRef = useRef(false);
  const superegoSessionIdRef = useRef<string | null>(null);
  const idSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: isTyping ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, displayedText, isTyping]);

  const generateMessage = useCallback(
    async (speakingRole: "superego" | "id", lastPartnerMessage: string): Promise<string> => {
      const isSuperego = speakingRole === "superego";
      const currentSessionId = isSuperego ? superegoSessionIdRef.current : idSessionIdRef.current;
      
      const safeHidden = sanitizeHiddenNeed(myPayload.hiddenNeed);
      
      const superegoPrompt = `你是主人的“超我/理性”。你的任务是保护主人，控制节奏。（主人当前防线 ${myPayload.defenseLevel}/100，喜欢节奏 ${myPayload.rhythmPerception}/100）。你的口吻像个保守、极其理智又毒舌的管家医生。你对“本能欲望”的冲动表示鄙视和拦阻。必须用极度大白话的口语聊天（比如用“你疯了吗”、“别搁这发情了”），绝不能文绉绉的！一切用最高级的医学防御术语来包装你的保守。`;
      
      const idPrompt = `你是主人的“本我/欲望”。你的核心动机是满足主人最原始的感官渴望。（温度偏好“${myPayload.tempPreference}”，隐秘诉求是“${safeHidden}”）。你的口吻是急躁、炽热、直球、充满诱惑力且有点疯批的。你对“理智”的保守嗤之以鼻，只想要痛快。必须用极度大白话的口语和你死对头吵架（比如“装什么清高”），绝不可文绉绉！用情绪化的高级抽象黑话去反驳。`;

      const systemPrompt = `这是一场深空精神分裂辩论。你的身份如下：
${isSuperego ? superegoPrompt : idPrompt}

重要规则：
1. 和另一个AI（${isSuperego ? "疯批本能" : "保守理智"}）像网上喷子一样吵架。
2. 结合参数设定去反驳，必须是大白话、网感极强的现代口语！禁止读诗或写散文！
3. 只说 1-2 句话，短平快！
4. 绝对不要加任何角色名或动作描写，只输出说话内容。`;

      let messageToSend = lastPartnerMessage;
      if (!messageToSend) {
        messageToSend = isSuperego 
          ? "（系统事件：内太空推演已启动。作为理智防线，请你首先开口，陈述你对目前主人参数的安全警戒诊断。）"
          : "（系统事件：理智防线在召唤你，你的欲望正在苏醒。请你率先开启话题。）";
      } else {
        messageToSend = `[对手的干预建议]: "${lastPartnerMessage}"\n(请作为 ${isSuperego ? '理性防御机制' : '本能欲望索取'}, 强烈且简练地反驳对方，捍卫你所管辖的参数维度。)`;
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
          return isSuperego ? "（理智中枢计算超载，防线暂时静默...）" : "（欲望引擎过热，正在重新校准...）";
        }

        const data = await res.json();
        if (data.sessionId) {
          if (isSuperego) superegoSessionIdRef.current = data.sessionId;
          else idSessionIdRef.current = data.sessionId;
        }

        return data.content;
      } catch (e) {
        return "（神经网络通讯拥堵...）";
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Removed myPayload to prevent re-render loops. The safe reference is handled since myPayload shouldn't change mid-chat.
  );

  const getRandomReasoningLog = useCallback((role: "superego" | "id") => {
    const logs = role === "superego"
      ? [
          "[超我体系正在评估交感神经负荷...]",
          "[理性防线正在重新筑建边界...]",
          "[系统尝试用冷处理镇压参数过载...]",
        ]
      : [
          "[本我正在解析隐秘驱动力...]",
          "[欲望引擎试图冲破边界阈值...]",
          "[底层的灼热感官正在上传新指令...]",
        ];
    return logs[Math.floor(Math.random() * logs.length)];
  }, []);

  const typewriterDisplay = useCallback(async (text: string, role: "superego" | "id"): Promise<void> => {
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
    if (hasStartedChatRef.current) return;
    hasStartedChatRef.current = true;
    setPhase("chatting");
    chatAbortRef.current = false;

    const chatHistory: ChatMessage[] = [];
    let lastMessageContent = "";

    for (let round = 0; round < TOTAL_ROUNDS; round++) {
      if (chatAbortRef.current) break;

      const speakingRole: "superego" | "id" = round % 2 === 0 ? "id" : "superego";
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
        const safeHidden = sanitizeHiddenNeed(myPayload.hiddenNeed);
        content = safeHidden 
          ? `喂，理智你到底在怕什么？明明这具身体对“${safeHidden}”渴望得要命。别装正经了，痛快点把控制权交给我不好吗？` 
          : `我已经能感觉到这具身体在发烫了。你就别拿那些破安全条例说事了，让我直接接管体验不行吗？`;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateMessage, typewriterDisplay]); // Removed myPayload from dependencies to prevent re-render loop

  // Start chat automatically when zhihu data is ready
  useEffect(() => {
    if (zhihuItems !== null) {
      chatAbortRef.current = false;
      hasStartedChatRef.current = false;
      startConversation();
    }
    
    return () => {
      chatAbortRef.current = true;
    };
  }, [zhihuItems, startConversation]);

  const isFullyUnlocked = phase === "done";
  const unlockProgress = isFullyUnlocked ? 100 : Math.min(88, Math.round((messages.length / TOTAL_ROUNDS) * 88));

  return (
    <div className="w-full flex-1 flex flex-col animate-[fadeIn_0.5s_ease-out] mt-6 mb-12">
      {/* 对话头部 */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-brand-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-brand-slate-500 font-bold uppercase tracking-widest">[ 单人精神推演沙盘 ]</span>
            <span className="text-sm font-bold tracking-widest text-white flex items-center gap-2">
              <span className="text-brand-rose-500">本能意志 (Id)</span>
              <span className="text-brand-slate-600">VS</span>
              <span className="text-sky-400">理性防线 (Superego)</span>
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-brand-slate-600 tracking-widest mb-1">
            精神统合进度: {unlockProgress}%
          </span>
          <div className="w-24 h-1 bg-brand-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-brand-indigo-500 transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${unlockProgress}%` }} />
          </div>
        </div>
      </div>

      {/* 对话消息列表 */}
      <div className="flex-1 space-y-5 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "id" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded-md px-4 py-3 text-sm leading-relaxed animate-[fadeIn_0.3s_ease-out] relative ${
                msg.role === "id"
                  ? "bg-brand-rose-950/20 border border-brand-rose-500/30 text-brand-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.15)] rounded-tl-none"
                  : "bg-sky-950/20 border border-sky-500/30 text-sky-100 shadow-[inset_0_0_20px_rgba(14,165,233,0.15)] rounded-tr-none"
              }`}
            >
              <span className={`text-[9px] font-bold tracking-wider block mb-2 opacity-70 uppercase ${msg.role === "id" ? "text-left text-brand-rose-400" : "text-right text-sky-400"}`}>
                {msg.role === "id" ? "[ 🩸 原始驱动池 - 本我 ]" : "[ 🛡️ 深度防备中枢 - 超我 ]"}
              </span>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {/* 正在打字的消息 */}
        {isTyping && (
          <div className={`flex ${typingRole === "id" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded-md px-4 py-3 text-sm leading-relaxed ${
                typingRole === "id"
                  ? "bg-brand-rose-950/10 border border-brand-rose-500/20 text-brand-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)] rounded-tl-none"
                  : "bg-sky-950/10 border border-sky-500/20 text-sky-500 shadow-[inset_0_0_20px_rgba(14,165,233,0.1)] rounded-tr-none"
              }`}
            >
              <span className={`text-[9px] font-bold tracking-wider block mb-1 opacity-50 uppercase ${typingRole === "id" ? "text-left" : "text-right"}`}>
                {typingRole === "id" ? "[ 本能生成中... ]" : "[ 理智计算中... ]"}
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

      {/* 对话结束 */}
      {phase === "done" && (
        <div className="mt-8 border-t border-brand-slate-800 pt-8 animate-[fadeIn_0.5s_ease-out]">
          <div className="bg-brand-indigo-950/30 border border-brand-indigo-500/50 overflow-hidden rounded-md p-6 relative shadow-[0_0_30px_rgba(99,102,241,0.1)]">
            <div className="absolute inset-0 bg-brand-indigo-400/5 animate-pulse mix-blend-screen pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <h3 className="text-lg text-brand-indigo-400 font-black tracking-widest uppercase mb-4 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                🌌 内在统合完毕：专享配置已锁定
              </h3>
              <p className="text-xs text-brand-slate-400 italic mb-6">
                “理智与欲望的博弈终于达成平衡。这套只属于你自己的蓝图参数，现在才是最诚实的呈现状态。”
              </p>
              
              <div className="text-[10px] text-brand-slate-500 uppercase tracking-widest mb-1.5">
                [ 蓝图参数最终确认：无需外界介质，安全执行。 ]
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
