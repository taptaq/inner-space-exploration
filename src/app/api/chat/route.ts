import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// 强行跳过证书检验 (解决本地代理/证书导致 fetch failed)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { message, systemPrompt, sessionId } = await req.json();

    const apiKey = process.env.MINIMAX_API_KEY;
    const model = process.env.MINIMAX_MODEL || "MiniMax-M2.5-highspeed";

    if (!apiKey || apiKey === "your_key_here") {
      throw new Error("Minimax API Key 未配置");
    }

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: message });

    const requestData = {
      model,
      messages,
      max_tokens: 500, // 对话消息不需要太长
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
        timeout: 120000,
      }
    );

    const data = minimaxRes.data;

    if (data.base_resp && data.base_resp.status_code !== 0) {
      throw new Error(`Minimax Error: ${data.base_resp.status_msg}`);
    }

    let fullContent = data.choices?.[0]?.message?.content?.trim() || "（对方陷入了沉思...）";
    
    // 如果返回的带有包裹引号等，去掉
    if (fullContent.startsWith('"') && fullContent.endsWith('"')) {
      fullContent = fullContent.slice(1, -1);
    }

    return NextResponse.json({
      content: fullContent,
      sessionId: sessionId || "local-minimax-session",
    });

  } catch (error: any) {
    const fs = require('fs');
    try {
      fs.appendFileSync('./chat-error.log', JSON.stringify({
        time: new Date().toISOString(),
        message: error?.message || "Unknown error",
        response: error?.response?.data || "No response data",
        // we can't easily capture the req.json again because the stream was consumed, but we can capture at least this.
      }, null, 2) + "\n");
    } catch(e) {}
    console.error(
      "Minimax Chat API proxy error:", 
      error?.message || error,
      "Response data:",
      error?.response?.data
    );
    return NextResponse.json({ 
        content: "（深空信号微弱，暂时无法建立语言连接...）", 
        error: "服务器内部错误",
        details: error?.response?.data
    }, { status: 500 });
  }
}

