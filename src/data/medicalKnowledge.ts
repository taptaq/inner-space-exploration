/**
 * 医学科普知识数据源
 * The static arrays have been removed for production. 
 * Knowledge is now served strictly from the database via /api/knowledge.
 */

export interface ScenarioTip {
  id?: string;
  scenarioId: number;
  icon: string;
  title: string;
  content: string;
  source: string;
}

export type KnowledgeCategory =
  | "psychology"
  | "physiology"
  | "safety"
  | "funfact"
  | string;

export interface KnowledgeCard {
  id: string; 
  cardId: string;
  category: KnowledgeCategory;
  icon: string;
  title: string;
  summary: string;
  detail: string;
  source: string;
  tags: string[];
}

export const categoryLabels: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  psychology: { label: "心理健康", icon: "🧠", color: "brand-cyan" },
  physiology: { label: "生理知识", icon: "🫀", color: "brand-emerald" },
  safety: { label: "安全指南", icon: "🛡️", color: "brand-rose" },
  funfact: { label: "科学冷知识", icon: "💡", color: "brand-amber" },
};
