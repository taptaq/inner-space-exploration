"use client";

import React, { useRef, useState, useEffect } from "react";
import * as htmlToImage from "html-to-image";
import { AgentPayload } from "@/types/agent";
import { generateStarshipTitle } from "@/lib/titleGenerator";

interface ArchivePosterProps {
  payload: AgentPayload;
  analysisData: any;
  onClose: () => void;
}

export function ArchivePoster({
  payload,
  analysisData,
  onClose,
}: ArchivePosterProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(true);

  const fallbackStarship = generateStarshipTitle(payload);
  const starship = {
    title: analysisData?.starshipTitle || fallbackStarship.title,
    rarity: (analysisData?.starshipRarity || fallbackStarship.rarity) as string,
    description: analysisData?.starshipDescription || fallbackStarship.description,
  };

  const rarityColor: Record<string, string> = {
    N: "text-brand-slate-400 border-brand-slate-500",
    R: "text-brand-cyan-400 border-brand-cyan-500",
    SR: "text-brand-purple-400 border-brand-purple-500 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]",
    SSR: "text-brand-orange-400 border-brand-orange-500 drop-shadow-[0_0_15px_rgba(251,146,60,1)]",
  };

  useEffect(() => {
    let mounted = true;

    const capture = async () => {
      if (!posterRef.current) return;
      try {
        // 等待字体及样式渲染完成
        await new Promise((r) => setTimeout(r, 600));
        if (!mounted) return;

        const dataUrl = await htmlToImage.toPng(posterRef.current, {
          quality: 0.95,
          pixelRatio: 2, // 高清导出
        });
        if (mounted) {
           setImgUrl(dataUrl);
           setIsCapturing(false);
        }
      } catch (err) {
        console.error("Poster capture failed", err);
        if (mounted) setIsCapturing(false);
      }
    };

    capture();

    return () => {
      mounted = false;
    };
  }, []);

  const handleDownload = () => {
    if (!imgUrl) return;
    const link = document.createElement("a");
    link.download = `ISP_Archive_${Date.now()}.png`;
    link.href = imgUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-sm flex justify-between items-center mb-4">
        <h3 className="text-brand-cyan-400 font-bold tracking-widest text-sm">
          [ 绝密通讯截获 ]
        </h3>
        <button
          onClick={onClose}
          className="text-brand-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="relative w-full max-w-sm flex-1 flex flex-col items-center justify-center min-h-0 bg-brand-slate-900 border border-brand-slate-800 rounded-lg overflow-hidden relative shadow-2xl">
        {isCapturing ? (
          <div className="p-10 flex flex-col items-center justify-center h-full">
            <div className="w-10 h-10 border-2 border-brand-cyan-500/30 border-t-brand-cyan-400 rounded-full animate-spin mb-4" />
            <p className="text-xs text-brand-cyan-500 font-mono tracking-widest animate-pulse">
              正在生成长图刻录...
            </p>
          </div>
        ) : imgUrl ? (
          <div className="w-full max-h-[70vh] overflow-y-auto custom-scrollbar">
            <img src={imgUrl} alt="Archive Poster" className="w-full h-auto" />
          </div>
        ) : (
          <p className="text-red-500 p-10">生成失败</p>
        )}

        {/* The actual HTML being captured, placed absolutely but visually hidden when we show imgUrl */}
        <div
          ref={posterRef}
          className={`absolute top-0 left-0 w-[414px] bg-brand-slate-950 font-mono text-white p-6 ${
            imgUrl ? "opacity-0 pointer-events-none -z-10" : ""
          }`}
          style={{ width: 414 }} // 固定分辨率利于一致的海报输出
        >
          {/* Noise overlay */}
          <div className="absolute inset-0 opacity-5 pointer-events-none mix-blend-screen bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] z-10" />
          
          <div className="relative z-20 border border-brand-slate-800 p-5 rounded-sm bg-gradient-to-b from-brand-slate-900/50 to-transparent">
            {/* Header */}
            <header className="flex justify-between items-start border-b border-brand-slate-800 pb-4 mb-6">
              <div>
                <h1 className="text-xl font-black text-brand-cyan-500 tracking-widest">
                  INNER SPACE
                </h1>
                <p className="text-[10px] text-brand-slate-500 tracking-[0.3em] uppercase mt-1">
                  Classified File // Nav. Pass
                </p>
              </div>
              <div className="text-brand-slate-700">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
              </div>
            </header>

            {/* Rarity & Title */}
            <div className="text-center mb-8 bg-black/40 py-6 px-4 rounded border border-brand-slate-800 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-cyan-500 to-transparent opacity-20" />
              <div
                className={`inline-block px-3 py-1 border-2 font-black text-xl mb-3 tracking-widest rounded shadow-lg ${
                  rarityColor[starship.rarity]
                }`}
              >
                [{starship.rarity}] {starship.title}
              </div>
              <p className="text-xs text-brand-slate-400 italic leading-relaxed">
                "{starship.description}"
              </p>
            </div>

            {/* Params Base */}
            <div className="mb-6">
              <h2 className="text-xs font-bold text-brand-cyan-400 tracking-widest border-b border-brand-slate-800 pb-2 mb-4">
                [ 核心参数拓扑 ]
              </h2>
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-brand-slate-400">
                    <span>心理防盾层级</span>
                    <span>{payload.defenseLevel}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-brand-slate-800 rounded overflow-hidden">
                    <div className="h-full bg-brand-cyan-500" style={{ width: `${payload.defenseLevel}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-brand-slate-400">
                    <span>环境偏温带</span>
                    <span>{payload.tempPreference}</span>
                  </div>
                  <div className="text-[10px] font-bold text-brand-orange-400">
                    {'▇'.repeat(Math.ceil(payload.tempPreference.length * 5))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-brand-slate-400">
                    <span>本能频控度</span>
                    <span>{payload.rhythmPerception}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-brand-slate-800 rounded overflow-hidden">
                    <div className="h-full bg-brand-purple-500" style={{ width: `${payload.rhythmPerception}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-brand-slate-400">隐秘诉求频段</span>
                  <span className="text-xs text-brand-emerald-400 italic">"{payload.hiddenNeed}"</span>
                </div>
              </div>
            </div>

            {/* AI Diagnosis */}
            {analysisData && (
              <div className="mb-8">
                <h2 className="text-xs font-bold text-brand-cyan-400 tracking-widest border-b border-brand-slate-800 pb-2 mb-3">
                  [ 客座医生侧写 ]
                </h2>
                <div className="bg-brand-emerald-950/20 border-l-2 border-brand-emerald-500 p-3 text-brand-emerald-100/80 text-xs leading-relaxed">
                  {analysisData.medical_analysis || analysisData.analysis?.medicalInsight || "该样本波动剧烈，正在进一步收集中。"}
                </div>
              </div>
            )}

            {/* Footer / Barcode */}
            <footer className="pt-6 border-t border-brand-slate-800 flex flex-col items-center">
              <div className="font-[barcode] text-4xl text-brand-slate-600 mb-2 font-mono tracking-tight leading-none overflow-hidden h-8">
                |||| || | || ||| || ||| | |||
              </div>
              <p className="text-[9px] text-brand-slate-600 tracking-widest mb-1">
                ID: {Date.now().toString(16).toUpperCase()} // CLASSIFIED
              </p>
              <p className="text-[10px] text-brand-cyan-500 font-bold tracking-widest uppercase">
                内太空漫游 · INNER SPACE
              </p>
            </footer>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center w-full max-w-sm gap-3">
        {imgUrl && (
          <button
            onClick={handleDownload}
            className="w-full py-4 bg-brand-cyan-500/20 border border-brand-cyan-400 text-brand-cyan-300 font-bold tracking-widest uppercase hover:bg-brand-cyan-500 hover:text-brand-slate-900 transition-all rounded shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            [ 保存实体档案 ]
          </button>
        )}
        <p className="text-[10px] text-brand-slate-500 tracking-widest text-center">
          移动端可长按图片直接保存分享
        </p>
      </div>
    </div>
  );
}
