import { NextRequest, NextResponse } from "next/server";
import { config, getCurrentUser } from "@/lib/secondme";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { code, redirectUri } = await request.json();

    if (!code || !redirectUri) {
      return NextResponse.json(
        { error: "Missing code or redirectUri" },
        { status: 400 }
      );
    }

    if (!config.appId || !config.appSecret) {
      console.error(
        "Missing NEXT_PUBLIC_SECONDME_APP_ID or SECONDME_APP_SECRET in environment variables."
      );
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // 1. 换取 Access Token
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUri);
    params.append("client_id", config.appId);
    params.append("client_secret", config.appSecret);

    const tokenRes = await fetch(`${config.baseUrl}/api/oauth/token/code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const rawText = await tokenRes.text();
    let tokenData;
    try {
      tokenData = JSON.parse(rawText);
    } catch (e) {
      console.error(
        "Failed to parse token response as JSON. Status:",
        tokenRes.status,
        "Raw response:",
        rawText.slice(0, 500)
      );
      return NextResponse.json(
        { error: "Invalid response from authorization server" },
        { status: 502 }
      );
    }

    if (!tokenRes.ok || tokenData.code !== 0) {
      console.error("Token exchange failed:", tokenData);
      return NextResponse.json(
        { error: tokenData.message || "Failed to exchange token" },
        { status: 401 }
      );
    }

    const accessToken = tokenData.data.accessToken;

    // 2. 获取用户信息
    const userInfo = await getCurrentUser(accessToken);

    if (!userInfo) {
      return NextResponse.json(
        { error: "Failed to fetch user info from SecondMe" },
        { status: 500 }
      );
    }

    const email = userInfo.email || `${userInfo.id}@secondme.local`;
    const name = userInfo.name || userInfo.nickname || "SecondMe User";
    const avatar =
      userInfo.avatar || userInfo.avatar_url || userInfo.avatarUrl || null;

    // 3. 保存用户到数据库, 涵盖第一次同步来的所有 SecondMe 特征
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        token: accessToken,
        name,
        avatar,
        bio: userInfo.info?.bio || null,
        selfIntroduction: userInfo.info?.selfIntroduction || null,
        title: userInfo.info?.title || null,
        shades: userInfo.shades || [],
        softMemory: userInfo.softMemory || []
      },
      create: {
        email,
        token: accessToken,
        name,
        avatar,
        bio: userInfo.info?.bio || null,
        selfIntroduction: userInfo.info?.selfIntroduction || null,
        title: userInfo.info?.title || null,
        shades: userInfo.shades || [],
        softMemory: userInfo.softMemory || []
      },
    });

    return NextResponse.json({
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        title: user.title,
        hasShades: !!user.shades
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Callback API error:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
