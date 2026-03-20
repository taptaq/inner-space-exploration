import { AgentPayload } from "@/types/agent";

export type TitleRarity = "N" | "R" | "SR" | "SSR";

export interface StarshipTitle {
  title: string;
  rarity: TitleRarity;
  description: string;
}

export function generateStarshipTitle(payload: AgentPayload): StarshipTitle {
  const { defenseLevel, tempPreference, rhythmPerception } = payload;
  
  // SSR Conditions (Extreme values)
  if (defenseLevel >= 90 && tempPreference.includes("极寒")) {
    return { title: "深空凛冬的守望者", rarity: "SSR", description: "你包裹着坚冰，只是为了保护内心最柔软的星核。" };
  }
  if (defenseLevel <= 10 && tempPreference.includes("熔毁")) {
    return { title: "拥抱星尘的赤子", rarity: "SSR", description: "你毫无防备地燃烧，用最极具力量的温暖照亮别人。" };
  }
  
  // SR Conditions
  if (rhythmPerception >= 85) {
    return { title: "乘波而行的追星者", rarity: "SR", description: "你总是敏锐地捕捉每一片星云的律动，热烈而鲜活。" };
  }
  if (rhythmPerception <= 15) {
    return { title: "时间停滞的安息地", rarity: "SR", description: "在你的轨道里，一切焦虑都可以被温柔地放慢。" };
  }
  if (defenseLevel >= 80) {
    return { title: "温柔的静默堡垒", rarity: "SR", description: "你竖起高墙，是在等待那个愿意耐心解开密码的灵魂。" };
  }
  if (defenseLevel <= 20) {
    return { title: "无界的宇宙共鸣", rarity: "SR", description: "你向全宇宙敞开怀抱，随时准备接纳另一个孤独的漂流者。" };
  }
  
  // R Conditions
  if (tempPreference.includes("冷静")) {
    return { title: "清冷理智的领航灯", rarity: "R", description: "在混乱的星系中，你用清明且坚定的理智为他人引航。" };
  }
  if (tempPreference.includes("温热")) {
    return { title: "恒星级治愈庇护所", rarity: "R", description: "你散发着和煦的光和热，是深空中最让人安心的停靠点。" };
  }
  
  // N Conditions (Default/Balanced)
  return { title: "宁静的深空观测者", rarity: "N", description: "你静静地在轨道上运行，温柔地包容着这浩瀚宇宙的一切。" };
}
