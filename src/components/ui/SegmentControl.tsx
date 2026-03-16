"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  description?: string;
  className?: string;
}

export function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  label,
  description,
  className,
}: SegmentControlProps<T>) {
  return (
    <div className={cn("flex flex-col space-y-3", className)}>
      <label className="text-sm font-bold tracking-widest text-brand-cyan-500 uppercase">
        {label}
      </label>

      {description && (
        <p className="text-xs text-brand-slate-400/80 max-w-sm">
          {description}
        </p>
      )}

      {/* 离散拨档控制槽 */}
      <div className="flex bg-brand-slate-950 border border-brand-slate-800 rounded-sm p-1">
        {options.map((opt) => {
          const isActive = opt.value === value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex-1 py-3 text-xs md:text-sm tracking-widest uppercase transition-all duration-200 border-none outline-none relative",
                isActive
                  ? "text-brand-slate-950 font-bold bg-brand-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  : "text-brand-slate-400 hover:text-white"
              )}
            >
              {opt.label}
              
              {/* 激活状态的工业警示线点缀 */}
              {isActive && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-emerald-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
