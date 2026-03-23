const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  const allCards = await prisma.knowledgeCard.findMany({
    orderBy: { createdAt: "desc" },
  });

  const groupedCards = allCards.reduce((acc, card) => {
    acc[card.category] = acc[card.category] || [];
    acc[card.category].push(card);
    return acc;
  }, {});

  const apiKey = process.env.MINIMAX_API_KEY;
  const model = process.env.MINIMAX_MODEL || "MiniMax-M2.5-highspeed";

  let totalDeleted = 0;
  let totalInserted = 0;

  for (const category of Object.keys(groupedCards)) {
    const cardsInCategory = groupedCards[category];
    if (cardsInCategory.length < 5) continue;

    console.log(`\n=== Processing [${category}] - ${cardsInCategory.length} cards ===`);

    const chunkSize = 20;
    for (let i = 0; i < cardsInCategory.length; i += chunkSize) {
      const chunk = cardsInCategory.slice(i, i + chunkSize);
      
      if (chunk.length < 3) continue;

      const systemPrompt = `你现在是一位星舰"深空医典档案馆"的首席数据压缩专家与心理馆长。
你的任务是对随着用户递增而产生的大量相似冗余的医疗/心理卡片进行梳理合并、去重提炼。
你将收到一组属于同一分类[${category}]下的深空医典科普卡片数据（JSON）。这里面由于经常为不同航行员单次生成，可能存在许多描述相近、骨架重合重叠的词条。
请你仔细阅读这些卡片，找出所有概念相似的卡片，将它们【合并并重写】为少数几张更高浓缩度的"精品分类全景体验卡"。如果某些卡片是独一无二的冷门生理知识，请独立保留。

【压缩合并指标】：
若输入 10-20 张卡片，你需要将其压缩成 3-5 张最核心、最普适的归纳档案卡。必须实现数量的大幅缩减！

【最高安全指令：保留科幻严谨感与通俗比喻】
务必保留原卡片中接地气的大白话和精妙的生活化比喻，保持温暖、科学、不晦涩的口吻。

【极其重要的 JSON 格式要求】：
绝不能在任何内容字段中使用英文双引号（"）以免破坏结构！如需引用，一律使用全角中文双/单引号（「」或『』）。

你需要返回严格的纯 JSON 数组，格式如下（完全对应原表结构）：
[
  {
    "cardId": "你的3位字母-3位数字ID示例",
    "category": "${category}",
    "icon": "🧠/🫀/🛡️/💡 等原样保留代表性Emoji即可",
    "title": "高度概括提炼的精华标题",
    "summary": "重写后的简短浓缩总结(限制20字)",
    "detail": "合并去重后精心重撰的详解解答，大约80字，保留生动温暖的比喻体系",
    "source": "深空医学档案馆编撰",
    "tags": ["合并重铸标签1", "标签2"]
  }
]`;

      const requestData = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `请合并并精华提炼以下深空医典词条数据（共 ${chunk.length} 张）：\n${JSON.stringify(
              chunk.map((c) => ({
                title: c.title,
                summary: c.summary,
                detail: c.detail,
                tags: c.tags,
              })),
              null,
              2
            )}\n\n直接返回压缩去重后全新的更少的 JSON 数组。`,
          },
        ],
        max_tokens: 4000,
        temperature: 0.2,
        top_p: 0.95,
      };

      try {
        console.log(`Sending chunk ${Math.floor(i/chunkSize)+1} size: ${chunk.length}...`);
        const minimaxRes = await axios.post(
          "https://api.minimax.io/v1/text/chatcompletion_v2",
          requestData,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 55000,
          }
        );

        const data = minimaxRes.data;
        if (data.base_resp && data.base_resp.status_code !== 0) {
          console.error(
            `Minimax Error for category ${category} chunk:`,
            data.base_resp.status_msg
          );
          continue;
        }

        const content = data.choices?.[0]?.message?.content || "[]";
        let parsedCards = [];

        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/) || content.match(/\{[\s\S]*\}/);
          let jsonStr = jsonMatch ? jsonMatch[0] : content;
          jsonStr = jsonStr.replace(/```json/gi, "").replace(/```/g, "").trim();
          parsedCards = JSON.parse(jsonStr);
        } catch (e) {
          console.error(`Failed to parse AI JSON for category ${category}:`, content);
          continue;
        }

        if (
          Array.isArray(parsedCards) &&
          parsedCards.length > 0 &&
          parsedCards.length < chunk.length
        ) {
          const oldIds = chunk.map((c) => c.id);

          const newCardsToInsert = parsedCards.map((card) => {
            const suffix = crypto.randomBytes(2).toString("hex");
            const uniqueCardId = `${card.cardId || category.substring(0, 3)}-${suffix}`;
            return {
              id: `kc-merged-${crypto.randomBytes(4).toString("hex")}`,
              cardId: uniqueCardId,
              category: category,
              icon: card.icon || "💡",
              title: card.title || "归档档案",
              summary: card.summary || "档案馆合并数据",
              detail: card.detail || "核心特征的综合体现...",
              source: card.source || "深空医学档案馆",
              tags: card.tags || [],
            };
          });

          await prisma.$transaction([
            prisma.knowledgeCard.deleteMany({
              where: { id: { in: oldIds } },
            }),
            prisma.knowledgeCard.createMany({
              data: newCardsToInsert,
              skipDuplicates: true,
            }),
            prisma.knowledgeCleanupLog.create({
              data: {
                category: category,
                deletedCount: oldIds.length,
                insertedCount: newCardsToInsert.length,
                deletedCardIds: chunk.map((c) => c.cardId),
                insertedCardIds: newCardsToInsert.map(c => c.cardId),
              }
            })
          ]);

          totalDeleted += oldIds.length;
          totalInserted += newCardsToInsert.length;
          console.log(
            `[Success] ${category} chunk | Deleted: ${oldIds.length} -> Inserted: ${newCardsToInsert.length}`
          );
        } else {
           console.log(`[Skipped] ${category} chunk | Origin: ${chunk.length}, Parsed: ${parsedCards?parsedCards.length:0}. Threshold unsatisfied or no compression achieved.`);
        }
      } catch (err) {
        if(err.response) {
            console.error(`[Error] HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`);
        } else {
            console.error(`[Error] ${err.message}`);
        }
      }
    } 
  }

  console.log(`\n=== DONE ===`);
  console.log(`Total Deleted: ${totalDeleted}, Total Inserted: ${totalInserted}`);
}

main().finally(() => prisma.$disconnect());
