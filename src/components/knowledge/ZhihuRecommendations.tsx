"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";

interface RootZhihuResponse {
  status: number;
  data?: {
    total: number;
    items: ZhihuSearchItem[];
  };
  msg?: string;
}

interface ZhihuSearchItem {
  title: string;
  content_type: string;
  content_id: string;
  content_text: string;
  url: string;
  comment_count?: number;
  vote_up_count?: number;
  author_name: string;
  author_avatar?: string;
  author_badge?: string;
  author_badge_text?: string;
  edit_time?: number;
  authority_level?: string;
}

interface ZhihuRecommendationsProps {
  payload: any;
  onDataReady?: (items: ZhihuSearchItem[]) => void;
}

export default function ZhihuRecommendations({
  payload,
  onDataReady,
}: ZhihuRecommendationsProps) {
  const [items, setItems] = useState<ZhihuSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { defenseLevel, tempPreference, rhythmPerception } = payload || {};

  // Store the active search query in state
  const [searchQuery, setSearchQuery] = useState("");

  const generateQueries = useCallback(() => {
    const queries = [];

    // Core logic for selecting keyword based on payload
    if (defenseLevel && defenseLevel > 70) {
      queries.push("人际边界感", "享受独处", "内向者社交", "社交内耗");
    } else if (defenseLevel && defenseLevel < 40) {
      queries.push("高敏感人群", "真诚社交", "如何快速融入群体");
    }

    if (tempPreference) {
      if (tempPreference.includes("极寒") || tempPreference.includes("冷静")) {
        queries.push("极度理性", "冷静思考", "理性分析");
      } else if (
        tempPreference.includes("熔毁") ||
        tempPreference.includes("温热")
      ) {
        queries.push("情绪价值", "浪漫主义", "情感共鸣");
      }
    }

    if (rhythmPerception) {
      if (rhythmPerception > 70) {
        queries.push("快节奏生活", "效率至上");
      } else {
        queries.push("慢生活", "松弛感", "内观");
      }
    }

    // Default fallbacks if payload is empty or doesn't match
    if (queries.length === 0) {
      queries.push("探索宇宙", "寻找自我", "孤独与自由");
    }

    return queries;
  }, [defenseLevel, tempPreference, rhythmPerception]);

  const fetchRecommendations = useCallback(
    async (queryToFetch: string) => {
      if (!queryToFetch) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/zhihu/search?query=${encodeURIComponent(queryToFetch)}&count=4`,
        );
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`);
        }

        const json: RootZhihuResponse = await res.json();

        if (json.status === 0 && json.data && json.data.items) {
          const fetchedItems = json.data.items.filter(Boolean).slice(0, 4);
          setItems(fetchedItems);
          if (onDataReady) onDataReady(fetchedItems);
        } else {
          throw new Error(json.msg || "Invalid response format from server");
        }
      } catch (err: any) {
        setError(err.message || "获取知乎共鸣锚点失败");
        console.error("Zhihu search error:", err);
        if (onDataReady) onDataReady([]);
      } finally {
        setLoading(false);
      }
    },
    [onDataReady],
  );

  // Initial setup and when deps change
  useEffect(() => {
    const queries = generateQueries();
    const newQuery = queries[Math.floor(Math.random() * queries.length)];
    setSearchQuery(newQuery);
  }, [generateQueries]);

  // Fetch when searchQuery explicitly changes
  useEffect(() => {
    if (searchQuery) {
      fetchRecommendations(searchQuery);
    }
  }, [searchQuery, fetchRecommendations]);

  const handleRefresh = () => {
    const queries = generateQueries();
    // try to pick a different one if possible
    let newQuery = queries[Math.floor(Math.random() * queries.length)];
    if (queries.length > 1 && newQuery === searchQuery) {
      newQuery = queries.find((q: string) => q !== searchQuery) || newQuery;
    }
    setSearchQuery(newQuery);
  };

  return (
    <div className="bg-brand-slate-900/50 border border-brand-cyan-900/30 p-4 sm:p-6 rounded-sm relative flex flex-col h-full min-h-[400px]">
      {/* 边角修饰 */}
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand-cyan-500 rounded-tr-sm" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-brand-cyan-500 rounded-bl-sm" />

      <header className="flex justify-between items-center border-b border-brand-slate-800 pb-3 mb-4">
        <div>
          <h2 className="text-sm text-brand-cyan-500 font-bold tracking-widest uppercase flex items-center gap-2">
            <svg
              className="w-4 h-4"
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
            [ 全网共鸣截获：知乎 ]
          </h2>
          <p className="text-[10px] text-brand-slate-500 mt-1 uppercase tracking-widest font-mono">
            Intercepted Keyword:{" "}
            <span className="text-brand-emerald-400">"{searchQuery}"</span>
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="text-xs text-brand-slate-500 hover:text-brand-cyan-400 disabled:opacity-50 transition-colors p-1"
          title="重新扫描波段"
        >
          <svg
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        {loading ? (
          // Loading Skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-3 border border-brand-slate-800/50 bg-brand-slate-950/30 rounded-sm animate-pulse"
            >
              <div className="h-4 bg-brand-slate-800 rounded w-3/4 mb-3" />
              <div className="h-3 bg-brand-slate-800/50 rounded w-full mb-2" />
              <div className="h-3 bg-brand-slate-800/50 rounded w-5/6 mb-4" />
              <div className="flex justify-between">
                <div className="h-2 bg-brand-slate-800 rounded w-16" />
                <div className="h-2 bg-brand-slate-800 rounded w-12" />
              </div>
            </div>
          ))
        ) : error ? (
          // Error State
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
            <svg
              className="w-8 h-8 text-brand-rose-500/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-xs text-brand-rose-400 font-mono tracking-widest">
              {error}
            </p>
            <button
              onClick={handleRefresh}
              className="px-4 py-1.5 border border-brand-slate-700 text-brand-slate-300 text-[10px] hover:bg-brand-slate-800 hover:text-white transition-colors"
            >
              [ 重新连接信号塔 ]
            </button>
          </div>
        ) : items.length === 0 ? (
          // Empty State
          <div className="flex items-center justify-center h-full text-xs text-brand-slate-500 font-mono tracking-widest mt-10">
            暂未截获当前波段的有效通信。
          </div>
        ) : (
          // Render Items
          items.map((item, idx) => (
            <a
              key={`${item.content_id || item.url}-${idx}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 border border-brand-slate-800/80 bg-brand-slate-950/50 rounded-sm hover:border-brand-cyan-500/50 hover:bg-brand-cyan-950/20 transition-all group"
            >
              <h3
                className="text-sm text-brand-emerald-100 font-bold mb-2 group-hover:text-brand-cyan-300 line-clamp-2 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: item.title }}
              />

              <p
                className="text-xs text-brand-slate-400 mb-3 line-clamp-3 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: item.content_text.replace(/<[^>]*>?/gm, ""),
                }}
              />

              <div className="flex justify-between items-center text-[10px] text-brand-slate-500 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-3 bg-brand-cyan-900 inline-block rounded-sm" />
                  {item.author_name || "匿名探索者"}
                </span>
                {item.vote_up_count !== undefined && (
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3 h-3 text-brand-emerald-500/70"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    {item.vote_up_count > 1000
                      ? `${(item.vote_up_count / 1000).toFixed(1)}k`
                      : item.vote_up_count}{" "}
                    赞同
                  </span>
                )}
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
