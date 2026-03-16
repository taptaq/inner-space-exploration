export type TempPreference = "极寒" | "冷静" | "恒温" | "温热" | "熔毁";

export interface AgentPayload {
  /**
   * 心理防线阈值 (0-100)
   * 0: 完全开放; 100: 绝对封闭
   */
  defenseLevel: number;
  
  /**
   * 感官温度偏好
   */
  tempPreference: TempPreference;
  
  /**
   * 物理交互节奏频率 (10-100Hz 隐喻)
   * 10: 极致舒展; 100: 高频压迫
   */
  rhythmPerception: number;
  
  /**
   * 隐性诉求 (未经结构化的深空信号)
   */
  hiddenNeed: string;
}

export interface AgentState extends AgentPayload {
  setDefenseLevel: (level: number) => void;
  setTempPreference: (pref: TempPreference) => void;
  setRhythmPerception: (rhythm: number) => void;
  setHiddenNeed: (need: string) => void;
  /**
   * 将当前状态剥离出行为函数，序列化为纯数据载体，准备送入失重舱（Phase 2）
   */
  getSerializedPayload: () => AgentPayload;
}
