"use client";

import React, { useMemo } from "react";
import { AgentPayload } from "@/types/agent";

export const EquipmentConceptRender = ({
  payload,
  isSolo = false,
  analysisData,
}: {
  payload: AgentPayload;
  isSolo?: boolean;
  analysisData?: any;
}) => {
  // 核心样式变量：单人孤寂版偏向偏冷偏暗的天空蓝，双人版偏向明亮的赛博青色
  const primaryColor = isSolo ? "#38bdf8" : "#06b6d4";
  const secondaryColor = isSolo ? "#0ea5e9" : "#10b981";

  // 根据参数计算衍生器械配置
  const equipmentSpecs = useMemo(() => {
    // 默认回退映射逻辑
    let typeName = "脑神经共鸣器 (Neural Resonator)";
    let typeEn = "NEURAL_RESONATOR_A";

    if (payload.defenseLevel < 40 && payload.rhythmPerception > 70) {
      typeName = "体征锚定环 (Somatic Monitor)";
      typeEn = "SOMATIC_MONITOR_S";
    } else if (payload.defenseLevel > 70 && payload.rhythmPerception < 50) {
      typeName = "全息舒缓舱 (Sensory Pod)";
      typeEn = "SENSORY_POD_OMEGA";
    } else if (payload.hiddenNeed && payload.hiddenNeed.length > 20) {
      typeName = "经络理疗臂 (Meridian Probe)";
      typeEn = "MERIDIAN_PROBE_X";
    }

    const cmfMaterial =
      payload.defenseLevel > 60
        ? "高密度星舰级防震硅胶 (High-density Aircraft Silicone)"
        : "液态匿踪仿生果冻胶 (Liquid Stealth Jelly TPE)";

    let tempDegree = "38°C (标准推进)";
    if (payload.tempPreference === "极寒") tempDegree = "20°C (休眠冰息)";
    if (payload.tempPreference === "冷静") tempDegree = "32°C (低功率巡航)";
    if (payload.tempPreference === "恒温") tempDegree = "37.5°C (拟真体温)";
    if (payload.tempPreference === "温热") tempDegree = "42°C (加力推进)";
    if (payload.tempPreference === "熔毁") tempDegree = "48°C (感官熔毁临界)";

    const freqMin = Math.max(10, payload.rhythmPerception - 30);
    const freqMax = payload.rhythmPerception + 40;
    const frequencyStr = `${freqMin} - ${freqMax} Hz (曲率震动阈)`;

    // 优先采用大模型定制的深度诊断
    if (analysisData) {
      if (analysisData.equipmentType) {
        typeEn = analysisData.equipmentType;
      }
      if (analysisData.equipmentName) {
        typeName = analysisData.equipmentName;
      }
      return {
        typeName,
        typeEn,
        cmfMaterial: analysisData.recommendedCmf || cmfMaterial,
        tempDegree: analysisData.recommendedTemp || tempDegree,
        frequencyStr: analysisData.recommendedFrequency || frequencyStr,
      };
    }

    // 回落默认值
    return {
      typeName,
      typeEn,
      cmfMaterial,
      tempDegree,
      frequencyStr,
    };
  }, [payload, analysisData]);

  return (
    <div className="relative w-full aspect-video sm:aspect-[21/9] lg:aspect-video bg-brand-slate-950/80 border border-brand-slate-800 rounded-md overflow-hidden flex items-center justify-center font-mono">
      {/* 极简网格背景 */}
      <div
        className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(${primaryColor} 1px, transparent 1px), linear-gradient(90deg, ${primaryColor} 1px, transparent 1px)`,
          backgroundSize: "30px 30px",
        }}
      />

      {/* 中心放射渐变 */}
      <div
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${primaryColor} 0%, transparent 60%)`,
        }}
      />

      {/* ========== 动态 SVG 全息线框渲染 ========== */}
      <svg
        className="absolute inset-0 w-full h-full z-10 pointer-events-none"
        viewBox="0 0 1000 500"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* 中心波形模拟 - 频率可视化 */}
        <g transform="translate(700, 350)">
          <path
            d="M-150 0 Q-120 -80 -90 0 T-30 0 T30 0 T90 0 T150 0"
            stroke={primaryColor}
            strokeWidth="1.5"
            fill="none"
            className="opacity-80"
            strokeDasharray="5 5"
          >
            <animate
              attributeName="d"
              values="M-150 0 Q-120 -80 -90 0 T-30 0 T30 0 T90 0 T150 0;M-150 0 Q-120 80 -90 0 T-30 0 T30 0 T90 0 T150 0;M-150 0 Q-120 -80 -90 0 T-30 0 T30 0 T90 0 T150 0"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M-150 0 Q-135 50 -120 0 T-60 0 T0 0 T60 0 T120 0 T150 0"
            stroke={primaryColor}
            strokeWidth="1"
            fill="none"
            className="opacity-50"
          >
            <animate
              attributeName="d"
              values="M-150 0 Q-135 50 -120 0 T-60 0 T0 0 T60 0 T120 0 T150 0;M-150 0 Q-135 -50 -120 0 T-60 0 T0 0 T60 0 T120 0 T150 0;M-150 0 Q-135 50 -120 0 T-60 0 T0 0 T60 0 T120 0 T150 0"
              dur="1.2s"
              repeatCount="indefinite"
            />
          </path>
          {/* 中轴线 */}
          <line
            x1="-180"
            y1="0"
            x2="180"
            y2="0"
            stroke={primaryColor}
            strokeWidth="1"
            className="opacity-40"
          />
        </g>

        <g transform="translate(500, 250)">
          {/* 震动棒流线型 / 兔耳 */}
          {equipmentSpecs.typeEn.includes("RESONATOR") && (
            <g
              transform="rotate(-35) scale(1.3)"
              className="animate-[pulse_3s_ease-in-out_infinite]"
            >
              {/* 主棒身 */}
              <path
                d="M-20 100 C-30 110, -50 40, -40 -30 C-30 -100, 30 -100, 40 -30 C50 40, 30 110, 20 100 Z"
                fill="none"
                stroke={primaryColor}
                strokeWidth="2"
                strokeDasharray="2 4"
              />
              {/* 经纬度线体 - 制造3D感 */}
              {Array.from({ length: 8 }).map((_, i) => (
                <path
                  key={"h" + i}
                  d={`M${-40 + i * 3} ${-30 + i * 15} Q 0 ${-50 + i * 15} ${40 - i * 3} ${-30 + i * 15}`}
                  fill="none"
                  stroke={primaryColor}
                  strokeWidth="0.5"
                  className="opacity-40"
                />
              ))}
              <ellipse
                cx="0"
                cy="-5"
                rx="36"
                ry="70"
                fill="none"
                stroke={primaryColor}
                strokeWidth="0.5"
                className="opacity-30"
              />

              {/* 小分叉兔耳 */}
              <path
                d="M-40 0 C-60 -20, -70 -50, -50 -60 C-40 -65, -30 -40, -25 -10"
                fill="none"
                stroke={secondaryColor}
                strokeWidth="1.5"
                strokeDasharray="1 3"
              />
              <circle
                cx="-50"
                cy="-60"
                r="3"
                fill="white"
                className="animate-ping"
              />
            </g>
          )}

          {/* 杯型圆柱体 */}
          {equipmentSpecs.typeEn.includes("POD") && (
            <g
              transform="rotate(15) scale(1.4)"
              className="animate-[pulse_3s_ease-in-out_infinite]"
            >
              <path
                d="M-50 -80 L50 -80 L60 80 L-60 80 Z"
                fill="none"
                stroke={primaryColor}
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <ellipse
                cx="0"
                cy="-80"
                rx="50"
                ry="15"
                fill="none"
                stroke={primaryColor}
                strokeWidth="2"
              />
              <ellipse
                cx="0"
                cy="80"
                rx="60"
                ry="20"
                fill="none"
                stroke={primaryColor}
                strokeWidth="2"
              />
              {/* 螺纹切面 */}
              {[...Array(6)].map((_, i) => (
                <ellipse
                  key={i}
                  cx="0"
                  cy={-50 + i * 25}
                  rx={50 + i * 1.5}
                  ry="15"
                  fill="none"
                  stroke={primaryColor}
                  strokeWidth="0.5"
                  className="opacity-50"
                />
              ))}
              <circle
                cx="0"
                cy="0"
                r="20"
                fill={primaryColor}
                fillOpacity="0.2"
                stroke={secondaryColor}
              />
              <circle
                cx="0"
                cy="0"
                r="3"
                fill="white"
                className="animate-ping"
              />
            </g>
          )}

          {/* 环形 */}
          {equipmentSpecs.typeEn.includes("MONITOR") && (
            <g
              transform="scale(1.5)"
              className="animate-[pulse_3s_ease-in-out_infinite]"
            >
              <ellipse
                cx="0"
                cy="0"
                rx="60"
                ry="25"
                fill="none"
                stroke={primaryColor}
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <ellipse
                cx="0"
                cy="0"
                rx="75"
                ry="35"
                fill="none"
                stroke={primaryColor}
                strokeWidth="1"
                className="opacity-50"
              />
              {/* 动力模块鼓包 */}
              <path
                d="M-20 23 Q 0 40 20 23 L 15 18 Q 0 30 -15 18 Z"
                fill={primaryColor}
                fillOpacity="0.4"
                stroke={secondaryColor}
                strokeWidth="1"
              />
              {/* 中心放空区射线 */}
              {[...Array(12)].map((_, i) => (
                <line
                  key={i}
                  x1="0"
                  y1="0"
                  x2={Math.cos((i * 30 * Math.PI) / 180) * 50}
                  y2={Math.sin((i * 30 * Math.PI) / 180) * 20}
                  stroke={primaryColor}
                  strokeWidth="0.5"
                  className="opacity-30"
                />
              ))}
            </g>
          )}

          {/* 触角伸缩棒 */}
          {equipmentSpecs.typeEn.includes("PROBE") && (
            <g
              transform="scale(1.3)"
              className="animate-[pulse_3s_ease-in-out_infinite]"
            >
              <path
                d="M0 80 Q -60 20 10 -40 T 0 -100"
                fill="none"
                stroke={primaryColor}
                strokeWidth="2"
                strokeDasharray="2 2"
              />
              <path
                d="M-10 80 Q -70 20 0 -40 T -10 -100"
                fill="none"
                stroke={primaryColor}
                strokeWidth="1"
                className="opacity-50"
              />
              <path
                d="M10 80 Q -50 20 20 -40 T 10 -100"
                fill="none"
                stroke={primaryColor}
                strokeWidth="1"
                className="opacity-50"
              />
              {/* 节点球体 */}
              <circle
                cx="0"
                cy="80"
                r="8"
                fill="none"
                stroke={secondaryColor}
                strokeWidth="2"
              />
              <circle
                cx="-13"
                cy="22"
                r="6"
                fill={primaryColor}
                fillOpacity="0.5"
              />
              <circle
                cx="15"
                cy="-25"
                r="5"
                fill={primaryColor}
                fillOpacity="0.5"
              />
              <circle
                cx="0"
                cy="-100"
                r="10"
                fill="none"
                stroke={secondaryColor}
                strokeWidth="2"
              />
              <circle
                cx="0"
                cy="-100"
                r="3"
                fill="white"
                className="animate-ping"
              />
            </g>
          )}

          {/* 小型跳蛋 - 隐秘便携流线型 */}
          {equipmentSpecs.typeEn.includes("CAPSULE") && (
            <g transform="scale(1.2)" className="animate-[pulse_3s_ease-in-out_infinite]">
              <path d="M-30 40 Q -35 0 -30 -40 Q 0 -80 30 -40 Q 35 0 30 40 Q 0 60 -30 40 Z" fill="none" stroke={primaryColor} strokeWidth="2" strokeDasharray="3 3"/>
              <ellipse cx="0" cy="0" rx="33" ry="12" fill="none" stroke={primaryColor} strokeWidth="1" className="opacity-40" />
              <ellipse cx="0" cy="25" rx="20" ry="10" fill="none" stroke={primaryColor} strokeWidth="1" className="opacity-40" />
              <ellipse cx="0" cy="-25" rx="25" ry="12" fill="none" stroke={primaryColor} strokeWidth="1" className="opacity-40" />
              {/* 尾绳 */}
              <path d="M0 48 Q -20 80 10 120" fill="none" stroke={secondaryColor} strokeWidth="1.5" strokeDasharray="2 2" />
              <circle cx="10" cy="120" r="4" fill="none" stroke={secondaryColor} strokeWidth="1.5" />
            </g>
          )}

          {/* 大型按摩棒/法杖 - 头部大圆球重型刺激 */}
          {equipmentSpecs.typeEn.includes("WAND") && (
            <g transform="rotate(20) scale(1.1) translate(0, -30)" className="animate-[pulse_3s_ease-in-out_infinite]">
              {/* 头部大球 */}
              <circle cx="0" cy="-60" r="45" fill="none" stroke={primaryColor} strokeWidth="2" strokeDasharray="4 2" />
              <circle cx="0" cy="-60" r="35" fill="none" stroke={primaryColor} strokeWidth="1" className="opacity-50" />
              {/* 球体经纬线 */}
              <ellipse cx="0" cy="-60" rx="45" ry="15" fill="none" stroke={primaryColor} strokeWidth="0.5" className="opacity-40" />
              <ellipse cx="0" cy="-60" rx="15" ry="45" fill="none" stroke={primaryColor} strokeWidth="0.5" className="opacity-40" />
              {/* 长手柄 */}
              <path d="M-15 -15 L-20 120 A 20 10 0 0 0 20 120 L15 -15" fill="none" stroke={primaryColor} strokeWidth="1.5" />
              {/* 弯折颈部 */}
              <path d="M-25 -25 Q -30 -30 -15 -15 M25 -25 Q 30 -30 15 -15" fill="none" stroke={secondaryColor} strokeWidth="2" />
              <circle cx="0" cy="60" r="10" fill={primaryColor} fillOpacity="0.2" stroke={secondaryColor} />
            </g>
          )}

          {/* 前列腺弯曲仪 - 独特的符合人体工学曲度 */}
          {equipmentSpecs.typeEn.includes("NODE") && (
            <g transform="scale(1.3) translate(0, 20)" className="animate-[pulse_3s_ease-in-out_infinite]">
              {/* 主弯道 */}
              <path d="M-20 -50 C 40 -60, 50 10, 0 60 C -10 70, -30 70, -30 50 C -30 20, 10 -20, -40 -30 C -50 -35, -30 -50, -20 -50 Z" fill="none" stroke={primaryColor} strokeWidth="2" strokeDasharray="2 4" />
              {/* 会阴辅助刺激点 */}
              <circle cx="-35" cy="-40" r="15" fill="none" stroke={secondaryColor} strokeWidth="1.5" />
              <circle cx="-35" cy="-40" r="8" fill={primaryColor} fillOpacity="0.3" />
              <circle cx="-35" cy="-40" r="2" fill="white" className="animate-ping" />
              {/* 横截面光环 */}
              <ellipse cx="10" cy="5" rx="15" ry="30" transform="rotate(-30 10 5)" fill="none" stroke={primaryColor} strokeWidth="0.5" className="opacity-60" />
            </g>
          )}

          {/* 情侣 C 型共震 - 夹持双向结构 */}
          {equipmentSpecs.typeEn.includes("BRIDGE") && (
            <g transform="scale(1.3) rotate(-15)" className="animate-[pulse_3s_ease-in-out_infinite]">
              {/* C型主干外圈 */}
              <path d="M-10 60 C -60 50, -80 -20, -30 -60 C -10 -75, 20 -70, 30 -50 C -40 -30, -30 30, 10 40 C 20 42, -5 65, -10 60 Z" fill="none" stroke={primaryColor} strokeWidth="2" />
              {/* 内侧震动模块 */}
              <ellipse cx="-45" cy="-5" rx="15" ry="40" fill={primaryColor} fillOpacity="0.2" stroke={primaryColor} strokeWidth="1" strokeDasharray="2 2" />
              {/* 外部震动模块 */}
              <circle cx="20" cy="-55" r="18" fill="none" stroke={secondaryColor} strokeWidth="1.5" />
              <circle cx="20" cy="-55" r="4" fill="white" className="animate-ping" />
              {/* 内部尾部模块 */}
              <ellipse cx="0" cy="50" rx="20" ry="12" fill="none" stroke={primaryColor} strokeWidth="1" className="opacity-60" />
            </g>
          )}

          {/* 活塞飞机杯/非硅胶包裹舱 - 更加机械化、动力腔体化 */}
          {equipmentSpecs.typeEn.includes("ENGINE") && (
            <g transform="rotate(30) scale(1.3)" className="animate-[pulse_3s_ease-in-out_infinite]">
              {/* 外部机械外壳 */}
              <rect x="-40" y="-70" width="80" height="140" rx="15" fill="none" stroke={primaryColor} strokeWidth="2" />
              <path d="M-40 -50 L40 -50 M-40 50 L40 50" stroke={primaryColor} strokeWidth="1.5" strokeDasharray="4 4" />
              {/* 内置活塞纹理 */}
              {[...Array(5)].map((_, i) => (
                <path key={i} d={`M-30 ${-30 + i*15} Q 0 ${-40 + i*15} 30 ${-30 + i*15}`} fill="none" stroke={primaryColor} strokeWidth="1" className="opacity-70" />
              ))}
              {/* 底部马达引擎区 */}
              <circle cx="0" cy="50" r="10" fill={primaryColor} fillOpacity="0.5" />
              <circle cx="0" cy="50" r="2" fill="white" />
              <path d="M-20 70 L 20 70 M-10 80 L 10 80" stroke={secondaryColor} strokeWidth="2" className="opacity-80" />
            </g>
          )}
        </g>

        {/* ========== UI 连线与参数引出线 (模拟 HUD 界面) ========== */}
        {/* 指向材质 */}
        <polyline
          points="220,190 350,190 430,220"
          fill="none"
          stroke={primaryColor}
          strokeWidth="1"
          className="opacity-70"
        />
        <circle cx="430" cy="220" r="2" fill="white" />

        {/* 指向温度 */}
        <polyline
          points="720,180 580,180 500,230"
          fill="none"
          stroke={primaryColor}
          strokeWidth="1"
          className="opacity-70"
        />
        <circle cx="500" cy="230" r="2" fill="white" />

        {/* 指向频率 */}
        <polyline
          points="650,420 540,420 480,330"
          fill="none"
          stroke={primaryColor}
          strokeWidth="1"
          className="opacity-70"
        />
        <circle cx="480" cy="330" r="2" fill="white" />
      </svg>

      {/* 纯 HTML 的文字浮层 */}
      <div className="absolute inset-0 z-20 pointer-events-none p-4 sm:p-8">
        {/* 主型号标题 */}
        <div className="absolute top-6 lg:top-10 left-6 lg:left-12 drop-shadow-md">
          <div className="text-[10px] text-brand-slate-400 mb-1">
            专属感官物理设备蓝图
          </div>
          <div
            className="text-lg sm:text-2xl font-black text-white uppercase tracking-widest"
            style={{ textShadow: `0 0 10px ${primaryColor}` }}
          >
            {equipmentSpecs.typeName}
          </div>
          <div className="text-xs text-brand-slate-500 mt-1 uppercase">
            CLASS: {equipmentSpecs.typeEn}
          </div>
        </div>

        {/* 装甲材质引出框 */}
        <div className="absolute top-[40%] left-4 lg:left-8 transform -translate-y-1/2 max-w-[35%]">
          <div className="text-[10px] text-brand-slate-400 mb-0.5">
            接驳介质 (推荐玩具材质):
          </div>
          <div
            className="text-xs sm:text-sm font-bold text-white tracking-wider"
            style={{ color: primaryColor }}
          >
            {equipmentSpecs.cmfMaterial}
          </div>
        </div>

        {/* 核心温度引出框 */}
        <div className="absolute top-[35%] right-4 lg:right-8 transform -translate-y-1/2 text-right max-w-[35%]">
          <div className="text-[10px] text-brand-slate-400 mb-0.5">
            维生热力学 (推荐加热温度):
          </div>
          <div
            className="text-xs sm:text-lg font-bold text-white tracking-wider"
            style={{ color: secondaryColor }}
          >
            {equipmentSpecs.tempDegree}
          </div>
        </div>

        {/* 曲率频率引出框 */}
        <div className="absolute bottom-6 md:bottom-[15%] right-4 lg:right-8 transform text-right max-w-[40%]">
          <div className="text-[10px] text-brand-slate-400 mb-0.5">
            神经共振频段 (推荐震动频率):
          </div>
          <div
            className="text-xs sm:text-lg font-bold text-white tracking-wider"
            style={{ color: primaryColor }}
          >
            {equipmentSpecs.frequencyStr}
          </div>
        </div>
      </div>
    </div>
  );
};
