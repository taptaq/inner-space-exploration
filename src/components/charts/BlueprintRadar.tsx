"use client";

import React, { useEffect, useRef } from "react";
import ReactECharts from "echarts-for-react";

interface RadarData {
  name: string;
  value: number[];
}

interface BlueprintRadarProps {
  indicator: Array<{ name: string; max: number }>;
  data: RadarData[];
  className?: string;
}

export function BlueprintRadar({ indicator, data, className }: BlueprintRadarProps) {
  // 深空工业风雷达图配置项
  const getOption = () => ({
    backgroundColor: "transparent",
    color: ["#34d399", "#06b6d4"], // 荧光绿 (主Agent) 与 幽蓝 (匹配对象)
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(2, 6, 23, 0.9)", // slate-950
      borderColor: "#0e7490", // cyan-700
      textStyle: {
        color: "#94a3b8", // slate-400
        fontFamily: "monospace",
        fontSize: 12
      },
    },
    legend: {
      bottom: 0,
      data: data.map((d) => d.name),
      textStyle: {
        color: "#f8fafc",
        fontFamily: "monospace",
        fontSize: 10
      },
      icon: "rect",
    },
    radar: {
      indicator: indicator,
      shape: "polygon", // 保持硬核的折线多边形，而非圆形
      splitNumber: 5,
      axisName: {
        color: "#06b6d4",
        fontFamily: "monospace",
        fontSize: 11,
        padding: [3, 5],
      },
      splitLine: {
        lineStyle: {
          color: ["rgba(14, 116, 144, 0.2)"], // 线框幽蓝
        },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ["rgba(2, 6, 23, 0.5)", "rgba(14, 116, 144, 0.05)"],
        },
      },
      axisLine: {
        lineStyle: {
          color: "rgba(14, 116, 144, 0.5)",
        },
      },
    },
    series: [
      {
        name: "A2A 契合度图谱",
        type: "radar",
        symbol: "square",
        symbolSize: 4,
        lineStyle: {
          width: 2,
        },
        data: data.map((item, index) => ({
          value: item.value,
          name: item.name,
          areaStyle: {
            color: index === 0 ? "rgba(52, 211, 153, 0.2)" : "rgba(6, 182, 212, 0.2)",
          },
        })),
      },
    ],
  });

  return (
    <div className={`relative w-full h-[400px] ${className || ""}`}>
      {/* 装饰性外部光晕与刻度环 (纯 CSS 实现以增强极客感) */}
      <div className="absolute inset-0 pointer-events-none border border-brand-cyan-900/40 rounded-full scale-[1.05] opacity-30 shadow-[0_0_30px_rgba(6,182,212,0.1)]" />
      <div className="absolute inset-0 pointer-events-none border border-brand-emerald-400/20 rounded-full scale-[0.8] opacity-20 border-dashed" />
      
      <ReactECharts 
        option={getOption()} 
        style={{ height: "100%", width: "100%" }} 
        opts={{ renderer: "canvas" }}
      />
    </div>
  );
}
