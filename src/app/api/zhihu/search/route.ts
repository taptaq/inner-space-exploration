import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  const count = parseInt(searchParams.get("count") || "10");

  if (!query) {
    return NextResponse.json(
      { status: 400, msg: "Missing query parameter" },
      { status: 400 }
    );
  }

  const appKey = process.env.ZHIHU_APP_KEY;
  const appSecret = process.env.ZHIHU_APP_SECRET;

  if (!appKey || !appSecret) {
    return NextResponse.json(
      { status: 500, msg: "Zhihu API keys are not configured" },
      { status: 500 }
    );
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const logId = crypto.randomUUID();
    const extraInfo = "";

    // 1. 构造待签名字符串
    // 格式: app_key:{app_key}|ts:{timestamp}|logid:{log_id}|extra_info:{extra_info}
    const signStr = `app_key:${appKey}|ts:${timestamp}|logid:${logId}|extra_info:${extraInfo}`;

    // 2 & 3. 使用 HMAC-SHA256 算法，并对结果进行 Base64 编码
    const signature = crypto
      .createHmac("sha256", appSecret)
      .update(signStr)
      .digest("base64");

    // 不再使用 query params 传参 app_key，而是纯靠 Header
    const apiUrl = `https://openapi.zhihu.com/openapi/search/global?query=${encodeURIComponent(query)}&count=${count}`;

    const res = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-App-Key": appKey,
        "X-Timestamp": timestamp,
        "X-Log-Id": logId,
        "X-Sign": signature,
        "X-Extra-Info": extraInfo
      },
    });

    if (res.ok) {
      const data = await res.json();
      
      // 验证返回状态结构是否正如文档所述，成功为 0
      if (data.status === 0) {
        return NextResponse.json(data);
      } else {
        return NextResponse.json(
          { status: 400, msg: data.msg || "Zhihu API returned non-zero status" },
          { status: 400 }
        );
      }
    } else {
      console.error("Zhihu API error:", res.status, await res.text());
      return NextResponse.json(
        { status: res.status, msg: "Zhihu API HTTP error" },
        { status: res.status }
      );
    }

  } catch (error: any) {
    console.error("Zhihu API Route error:", error);
    return NextResponse.json(
      { status: 500, msg: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
