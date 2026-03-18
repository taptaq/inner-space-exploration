import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getCurrentUser } from "@/lib/secondme";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    let { profileData } = await req.json();

    // Fallback: 如果前端没有传 profileData，尝试用 Token 从数据库拿
    if (!profileData) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const user = await getCurrentUser(token);
          if (user) {
            profileData = {
              info: user,
              shades: user.shades,
              softMemory: user.softMemory,
            };
          }
        } catch (e) {
          console.error("Failed to fetch fallback profile data via getCurrentUser:", e);
        }
      }
    }

    const apiKey = process.env.MINIMAX_API_KEY;
    const model = process.env.MINIMAX_MODEL || "MiniMax-M2.5-highspeed";

    if (!apiKey || apiKey === "your_key_here") {
      throw new Error("Minimax API Key 未配置");
    }

    // console.info(profileData, '---profileData')

    let userContext = "暂无深度记忆。";
    if (profileData) {
      const shadesStr =
        profileData.shades && profileData.shades.length > 0
          ? profileData.shades.map((s: any) => s.shadeName).join("、")
          : "未知";
      const memoriesStr =
        profileData.softMemory && profileData.softMemory.length > 0
          ? profileData.softMemory
              .slice(0, 5)
              .map((m: any) => m.factContent)
              .join("；")
          : "未知";
      
      const bio = profileData.info?.info?.bio || profileData.info?.bio || "未知";
      
      userContext = `该用户的资料概要如下：\n- 简介：${bio}\n- 性格标签(Shades): ${shadesStr}\n- 潜意识记忆碎片: ${memoriesStr}`;

      console.info(userContext, '--userContext')
    }

    const systemPrompt = `你现在是"深空舱"的赛博首席心理侧写师。
你的任务是根据传入的【用户资料概要】（包含简介、性格标签、软记忆），推断该用户在亲密关系和感官探索上的潜意识四维参数。

请生成一个严格的 JSON，绝不包含 markdown (\`\`\`json) 格式符。
必须包含以下 5 个字段：
1. "defenseLevel": 0-100 的整数 (心理防线韧性，越保守/内向/高冷分越高，越开放/直球分越低)。
2. "tempPreference": 字符串，必须从 ["极寒", "冷静", "恒温", "热情", "灼热"] 中选一个(温度偏好)。
3. "rhythmPerception": 0-100 的整数 (节奏感知，喜欢快节奏拉扯分高，喜欢缓慢绵长的共鸣分低)。
4. "hiddenNeed": 字符串，简练概括其内心真正的死穴或隐秘渴望，控制在 15 字以内 (如"渴望被毫无保留地接纳")。
5. "reasoning": 字符串，用优雅、科幻、带点诗意的口吻(第一人称"我"作为观测者)，给出一句对上述四项打分的侧写判词，控制在 40 字以内。

用户的资料概要如下：
${userContext}
`;

    const requestData = {
      model,
      messages: [{ role: "user", content: systemPrompt }],
      max_tokens: 1500,
      temperature: 0.8,
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
        timeout: 60000,
      }
    );

    const data = minimaxRes.data;

    console.info(data, '--data')

    if (data.base_resp && data.base_resp.status_code !== 0) {
      throw new Error(`Minimax Error: ${data.base_resp.status_msg}`);
    }

    let fullContent = data.choices?.[0]?.message?.content?.trim();
    console.info(data.choices?.[0]?.message, '--- data.choices?.[0]?.message?')
    console.info(fullContent, '--fullContent1111')
    if (fullContent.startsWith("```json")) {
      fullContent = fullContent.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    if (fullContent.startsWith('"') && fullContent.endsWith('"')) {
      fullContent = fullContent.slice(1, -1);
    }
    
    console.log("Minimax raw output:", fullContent);

    try {
      const parsedData = JSON.parse(fullContent);
      console.log("Agent prefill parsed data:", parsedData);
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error("Agent prefill JSON parsing error:", fullContent);
      return NextResponse.json({
        defenseLevel: 50,
        tempPreference: "恒温",
        rhythmPerception: 50,
        hiddenNeed: "寻找同频的共鸣",
        reasoning: "（深空信号微弱，我只能凭借直觉给出这套初始参数，你可以自由修正它）"
      });
    }

  } catch (error: any) {
    console.error("Agent Prefill API Error:", error?.message || error);
    return NextResponse.json({
      defenseLevel: 50,
      tempPreference: "恒温",
      rhythmPerception: 50,
      hiddenNeed: "寻找同频的共鸣",
      reasoning: "（星际网络波动，代理观测失效。已加载安全基准协议。）"
    }, { status: 500 });
  }
}
