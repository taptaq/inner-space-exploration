"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KnowledgeCard } from "@/data/medicalKnowledge";

export interface MedicalDictionaryProps {
  defenseLevel: number;
  tempPreference: string;
  rhythmPerception: number;
  className?: string; // 允许外部传入 className 控制样式
}

export function MedicalDictionary({
  defenseLevel,
  tempPreference,
  rhythmPerception,
  className = "",
}: MedicalDictionaryProps) {
  const router = useRouter();
  const [tips, setTips] = useState<KnowledgeCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchKnowledge() {
      try {
        const res = await fetch("/api/knowledge?type=cards");
        if (!res.ok) throw new Error("Failed to fetch");
        const allCards: KnowledgeCard[] = await res.json();

        // 在前端用相同的判断逻辑筛选专属词条
        const filteredTips: KnowledgeCard[] = [];

        // 根据防线等级推荐心理健康内容
        if (defenseLevel > 60) {
          filteredTips.push(
            allCards.find((c) => c.cardId === "psy-001") || allCards[0],
          );
        } else {
          filteredTips.push(
            allCards.find((c) => c.cardId === "psy-003") || allCards[0],
          );
        }

        // 根据温度偏好推荐生理知识
        if (tempPreference === "极寒" || tempPreference === "熔毁") {
          filteredTips.push(
            allCards.find((c) => c.cardId === "phy-002") || allCards[0],
          );
        } else {
          filteredTips.push(
            allCards.find((c) => c.cardId === "phy-001") || allCards[0],
          );
        }

        // 根据节奏感知推荐一条冷知识
        if (rhythmPerception > 50) {
          filteredTips.push(
            allCards.find((c) => c.cardId === "fun-001") || allCards[0],
          );
        } else {
          filteredTips.push(
            allCards.find((c) => c.cardId === "fun-002") || allCards[0],
          );
        }

        // 过滤掉未找到的 fallback（以防数据库中没有对应的 ID）
        setTips(filteredTips.filter((t) => t != null));
      } catch (error: any) {
        console.error("Fetch knowledge error:", error);
        setErrorMsg(error.message || String(error));
      } finally {
        setIsLoading(false);
      }
    }

    fetchKnowledge();
  }, [defenseLevel, tempPreference, rhythmPerception]);

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
            Retrieving from DB...
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
