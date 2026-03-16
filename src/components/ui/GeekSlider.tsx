"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface GeekSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
  className?: string;
}

export function GeekSlider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label,
  description,
  className,
}: GeekSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("flex flex-col space-y-3", className)}>
      <div className="flex justify-between items-baseline">
        <label className="text-sm font-bold tracking-widest text-brand-cyan-500 uppercase">
          {label}
        </label>
        <span className="font-mono text-xl text-brand-emerald-400 font-light tabular-nums drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
          {value.toString().padStart(3, "0")}
        </span>
      </div>

      {description && (
        <p className="text-xs text-brand-slate-400/80 max-w-sm">
          {description}
        </p>
      )}

      <div className="relative h-12 flex items-center group">
        {/* 背景刻度槽 */}
        <div className="absolute w-full h-8 bg-brand-slate-950 border border-brand-slate-800 rounded-sm overflow-hidden flex">
          {/* 模拟机械刻度 */}
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-brand-slate-800/30 h-full"
            />
          ))}
        </div>

        {/* 激活进度条 */}
        <div
          className="absolute h-8 bg-brand-cyan-900/40 border-r border-brand-cyan-500 pointer-events-none transition-all duration-150"
          style={{ width: `${percentage}%` }}
        />

        {/* 原生隐藏滑块控制 */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full h-full opacity-0 cursor-ew-resize z-10"
        />

        {/* 滑块指示器游标 */}
        <div
          className="absolute w-1.5 h-10 bg-brand-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)] pointer-events-none transition-all duration-150 transform -translate-x-1/2"
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
