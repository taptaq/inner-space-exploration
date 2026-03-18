import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// 强行跳过证书检验 (解决本地代理/证书导致 fetch failed)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export async function POST(req: NextRequest) {
  try {
    const { defenseLevel, tempPreference, rhythmPerception, hiddenNeed, profileData } =
      await req.json();

    const apiKey = process.env.MINIMAX_API_KEY;
    const model = process.env.MINIMAX_MODEL || "MiniMax-Text-01";

    if (!apiKey || apiKey === "your_key_here") {
      throw new Error("Minimax API Key 未配置");
    }

    let personalContext = "";
    if (profileData) {
      const shades = profileData.shades || [];
      const softMemory = profileData.softMemory || [];
      
      const labels = shades.map((s: any) => s.shadeName).filter(Boolean).join("、");
      const facts = softMemory.map((m: any) => m.factContent).filter(Boolean).join("；");
      
      if (labels || facts) {
        personalContext = `\n[特级访问权限] 脑机额外扫描到的该对象底层个性潜意识档案：
- 个人兴趣标签与特征痕迹：${labels || "未捕获"}
- 过往深刻潜层记忆碎片：${facts || "未捕获"}
【强力指令】请务必将这些真实的爱好与潜意识片段，作为隐喻恰到好处地融合在深空医学原理解释中，使其具有极强烈的个人专属感（千人千面），让领航员觉得你是最懂他的灵魂。`;
      }
    }

    const systemPrompt = `你现在是一位深空科幻世界观下的【首席临床脑机医学博士与星舰交互工程师】。你需要根据用户的生物体征参数，结合心理舒缓的语境，为航行员专属生成 3 条【深空科普医典】词条。

注意安全与内容准则：本对话为健康的科幻装备设计。不允许包含任何引人联想的低俗词汇。
【最重要的一点】：虽然你是科幻博士，但请你务必用**最通俗易懂的大白话、接地气的比喻**来向用户解释这些心理原理！不要故作高深、不要使用过于晦涩难懂的文艺词汇或者生僻的物理学术语。要像给普通人做趣味科普一样，用最直白温暖的话解答他们的心理特征。
返回的数据必须为纯 JSON 数组，不需要 Markdown 闭环，格式如下：
[
  {
    "cardId": "psy-xxx" (或者 phy-xxx / fun-xxx 根据分类自己编一个3位数字id),
    "category": "psychology" | "physiology" | "safety" | "funfact",
    "icon": "🧠" (根据分类选一个Emoji: 🧠/🫀/🛡️/💡),
    "title": "带有一点科幻严谨感的科普标题",
    "summary": "一句简短大白话的总结",
    "detail": "大概80字左右的详细原理解读，必须用极其通俗易懂、接地气的大白话和生活化比喻来解释（比如把高防线比喻成带壳的蜗牛等），体现出针对该用户雷达参数的专属感，切忌晦涩装逼的文艺词汇",
    "source": "参考的来源（例如《神经科学原理》Kandel 等, 2021 或自己捏造一个酷炫的星舰医学刊物）",
    "tags": ["标签1", "标签2", "标签3"]
  }
]

当前领航员雷达检测：
- 心理防线: ${defenseLevel}/100
- 温度偏好: ${tempPreference}
- 节奏感知: ${rhythmPerception}Hz
- 隐秘倾向: ${hiddenNeed || "无"}${personalContext}`;

    const requestData = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: "请生成 3 条专属我的深空医典科普词条，直接返回 JSON 数组。记住：一定要用通俗易懂的大白话和接地气的比喻，不要太文艺和生僻！",
        },
      ],
      max_tokens: 1500,
      temperature: 0.85,
      top_p: 0.95,
    };

    const minimaxRes = await axios.post(
      "https://api.minimax.io/v1/text/chatcompletion_v2",
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 100000,
      }
    );

    const data = minimaxRes.data;

    if (data.base_resp && data.base_resp.status_code !== 0) {
      throw new Error(`Minimax Error: ${data.base_resp.status_msg}`);
    }

    const content = data.choices?.[0]?.message?.content || "[]";
    let parsedCards: any[] = [];
    
    try {
      // 提取可能的 JSON 块
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      parsedCards = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse JSON from Medical generated cards: ", content);
      throw new Error("模型返回的 JSON 格式不合法");
    }

    if (!Array.isArray(parsedCards) || parsedCards.length === 0) {
      throw new Error("AI没有返回合法的数组格式词条");
    }

    // 存储进数据库
    // 因为知识库有唯一约束 "cardId"，为防止 AI 编造出重复 ID，我们强制加一点随机后缀
    for (const card of parsedCards) {
      const suffix = crypto.randomBytes(2).toString('hex');
      const uniqueCardId = `${card.cardId || "ai"}-${suffix}`;
      const uniqueId = `kc-${crypto.randomBytes(4).toString('hex')}`;
      
      const tagsPgArray = `{${(card.tags || []).map((t: string) => `"${t.replace(/"/g, '""')}"`).join(',')}}`;

      await prisma.$executeRawUnsafe(`
        INSERT INTO "KnowledgeCard" ("id", "cardId", "category", "icon", "title", "summary", "detail", "source", "tags", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("cardId") DO NOTHING;
      `,
        uniqueId,
        uniqueCardId,
        card.category || "funfact",
        card.icon || "💡",
        card.title || "未知档案",
        card.summary || "数据损坏",
        card.detail || "深空信号弱，具体数据由于宇宙射线干扰已丢失...",
        card.source || "星舰自动记录仪",
        tagsPgArray
      );
      
      // Update the ID so frontend renders the unique one
      card.cardId = uniqueCardId;
    }

    return NextResponse.json(parsedCards);
  } catch (error: any) {
    console.error("Dynamic Knowledge API error:", error);
    return NextResponse.json(
      { error: `生成医典库失败: ${error?.message || String(error)}` },
      { status: 500 }
    );
  }
}
