import { create } from "zustand";
import { AgentState, AgentPayload } from "@/types/agent";

export const useAgentStore = create<AgentState>((set, get) => ({
  // --- 默认脱敏初始值设定 ---
  defenseLevel: 80, // 初始默认偏向高防线
  tempPreference: "冷静",
  rhythmPerception: 40,
  hiddenNeed: "",
  profileData: null,
  discoverUsers: [],
  bestMatchUser: null,
  bestMatchScore: 0,
  matchReason: undefined,

  // --- 状态突变接口 ---
  setDefenseLevel: (level) => set({ defenseLevel: level }),
  setTempPreference: (pref) => set({ tempPreference: pref }),
  setRhythmPerception: (rhythm) => set({ rhythmPerception: rhythm }),
  setHiddenNeed: (need) => set({ hiddenNeed: need }),
  setProfileData: (data) => set({ profileData: data }),
  setDiscoverUsers: (users) => set({ discoverUsers: users }),
  setBestMatchUser: (user) => set({ bestMatchUser: user }),
  setBestMatchScore: (score) => set({ bestMatchScore: score }),
  setMatchReason: (reason) => set({ matchReason: reason }),

  // --- 核心序列化与输出 ---
  getSerializedPayload: (): AgentPayload => {
    const {
      defenseLevel,
      tempPreference,
      rhythmPerception,
      hiddenNeed,
      profileData,
      discoverUsers,
      bestMatchUser,
      bestMatchScore,
      matchReason,
    } = get();
    return {
      defenseLevel,
      tempPreference,
      rhythmPerception,
      hiddenNeed,
      profileData: profileData || undefined,
      discoverUsers,
      bestMatchUser,
      bestMatchScore,
      matchReason,
    };
  },
}));
