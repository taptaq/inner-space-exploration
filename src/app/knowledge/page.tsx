"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  categoryLabels,
  type KnowledgeCategory,
  type KnowledgeCard,
} from "@/data/medicalKnowledge";

export default function KnowledgePage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<
    KnowledgeCategory | "all"
  >("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [dbCards, setDbCards] = useState<KnowledgeCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // RAG Modal State
  const [ragModalOpen, setRagModalOpen] = useState(false);
  const [ragData, setRagData] = useState<any>(null);
  const [ragLoading, setRagLoading] = useState(false);

  const openRagModal = async (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRagModalOpen(true);
    setRagLoading(true);
    setRagData(null);
    try {
      const res = await fetch(`/api/knowledge/rag?cardId=${cardId}`);
      if (res.ok) {
        const data = await res.json();
        setRagData(data);
      } else {
        setRagData({ error: "Failed to retrieve deep space literature." });
      }
    } catch (e) {
      setRagData({ error: "Connection to RAG semantic core lost." });
    } finally {
      setRagLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => setIsRendered(true), 200);

    // Fetch knowledge cards from DB
    fetch("/api/knowledge?type=cards")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("API Route returning non-200 status");
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setDbCards(data);
        } else {
          console.error("API did not return an array", data);
          setDbCards([]);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch knowledge cards:", err);
        setDbCards([]); // Fallback to empty array safely
        setIsLoading(false);
      });
  }, []);

  // 背景粒子
  const [stars, setStars] = useState<any[]>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: 40 }).map(() => ({
        id: Math.random(),
        size: Math.random() * 2 + 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
        dur: Math.random() * 6 + 8,
        delay: Math.random() * 3,
      })),
    );
  }, []);

  const filteredCards =
    activeCategory === "all"
      ? dbCards
      : dbCards.filter((c) => c.category === activeCategory);

  const categories: (KnowledgeCategory | "all")[] = [
    "all",
    "psychology",
    "physiology",
    "safety",
    "funfact",
  ];

  const getCategoryColor = (cat: KnowledgeCategory): string => {
    const map: Record<KnowledgeCategory, string> = {
      psychology: "brand-cyan",
      physiology: "brand-emerald",
      safety: "brand-rose",
      funfact: "brand-amber",
    };
    return map[cat];
  };

  const getBorderColor = (cat: KnowledgeCategory): string => {
    const map: Record<KnowledgeCategory, string> = {
      psychology: "border-brand-cyan-500/40",
      physiology: "border-brand-emerald-500/40",
      safety: "border-brand-rose-500/40",
      funfact: "border-amber-500/40",
    };
    return map[cat];
  };

  return (
    <main className="min-h-screen bg-brand-slate-950 text-white font-mono relative overflow-hidden">
      {/* 深空背景 */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.06)_0%,transparent_70%)] mix-blend-screen" />
        {isRendered &&
          stars.map((p) => (
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

      {/* 头部 */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-10 sm:pt-12 pb-20">
        {/* 返回按钮 */}
        <button
          onClick={() => router.back()}
          className="text-brand-slate-400 hover:text-brand-cyan-500 flex items-center space-x-2 text-xs font-bold tracking-widest uppercase transition-colors mb-8"
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

        {/* 标题 */}
        <header className="mb-8">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border border-brand-cyan-900/30 bg-brand-slate-900/60 backdrop-blur-md mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,1)]" />
            <span className="text-[10px] text-brand-emerald-400 font-bold tracking-widest uppercase">
              深空医学数据库 · 在线
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-brand-cyan-100 to-brand-cyan-500 tracking-tight mb-2 flex items-center gap-3">
            📚 深空医典
            {isLoading && (
              <span className="text-xs text-brand-cyan-400 font-normal animate-pulse border border-brand-cyan-500/30 px-2 py-0.5 rounded bg-brand-cyan-500/10">
                Syncing Subspace Intel...
              </span>
            )}
          </h1>
          <p className="text-sm text-brand-slate-500 tracking-wide">
            科学认识自己的身体与心理，是优质亲密关系的第一步。
          </p>
        </header>

        {/* 分类标签栏 */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const label =
              cat === "all"
                ? "全部"
                : `${categoryLabels[cat].icon} ${categoryLabels[cat].label}`;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider border transition-all duration-300 ${
                  isActive
                    ? "border-brand-cyan-500/60 bg-brand-cyan-500/15 text-brand-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                    : "border-brand-slate-700 bg-brand-slate-900/50 text-brand-slate-500 hover:border-brand-slate-600 hover:text-brand-slate-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* 卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isLoading
            ? [...Array(6)].map((_, i) => (
                <div
                  key={`skel-${i}`}
                  className="bg-brand-slate-900/50 border border-brand-slate-800 rounded-lg p-5 animate-pulse min-h-[140px]"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="h-5 w-24 bg-brand-slate-800 rounded-full" />
                    <div className="h-4 w-4 bg-brand-slate-800 rounded" />
                  </div>
                  <div className="h-5 w-2/3 bg-brand-slate-700/80 rounded mb-3" />
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-brand-slate-800/80 rounded" />
                    <div className="h-3 w-4/5 bg-brand-slate-800/80 rounded" />
                  </div>
                </div>
              ))
            : filteredCards.map((card) => {
                const isExpanded = expandedId === card.id;
                return (
                  <div
                    key={card.id}
                    onClick={() => setExpandedId(isExpanded ? null : card.id)}
                    className={`group relative bg-brand-slate-900/50 border rounded-lg p-5 cursor-pointer transition-all duration-300 overflow-hidden ${
                      isExpanded
                        ? `${getBorderColor(card.category)} bg-brand-slate-900/70 shadow-[0_0_20px_rgba(6,182,212,0.08)]`
                        : "border-brand-slate-800 hover:border-brand-slate-700"
                    }`}
                  >
                    {/* 分类标签 */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-bold tracking-wider ${
                          card.category === "psychology"
                            ? "border-brand-cyan-500/30 text-brand-cyan-400 bg-brand-cyan-500/10"
                            : card.category === "physiology"
                              ? "border-brand-emerald-500/30 text-brand-emerald-400 bg-brand-emerald-500/10"
                              : card.category === "safety"
                                ? "border-brand-rose-500/30 text-brand-rose-400 bg-brand-rose-500/10"
                                : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                        }`}
                      >
                        {categoryLabels[card.category].icon}{" "}
                        {categoryLabels[card.category].label}
                      </span>
                      <span className="text-brand-slate-600 text-xs">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>

                    {/* 标题 */}
                    <h3 className="text-sm font-bold text-white mb-2 tracking-wide group-hover:text-brand-cyan-100 transition-colors">
                      {card.icon} {card.title}
                    </h3>

                    {/* 摘要 */}
                    <p className="text-xs text-brand-slate-400 leading-relaxed">
                      {card.summary}
                    </p>

                    {/* 展开详情 */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-brand-slate-800 animate-[fadeIn_0.3s_ease-out]">
                        <p className="text-xs text-brand-slate-300 leading-relaxed mb-3">
                          {card.detail}
                        </p>
                        <div className="flex items-center justify-between mb-3 border-t border-brand-slate-800/50 pt-3">
                          <p className="text-[10px] text-brand-slate-500 font-mono flex items-center gap-1.5">
                            <svg
                              className="w-3 h-3 text-brand-cyan-500/70"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                              />
                            </svg>
                            文献基准: {card.source}
                          </p>
                          <button
                            onClick={(e) => openRagModal(card.cardId, e)}
                            className="text-[9px] px-2 py-0.5 border border-brand-cyan-900/50 text-brand-cyan-400 bg-brand-cyan-950/20 rounded-sm hover:bg-brand-cyan-900/50 transition-colors uppercase tracking-widest flex items-center gap-1"
                            title="通过 RAG 架构溯源底层学术文献"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald-400 animate-[pulse_2s_infinite]" />
                            RAG 溯源
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {card.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-2 py-0.5 rounded bg-brand-slate-800 text-brand-slate-500"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
        </div>

        {/* 底部装饰 */}
        <div className="mt-16 text-center text-[10px] text-brand-slate-600 tracking-widest space-y-1">
          <p>以上内容仅供科学参考，不构成医学建议。</p>
          <p>
            DEEP SPACE ARCHIVES v2.0 © {new Date().getFullYear()} INNER SPACE
            ODYSSEY
          </p>
        </div>
      </div>

      {/* RAG Traceback Modal */}
      {ragModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-slate-950/80 backdrop-blur-sm">
          <div className="bg-brand-slate-900 border border-brand-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.2)] rounded-sm max-w-lg w-full p-6 relative overflow-hidden">
            {/* Scanlines effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] opacity-20 z-10" />

            <button
              onClick={() => setRagModalOpen(false)}
              className="absolute top-4 right-4 text-brand-slate-500 hover:text-white z-20"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="relative z-20">
              <h2 className="text-brand-emerald-400 font-bold tracking-widest uppercase text-xs mb-4 flex items-center gap-2 border-b border-brand-slate-800 pb-2">
                <span className="w-2 h-2 rounded-full bg-brand-emerald-400 animate-pulse" />
                [ RAG Literature Traceback ]
              </h2>

              {ragLoading ? (
                <div className="space-y-3 font-mono text-xs text-brand-cyan-500/80 my-8">
                  <p className="animate-pulse">
                    {">"} Initializing pgvector embedding search...
                  </p>
                  <p className="animate-pulse delay-75">
                    {">"} Decrypting Deep Space Medical Archives...
                  </p>
                  <p className="animate-pulse delay-150">
                    {">"} Locating exact theoretical baseline...
                  </p>
                </div>
              ) : ragData?.error ? (
                <div className="text-brand-rose-400 text-xs font-mono my-8">
                  {">"} 错误: {ragData.error}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-brand-slate-500 uppercase tracking-widest block mb-1">
                      Source Node
                    </span>
                    <p className="text-white text-sm font-bold">
                      {ragData?.title}
                    </p>
                  </div>

                  <div className="bg-brand-slate-950/50 border border-brand-slate-800 p-4 rounded-sm">
                    <span className="text-[10px] text-brand-emerald-500 uppercase tracking-widest block mb-2 border-b border-brand-slate-800/50 pb-1">
                      原始临床文献摘要
                    </span>
                    <p className="text-xs text-brand-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                      {ragData?.citationAbstract ||
                        "当前的向量子空间中暂无匹配的文献摘要。"}
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-[10px] pt-2">
                    <span className="text-brand-slate-500">
                      基准:{" "}
                      <span className="text-brand-cyan-400">
                        {ragData?.source}
                      </span>
                    </span>
                    {ragData?.citationUrl && (
                      <a
                        href={`https://${ragData.citationUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-emerald-400 hover:text-brand-emerald-300 underline underline-offset-2 decoration-brand-emerald-500/30 font-mono"
                      >
                        [ DOI Link: {ragData.citationUrl.split("/")[0]} ]
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
