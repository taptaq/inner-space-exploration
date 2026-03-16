/**
 * 医学科普知识数据源
 * 包含场景关联科普和知识库分类数据
 */

// ─── 场景关联科普（与 scenario 的 5 道题一一对应）───

export interface ScenarioTip {
  scenarioId: number;
  icon: string;
  title: string;
  content: string;
  source: string;
}

export const scenarioTips: ScenarioTip[] = [
  {
    scenarioId: 1,
    icon: "🧠",
    title: "关于身体的防御本能",
    content:
      '当身体感知到陌生接触时，大脑杏仁核会在 0.1 秒内启动"战逃反应"。研究表明，安全感充足的人更容易放松这道本能防线，而这种安全感可以通过渐进式脱敏训练来培养。',
    source: "《神经科学原理》Kandel 等, 2021",
  },
  {
    scenarioId: 2,
    icon: "🌡️",
    title: "温度与感官的秘密",
    content:
      '人体皮肤每平方厘米约有 2-4 个冷觉感受器和 1-2 个热觉感受器。适度的温度刺激（冷或热）会促进内啡肽和催产素的释放，这也是为什么"冰火交替"的体验会让人感到强烈愉悦。',
    source: "Journal of Neurophysiology, 2019",
  },
  {
    scenarioId: 3,
    icon: "📳",
    title: "节奏与神经共振",
    content:
      "人体对 10-50Hz 的振动最为敏感，恰好与体内平滑肌的自然频率重合。与心跳频率（60-80次/分钟）同步的节律性刺激，会显著提升副交感神经兴奋度，促进深层放松和催产素分泌。",
    source: "Frontiers in Neuroscience, 2020",
  },
  {
    scenarioId: 4,
    icon: "🧪",
    title: "好奇心背后的多巴胺",
    content:
      "面对未知时的兴奋感来自大脑伏隔核释放的多巴胺。研究发现，拥有 DRD4-7R 基因变体的人（约占人口 20%）天生对新奇体验更渴望。了解自己的探索倾向，有助于找到最适合自己的舒适边界。",
    source: "Nature Neuroscience, 2018",
  },
  {
    scenarioId: 5,
    icon: "💞",
    title: "依恋风格与亲密需求",
    content:
      "心理学中的依恋理论将人分为安全型（约 56%）、回避型（约 25%）和焦虑型（约 19%）。喜欢独处不代表冷漠，喜欢纠缠也不代表缺爱——它们只是不同的情感充电方式。理解自己的依恋风格，是高质量亲密关系的第一步。",
    source: "Attachment Theory, Bowlby & Ainsworth",
  },
];

// ─── 知识库分类数据 ───

export type KnowledgeCategory =
  | "psychology"
  | "physiology"
  | "safety"
  | "funfact";

export interface KnowledgeCard {
  id: string;
  category: KnowledgeCategory;
  icon: string;
  title: string;
  summary: string;
  detail: string;
  source: string;
  tags: string[];
}

export const categoryLabels: Record<
  KnowledgeCategory,
  { label: string; icon: string; color: string }
> = {
  psychology: { label: "心理健康", icon: "🧠", color: "brand-cyan" },
  physiology: { label: "生理知识", icon: "🫀", color: "brand-emerald" },
  safety: { label: "安全指南", icon: "🛡️", color: "brand-rose" },
  funfact: { label: "科学冷知识", icon: "💡", color: "brand-amber" },
};

export const knowledgeCards: KnowledgeCard[] = [
  // ── 心理健康 ──
  {
    id: "psy-001",
    category: "psychology",
    icon: "🧠",
    title: '什么是"安全词"？它为什么很重要？',
    summary: "安全词是亲密互动中的紧急刹车机制，它保护每个人的身心边界。",
    detail:
      '安全词（Safe Word）是伴侣之间事先约定的特殊暗号，当任何一方在互动中感到不适时，说出安全词即可立刻暂停一切行为。使用安全词不是"扫兴"——它恰恰是信任的最高表现。建议选择日常不会出现在亲密场景中的词汇，如"红灯""菠萝"等。拥有安全词的伴侣关系，反而更能放心地探索彼此的边界。',
    source: "Journal of Sex Research, 2017",
    tags: ["安全词", "信任", "沟通"],
  },
  {
    id: "psy-002",
    category: "psychology",
    icon: "🧠",
    title: "关于「性幻想」：比你想的更正常",
    summary: "超过 97% 的成年人都有过性幻想，它是大脑的正常创造性活动。",
    detail:
      "Justin Lehmiller 博士在对 4,000+ 美国成年人的调查中发现，超过 97% 的人承认有过性幻想，且内容极为多样。幻想不等于行动意愿——大脑的想象系统和行为决策系统是分离的。过度压抑幻想反而可能增加心理压力。健康的方式是：承认它、理解它，然后自主选择是否及如何在安全边界内探索。",
    source: "Tell Me What You Want, J. Lehmiller, 2018",
    tags: ["性幻想", "心理健康", "正常化"],
  },
  {
    id: "psy-003",
    category: "psychology",
    icon: "🧠",
    title: '亲密关系中的"心流状态"',
    summary:
      '高质量的亲密体验其实是一种"心流"——全神贯注、忘记时间的深度沉浸。',
    detail:
      '心理学家 Csikszentmihalyi 提出的"心流"理论同样适用于亲密关系。当双方都处于舒适且略有挑战的状态时，大脑会进入 α 波主导的放松-专注模式，多巴胺、催产素和内啡肽同时释放，时间感知模糊，自我意识暂时消融。这就是为什么"不急不赶、节奏对了"的体验往往最深刻——你需要的不是更强的刺激，而是更好的同频。',
    source: "Flow, M. Csikszentmihalyi, 1990",
    tags: ["心流", "专注", "同频"],
  },

  // ── 生理知识 ──
  {
    id: "phy-001",
    category: "physiology",
    icon: "🫀",
    title: "你的身体其实是一架精密乐器",
    summary:
      "人体有超过 7,000 个神经末梢分布在敏感区域，它们对不同刺激的响应截然不同。",
    detail:
      '人体最敏感的区域包含大量的迈斯纳小体（对轻触敏感）和帕奇尼小体（对振动和压力敏感）。有趣的是，这些感受器对"变化"比对"强度"更敏感——这意味着持续加大力度不如变换节奏和方式更容易引发愉悦感。就像音乐需要旋律起伏，身体也需要刺激的"乐章"。',
    source: "《人体生理学》Guyton & Hall, 2020",
    tags: ["神经末梢", "触觉", "振动"],
  },
  {
    id: "phy-002",
    category: "physiology",
    icon: "🫀",
    title: '催产素：不只是"爱情激素"',
    summary:
      "催产素在拥抱、抚触、亲密接触时大量分泌，它降低压力、增强信任感。",
    detail:
      '催产素（Oxytocin）被称为"拥抱激素"。研究显示，仅仅 20 秒的深度拥抱就能显著提升体内催产素水平，同时降低皮质醇（压力激素）。它不仅在亲密接触时释放，也在母乳喂养、与宠物互动、深度对话时产生。催产素还能增强痛觉阈值——这就是为什么在亲密时刻，你对轻微疼痛的耐受度会提高。',
    source: "Psychoneuroendocrinology, 2019",
    tags: ["催产素", "激素", "拥抱"],
  },
  {
    id: "phy-003",
    category: "physiology",
    icon: "🫀",
    title: "盆底肌：被严重低估的核心肌群",
    summary:
      "盆底肌不仅影响排尿功能，还与感官敏感度和体验质量直接相关。",
    detail:
      "盆底肌（PC 肌）是一组从耻骨延伸到尾骨的肌肉群。规律的凯格尔运动（每天 3 组，每组 10-15 次收缩-放松）可以在 4-6 周内显著增强盆底肌力量。强健的盆底肌不仅能预防尿失禁，还能提升局部血液循环和神经敏感度，对男性和女性的感官体验都有显著正向影响。",
    source: "British Journal of Sports Medicine, 2018",
    tags: ["盆底肌", "凯格尔", "锻炼"],
  },

  // ── 安全指南 ──
  {
    id: "saf-001",
    category: "safety",
    icon: "🛡️",
    title: "硅胶 vs 其他材质：选对材料保护自己",
    summary:
      '医用级硅胶是最安全的材质选择，认准"医用级"或"食品级"标识。',
    detail:
      '市面上常见的材质包括硅胶、TPE、ABS 塑料和金属。其中医用级硅胶（Medical-grade Silicone）是公认最安全的选择：无毒、无孔、耐高温消毒、不会滋生细菌。TPE 材质虽然柔软度更高，但它是多孔材料，即使清洗后仍可能残留细菌，建议搭配安全套使用。购买时认准正规品牌，避免"三无"产品。',
    source: "FDA Material Safety Guidelines",
    tags: ["材质安全", "硅胶", "卫生"],
  },
  {
    id: "saf-002",
    category: "safety",
    icon: "🛡️",
    title: "润滑剂的正确选择方法",
    summary: "水基润滑剂是最百搭的选择，但不同场景适合不同类型。",
    detail:
      "润滑剂主要分三类：水基（Water-based）——最百搭，兼容所有材质和安全套，但需补涂；硅基（Silicone-based）——持久度高、防水，但不可与硅胶制品同时使用（会腐蚀表面）；油基（Oil-based）——丝滑度最高，但会破坏乳胶安全套。关键原则：不要用任何日用品（如凡士林、婴儿油、沐浴露）替代专用润滑剂，它们可能破坏微生态平衡。",
    source: "WHO Sexual Health Guidelines, 2021",
    tags: ["润滑剂", "水基", "安全"],
  },
  {
    id: "saf-003",
    category: "safety",
    icon: "🛡️",
    title: "清洁消毒：每次使用前后的必修课",
    summary: "正确的清洁方式能有效预防感染，延长产品寿命。",
    detail:
      "使用前后都应清洁：用温水 + 专用清洁液（或温和的中性肥皂）冲洗，避免使用酒精或强碱性清洁剂。硅胶材质可以用沸水煮 3-5 分钟消毒。存放时确保完全干燥，放在专用收纳袋中，避免不同材质直接接触（可能发生化学反应）。建议每 3-6 个月检查一次是否有裂纹或变色，及时更换。",
    source: "CDC Infection Prevention Guidelines",
    tags: ["清洁", "消毒", "卫生"],
  },

  // ── 科学冷知识 ──
  {
    id: "fun-001",
    category: "funfact",
    icon: "💡",
    title: '大脑是最大的"性器官"',
    summary:
      "你的大脑处理愉悦感的区域，和处理巧克力、音乐愉悦的是同一个区域。",
    detail:
      'fMRI 研究显示，亲密愉悦激活的大脑区域包括伏隔核、前扣带回和眶额皮层——这些区域同样会被美食、音乐和社交奖赏激活。这意味着"愉悦"在神经层面是统一的。有趣的是，仅仅通过想象，就能激活约 30% 的相同神经回路，这也是为什么"前戏"从心理层面就已经开始了。',
    source: "NeuroImage, 2017",
    tags: ["大脑", "愉悦", "神经科学"],
  },
  {
    id: "fun-002",
    category: "funfact",
    icon: "💡",
    title: '人类是唯一会"面对面"的灵长类动物',
    summary: "这个行为与人类独特的社交大脑和催产素系统高度相关。",
    detail:
      "在所有灵长类动物中，人类是唯一广泛采用面对面姿势的物种。进化心理学认为这与人类高度发达的社交认知有关：面对面交流眼神、表情和呼吸节奏，能最大限度激活镜像神经元系统和催产素释放回路，从而增强情感联结。眼神交流在此过程中尤为重要——研究表明，持续 2 秒以上的对视就能显著提升亲密感。",
    source: "Evolutionary Psychology, 2016",
    tags: ["进化", "面对面", "社交"],
  },
  {
    id: "fun-003",
    category: "funfact",
    icon: "💡",
    title: "气味比外貌更影响吸引力",
    summary:
      '人类通过嗅觉下意识判断免疫系统兼容性——"闻对了"比"看对了"更靠谱。',
    detail:
      '著名的"T恤实验"（MHC 研究）发现，人们倾向于被免疫系统基因（MHC/HLA）与自己差异最大的异性气味所吸引。这是进化的智慧：差异越大的免疫基因组合，后代的免疫力越强。这也解释了为什么有些人"说不清哪里好，但就是觉得 TA 闻起来特别舒服"——你的鼻子在替你做基因筛选。',
    source: "Proceedings of the Royal Society B, 1995",
    tags: ["气味", "吸引力", "MHC"],
  },
];

// ─── 根据用户参数获取个性化蓝图科普 ───

export function getPersonalizedTips(params: {
  defenseLevel: number;
  tempPreference: string;
  rhythmPerception: number;
}): KnowledgeCard[] {
  const tips: KnowledgeCard[] = [];

  // 根据防线等级推荐心理健康内容
  if (params.defenseLevel > 60) {
    tips.push(knowledgeCards.find((c) => c.id === "psy-001")!);
  } else {
    tips.push(knowledgeCards.find((c) => c.id === "psy-003")!);
  }

  // 根据温度偏好推荐生理知识
  if (params.tempPreference === "极寒" || params.tempPreference === "熔毁") {
    tips.push(knowledgeCards.find((c) => c.id === "phy-002")!);
  } else {
    tips.push(knowledgeCards.find((c) => c.id === "phy-001")!);
  }

  // 根据节奏感知推荐一条冷知识
  if (params.rhythmPerception > 50) {
    tips.push(knowledgeCards.find((c) => c.id === "fun-001")!);
  } else {
    tips.push(knowledgeCards.find((c) => c.id === "fun-002")!);
  }

  return tips;
}
