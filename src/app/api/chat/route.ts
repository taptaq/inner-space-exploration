import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { systemPrompt, messages } = await req.json();

    const apiKey = process.env.MINIMAX_API_KEY;
    const model = process.env.MINIMAX_MODEL || "MiniMax-Text-01";

    if (!apiKey || apiKey === "your_key_here") {
      return NextResponse.json(
        { error: "Minimax API Key 未配置" },
        { status: 500 },
      );
    }

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
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
          max_tokens: 200,
          temperature: 0.9,
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
    const content =
      data.choices?.[0]?.message?.content || "（对方陷入了沉思...）";

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
