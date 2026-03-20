import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { RecommendedUser, TempPreference } from "@/types/agent";
import { getCurrentUser } from "@/lib/secondme";
import { decryptString } from "@/lib/encryption";

interface AiCandidate extends RecommendedUser {
  _defenseLevel?: number | null;
  _tempPreference?: string | null;
  _rhythmPerception?: number | null;
  _hiddenNeed?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization token" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const { myPayload } = await req.json();

    if (!myPayload) {
      return NextResponse.json(
        { error: "Missing myPayload in request body" },
        { status: 400 }
      );
    }

    let currentUserEmail = "";
    try {
      const secondMeUser = await getCurrentUser(token);
      if (secondMeUser && secondMeUser.email) {
        currentUserEmail = secondMeUser.email;
      }
    } catch(e) {
      console.error("Failed to fetch secondme user in match-ai:", e);
    }

    // 1. Fetch Candidates (exclude self)
    const localUsers = await prisma.user.findMany({
      where: {
        AND: [
          { token: { not: token } },
          currentUserEmail ? { email: { not: currentUserEmail } } : {}
        ],
        defenseLevel: { not: null }, // Must have completed onboarding
      },
      take: 20, // Increased candidate pool
      orderBy: { updatedAt: "desc" },
    });

    let candidates: AiCandidate[] = [];
    
    // Map DB users to RecommendedUser shape
    if (localUsers.length > 0) {
      candidates = localUsers.map((u) => ({
        username: u.name || "Unknown Entity",
        route: u.id || "", // SecondMe route identifier
        matchScore: 0,
        title: u.title || "寂静宙域迷航者",
        hook: u.bio || "在绝对零度中寻找微弱的温宿",
        briefIntroduction: u.selfIntroduction || "...",
        // Temporary holding values just for the prompt context
        _defenseLevel: u.defenseLevel,
        _tempPreference: u.tempPreference,
        _rhythmPerception: u.rhythmPerception,
        _hiddenNeed: decryptString(u.hiddenNeed || ""),
      }));
    } else {
      console.warn("No active users found. Aborting AI Matchmaking.");
      return NextResponse.json(
        { error: "当前星域没有活跃的适合航行者，请邀请更多人加入深空探测。" },
        { status: 404 }
      );
    }

    // 2. Prepare Data for AI
    const candidateDataString = JSON.stringify(
      candidates.map((c) => ({
        username: c.username,
        hook: c.hook,
        bio: c.briefIntroduction,
        defenseLevel: c._defenseLevel,
        tempPreference: c._tempPreference,
        rhythmPerception: c._rhythmPerception,
        hiddenNeed: c._hiddenNeed,
      })),
      null,
      2
    );

    const prompt = `
你是一位"深空寻轨算法"，拥有极高的心理学和感官同理心。
当前有一位新接入的本我领航员，其心理和感官参数如下：
- 防线韧性：${myPayload.defenseLevel}/100 
- 温度偏好：${myPayload.tempPreference}
- 节奏感知：${myPayload.rhythmPerception}/100
- 隐秘诉求 (最重要)："${myPayload.hiddenNeed || "未主动倾诉，需要安全感与包裹感"}"

数据库中目前有以下活跃的候选人节点档案：
\`\`\`json
${candidateDataString}
\`\`\`

请从这批候选人中，选拔出与当前领航员在【精神内核、情感依恋、感官诉求】上最具互补张力或是最高频共振的一个对象。
你们的匹配不应只看冰冷的数值，要从 "隐秘诉求(hiddenNeed)" 和 "个人签名(hook)/简介(bio)" 中读懂他们灵魂深处的契合度。

请严格返回以下 JSON 格式数据：
{
  "bestMatchUsername": "你挑选出的候选人的 username（必须完全匹配上面 JSON 中的名字）",
  "compatibilityScore": 一个 80 到 99 之间的整数,
  "matchReason": "一句充满科幻感、神秘感且切中人心的羁绊判词（例如：'绝对零度的防线，终于等来了一场恒温的失控坠落。'）"
}
注意：只需返回纯 JSON，不要有外部 Markdown 代码块包裹，也不要有任何其他解释性文字。
`;

    // 3. Call Minimax
    const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
    const MINIMAX_MODEL = process.env.MINIMAX_MODEL || "M2-her";

    if (!MINIMAX_API_KEY) {
      throw new Error("Missing MINIMAX_API_KEY");
    }

    const aiRes = await fetch("https://api.minimax.io/v1/text/chatcompletion_v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: MINIMAX_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }, 
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      console.error("Minimax Match Error:", err);
       // Fallback math matching if AI fails
      return NextResponse.json({ fallback: true, users: localUsers });
    }

    const data = await aiRes.json();
    let resultPayload;
    try {
      resultPayload = JSON.parse(data.choices[0].message.content.trim());
    } catch(e) {
      console.error("JSON parse error from Minimax Match:", e);
      return NextResponse.json({ fallback: true, users: localUsers });
    }

    console.log("AI Semantic Match Result:", resultPayload);

    // 4. Attach Best Match info
    const bestUserRecord = candidates.find((c) => c.username === resultPayload.bestMatchUsername) || candidates[0];
    
    return NextResponse.json({
      bestMatchUser: bestUserRecord,
      matchScore: resultPayload.compatibilityScore,
      matchReason: resultPayload.matchReason,
      // Pass the remaining users as alternates 
      alternates: candidates.filter(c => c.username !== resultPayload.bestMatchUsername)
    });

  } catch (error: any) {
    console.error("Match AI logic error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
