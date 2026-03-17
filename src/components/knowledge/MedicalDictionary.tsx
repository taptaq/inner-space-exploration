"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KnowledgeCard } from "@/data/medicalKnowledge";

export interface MedicalDictionaryProps {
  defenseLevel: number;
  tempPreference: string;
  rhythmPerception: number;
  hiddenNeed?: string;
  profileData?: any;
  className?: string; // 允许外部传入 className 控制样式
}

export function MedicalDictionary({
  defenseLevel,
  tempPreference,
  rhythmPerception,
  hiddenNeed,
  profileData,
  className = "",
}: MedicalDictionaryProps) {
  const router = useRouter();
  const [tips, setTips] = useState<KnowledgeCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchKnowledge() {
      try {
        const res = await fetch("/api/knowledge/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            defenseLevel,
            tempPreference,
            rhythmPerception,
            hiddenNeed,
            profileData,
          }),
        });
        if (!res.ok) {
           const errText = await res.text();
           throw new Error(errText || "Failed to generate dynamic knowledge from AI");
        }
        
        const generatedCards: KnowledgeCard[] = await res.json();
        setTips(generatedCards);
      } catch (error: any) {
        console.error("Fetch knowledge error:", error);
        setErrorMsg(error.message || String(error));
        // Fallback to empty or a minimal default tip if it fails completely
        setTips([{
          id: "err-1",
          cardId: "err-1",
          category: "safety",
          icon: "⚠️",
          title: "深空信号微弱",
          summary: "当前星区遭受量子风暴干扰，无法下载您的专属医典。",
          detail: "当面对不确定性时，保持镇定是领航员的第一准则。请稍后再试。",
          source: "星舰系统自我诊断",
          tags: ["连接失败", "系统重试"]
        } as KnowledgeCard]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchKnowledge();
  }, [defenseLevel, tempPreference, rhythmPerception, hiddenNeed, profileData]);

  return (
    <section
      className={`bg-brand-slate-900/40 border border-brand-cyan-900/30 rounded-sm p-4 sm:p-6 relative ${className}`}
    >
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-emerald-400 rounded-tl-sm" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand-emerald-400 rounded-tr-sm" />

      <h2 className="text-sm text-brand-emerald-400 font-bold mb-4 tracking-widest uppercase border-b border-brand-slate-800 pb-2 flex items-center gap-2">
        🔬 [ 深空医典：为你定制的科普档案 ]
        {isLoading && (
          <span className="ml-2 text-[10px] animate-pulse text-brand-slate-500">
            Generating Personal AI Medical Dictionary...
          </span>
        )}
      </h2>

      {/* {errorMsg && (
        <div className="text-red-500 text-xs mb-4 p-2 border border-red-500/30 bg-red-500/10">
          Database Error: {errorMsg}
        </div>
      )} */}

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="border-l-2 border-brand-slate-700/50 pl-4 py-2 animate-pulse"
              >
                <div className="h-4 w-1/3 bg-brand-slate-800 rounded mb-2" />
                <div className="h-3 w-5/6 bg-brand-slate-800/60 rounded mb-2" />
                <div className="h-2 w-1/4 bg-brand-slate-800/40 rounded" />
              </div>
            ))}
          </div>
        ) : (
          tips.map((card, idx) => (
            <div
              key={card.cardId || idx}
              className="border-l-2 border-brand-cyan-500/40 pl-4 py-2 text-left"
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
          ))
        )}
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
  );
}
