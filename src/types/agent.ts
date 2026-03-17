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

  /**
   * 外接的 SecondMe 用户资料（可选）
   */
  profileData?: ProfileData | null;

  /**
   * 外接的 SecondMe 推荐匹配用户（可选）
   */
  recommendedPartner?: RecommendedUser;

  /**
   * 缓存探测到的所有的其他用户列表
   */
  discoverUsers?: RecommendedUser[];

  /**
   * 计算出的最佳匹配用户（用于前置匹配结果）
   */
  bestMatchUser?: RecommendedUser | null;

  /**
   * 最佳匹配用户的契合度分数
   */
  bestMatchScore?: number;
}

export interface RecommendedUser {
  username: string;
  route: string;
  matchScore: number;
  title: string;
  hook: string;
  briefIntroduction: string;
}

export interface ProfileData {
  info: {
    userId: string;
    name: string;
    bio: string;
    selfIntroduction: string;
  };
  shades: Array<{
    shadeName: string;
    shadeDescription: string;
    shadeContent: string;
  }>;
  softMemory: Array<{
    factObject: string;
    factContent: string;
  }>;
}

export interface AgentState extends AgentPayload {
  setDefenseLevel: (level: number) => void;
  setTempPreference: (pref: TempPreference) => void;
  setRhythmPerception: (rhythm: number) => void;
  setHiddenNeed: (need: string) => void;
  setProfileData: (data: ProfileData | null) => void;
  setDiscoverUsers: (users: RecommendedUser[]) => void;
  setBestMatchUser: (user: RecommendedUser | null) => void;
  setBestMatchScore: (score: number) => void;
  /**
   * 将当前状态剥离出行为函数，序列化为纯数据载体，准备送入失重舱（Phase 2）
   */
  getSerializedPayload: () => AgentPayload;
}
