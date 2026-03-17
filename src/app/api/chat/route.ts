import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message, systemPrompt, sessionId } = await req.json();

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "未授权：需要有效的 Token" },
        { status: 401 }
      );
    }
    const token = authHeader.split(" ")[1];

    const body: any = { message };
    if (sessionId) body.sessionId = sessionId;
    if (systemPrompt) body.systemPrompt = systemPrompt;

    const response = await fetch(
      "https://api.mindverse.com/gate/lab/api/secondme/chat/stream",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SecondMe Chat API error:", response.status, errorText);
      return NextResponse.json(
        { error: `SecondMe API 错误: ${response.status}` },
        { status: response.status }
      );
    }

    if (!response.body) {
      throw new Error("无响应流");
    }

    // 处理 SSE 流式响应，拼接在后端成为一段完整字符串返回
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullContent = "";
    let returnedSessionId = sessionId;

    let currentEvent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.substring(7).trim();
          continue;
        }

        if (line.startsWith("data: ")) {
          const dataStr = line.substring(6).trim();
          if (dataStr === "[DONE]") {
            break; // 流结束
          }

          if (dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              if (currentEvent === "session") {
                returnedSessionId = parsed.sessionId;
              } else if (currentEvent === "error") {
                console.error("SecondMe stream event error:", parsed);
              } else {
                // message delta data stream
                if (parsed.choices && parsed.choices[0]?.delta?.content) {
                  fullContent += parsed.choices[0].delta.content;
                }
              }
            } catch (e) {
              console.error("解析流式 JSON 出错:", e, dataStr);
            }
          }
          currentEvent = ""; // reset for next line
        }
      }
    }

    // 后备文本，如果模型没有给出任何响应
    if (!fullContent) {
      fullContent = "（对方陷入了沉思...）";
    }

    return NextResponse.json({
      content: fullContent,
      sessionId: returnedSessionId,
    });
  } catch (error) {
    console.error("Chat API proxy error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
