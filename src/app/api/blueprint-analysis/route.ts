import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { myPayload, partnerData, isSolo } = await req.json();

    const apiKey = process.env.MINIMAX_API_KEY;
    const model = process.env.MINIMAX_MODEL || "MiniMax-Text-01";

    if (!apiKey || apiKey === "your_key_here") {
      return NextResponse.json(
        { error: "Minimax API Key 未配置" },
        { status: 500 },
      );
    }

    // 构建用户背景档案
    let userBg = "【本我领航员深度档案】\n";
    userBg += `- 心理防线: ${myPayload.defenseLevel}/100\n`;
    userBg += `- 温度偏好: ${myPayload.tempPreference}\n`;
    userBg += `- 节奏感知: ${myPayload.rhythmPerception}Hz\n`;
    if (myPayload.hiddenNeed) {
      userBg += `- 隐秘欲望/癖好: ${myPayload.hiddenNeed}\n`;
    }

    if (myPayload.profileData) {
      const p = myPayload.profileData;
      userBg += `- 基础信息: 姓名 ${p.info.name}, 签名: ${p.info.bio}\n`;
      userBg += `- 自我介绍: ${p.info.selfIntroduction}\n`;
      if (p.shades && p.shades.length > 0) {
        userBg += `- 兴趣爱好(Shades): ${p.shades.map((s: any) => s.shadeName).join(", ")}\n`;
      }
      if (p.softMemory && p.softMemory.length > 0) {
        userBg += `- 软记忆/过往经历: ${p.softMemory.map((m: any) => m.factContent).join("; ")}\n`;
      }
    }

    let partnerBg = "";
    if (!isSolo && partnerData) {
      partnerBg = "\n【匹配异星伴侣档案】\n";
      partnerBg += `- 匹配用户名: ${partnerData.username || "未知"}\n`;
      partnerBg += `- 匹配度: ${partnerData.matchScore || 0}%\n`;
      if (partnerData.briefIntroduction) {
        partnerBg += `- 伴侣简介: ${partnerData.briefIntroduction}\n`;
      }
    }

    const systemPrompt = `你现在是深空医疗飞船的专属情感诊断医师与外设架构工程师。你需要根据用户的感官探索参数、隐秘癖好、以及SecondMe平台上的真实自我介绍、兴趣爱好、软记忆等全方位深层信息，结合${isSolo ? "单人自我沉浸" : "双人灵魂匹配"}的语境，生成两段极具沉浸感、一针见血的赛博朋克深空风格解析报告。

请返回 JSON 格式，包含以下三个字段：
1. "doctorDiagnosis": 情感医生诊断，注重于性格齿轮的咬合，结合用户软记忆和兴趣爱好的情感共鸣剖析。（约 80-150 字）
2. "engineerAnalysis": 工程师解读，注重物理与感官张力（温度、频率）的结合机制。（约 80-150 字）
3. "hiddenFeedback": 如果用户有提及隐秘癖好（hiddenNeed），请以系统回执的口吻给出一级回应；若无，置空。（约 50 字）

注意，输出必须是纯合法的 JSON 字符串，不含有 markdown \`\`\`json 闭环，示例格式：
{
  "doctorDiagnosis": "...",
  "engineerAnalysis": "...",
  "hiddenFeedback": "..."
}

当前领航员信息如下：
${userBg}
${partnerBg}
`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: "请根据档案输出我的深空基建诊断 JSON 分析报告。" }
    ];

    const response = await fetch(
      "https://api.minimax.chat/v1/text/chatcompletion_v2",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: apiMessages,
          max_tokens: 800,
          temperature: 0.85,
          top_p: 0.95,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Minimax API error:", response.status, errorText);
      return NextResponse.json(
        { error: `Minimax API 错误: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON
    let parsedContent;
    try {
      // 提取可能的 JSON 块
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      parsedContent = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse JSON from LLM: ", content);
      parsedContent = {
        doctorDiagnosis: "系统信号波动，临床诊断生成失败，请重试。",
        engineerAnalysis: "引力波干扰无法完成物理架构解析。",
        hiddenFeedback: ""
      };
    }

    return NextResponse.json(parsedContent);
  } catch (error) {
    console.error("Blueprint Analysis API error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
