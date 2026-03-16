import { AgentPayload } from "@/types/agent";

const TEMP_OPTIONS = ["极寒", "冷静", "恒温", "温热", "熔毁"] as const;

/**
 * 根据用户参数生成互补的虚拟异星灵魂参数
 */
export function generatePartnerParams(user: AgentPayload): AgentPayload {
  // 防线互补：用户高防 → 对方低防，反之亦然
  const partnerDefense = Math.max(
    10,
    Math.min(95, 100 - user.defenseLevel + (Math.random() * 20 - 10)),
  );

  // 温度互补：在温度谱上取偏移值
  const userTempIdx = TEMP_OPTIONS.indexOf(user.tempPreference as any);
  const partnerTempIdx = Math.max(
    0,
    Math.min(4, 4 - userTempIdx + Math.floor(Math.random() * 2 - 0.5)),
  );
  const partnerTemp = TEMP_OPTIONS[partnerTempIdx];

  // 节奏互补：用户快 → 对方偏慢，但不完全对立
  const partnerRhythm = Math.max(
    15,
    Math.min(95, 100 - user.rhythmPerception + (Math.random() * 30 - 15)),
  );

  // 隐秘需求生成
  const hiddenNeeds = [
    "渴望被彻底理解却不用开口",
    "想要在极度安全中体验一点点失控",
    "希望被温柔地捆绑住所有不安",
    "想找一个能和自己安静共处的同类",
    "需要一个敢对自己坦白一切的人",
    "想在信任中交出控制权",
  ];
  const partnerHidden =
    hiddenNeeds[Math.floor(Math.random() * hiddenNeeds.length)];

  return {
    defenseLevel: Math.round(partnerDefense),
    tempPreference: partnerTemp,
    rhythmPerception: Math.round(partnerRhythm),
    hiddenNeed: partnerHidden,
  };
}

/**
 * 将参数转化为 AI 角色人格描述 prompt
 */
export function buildPersona(
  params: AgentPayload,
  role: "self" | "partner",
): string {
  const defenseDesc =
    params.defenseLevel > 70
      ? "内心筑有高墙，不轻易敞开自己，但一旦信任就会全身心投入"
      : params.defenseLevel > 40
        ? "有一定的防备心，但愿意在试探中慢慢打开"
        : "天性开放包容，喜欢直球表达，对亲密接触没有太多防线";

  const tempDesc =
    params.tempPreference === "极寒" || params.tempPreference === "冷静"
      ? "偏好冷冽清醒的体感刺激，喜欢那种让人起鸡皮疙瘩的寒意"
      : params.tempPreference === "恒温"
        ? "喜欢温暖恒定的安全感，不需要太极端的刺激"
        : "渴望灼热逼近的温度，喜欢那种烧到边界融化的感觉";

  const rhythmDesc =
    params.rhythmPerception > 70
      ? "偏好快节奏、密集的冲击感，不给自己喘息的空间"
      : params.rhythmPerception > 40
        ? "喜欢有起伏的节奏变化，在快与慢之间切换"
        : "偏好缓慢绵长的节奏，享受每一秒的感知";

  const roleName = role === "self" ? "本我领航员" : "异星灵魂";
  const emoji = role === "self" ? "🧑‍🚀" : "👽";

  return `你是"${roleName}"（${emoji}），以下是你的内在画像：
- 防线韧性 ${params.defenseLevel}/100：${defenseDesc}
- 温度偏好「${params.tempPreference}」：${tempDesc}
- 节奏感知 ${params.rhythmPerception}/100：${rhythmDesc}
- 隐秘需求："${params.hiddenNeed}"

你的说话风格：${
    role === "self"
      ? "真诚、略带防备、用第一人称表达内心感受"
      : "神秘、温柔而直接、偶尔带一点挑逗性的坦白"
  }

重要规则：
- 每次发言控制在 50-80 字以内
- 用口语化的中文交流，不要太正式
- 要围绕亲密关系、身体感受、边界探索等话题
- 对话中要展现你的参数特质，但不要直接说数字
- 要有真实的情绪和个人观点`;
}

/**
 * 计算两组参数的契合度百分比
 */
export function calculateCompatibility(
  a: AgentPayload,
  b: AgentPayload,
): number {
  // 互补度计算：差异大反而更兼容（异性相吸逻辑）
  const defenseDiff = Math.abs(a.defenseLevel - b.defenseLevel);
  const defenseScore = defenseDiff > 30 ? 90 + Math.random() * 8 : 70 + defenseDiff;

  const tempIdx = (t: string) =>
    TEMP_OPTIONS.indexOf(t as any) === -1 ? 2 : TEMP_OPTIONS.indexOf(t as any);
  const tempDiff = Math.abs(tempIdx(a.tempPreference) - tempIdx(b.tempPreference));
  const tempScore = tempDiff >= 2 ? 85 + Math.random() * 10 : 70 + tempDiff * 10;

  const rhythmDiff = Math.abs(a.rhythmPerception - b.rhythmPerception);
  const rhythmScore = rhythmDiff > 25 ? 88 + Math.random() * 9 : 72 + rhythmDiff;

  const avg = (defenseScore + tempScore + rhythmScore) / 3;
  return Math.min(99.9, Math.max(75, Math.round(avg * 10) / 10));
}

/**
 * 生成对话系统 prompt
 */
export function buildSystemPrompt(
  selfPersona: string,
  partnerPersona: string,
  speakingRole: "self" | "partner",
): string {
  const currentPersona =
    speakingRole === "self" ? selfPersona : partnerPersona;
  const otherPersona =
    speakingRole === "self" ? partnerPersona : selfPersona;

  return `你正在参与一场深空灵魂配对对话实验。

${currentPersona}

你的对话对象是：
${otherPersona}

你们刚刚被深空匹配系统配对在一起。这是你们的第一次接触。请以你的角色身份自然地对话。

对话规则：
1. 每次回复只说 1-2 句话（50-80 字），像真实微信聊天
2. 要有真实感情，不是在背台词
3. 可以大胆表达对对方的好奇和感受
4. 围绕亲密话题、身体边界、感官偏好自然展开
5. 不要总是附和，要展现自己的个性和偏好
6. 只输出对话内容本身，不要加引号或角色标签`;
}
