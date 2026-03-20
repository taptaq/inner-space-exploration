import { NextRequest, NextResponse } from "next/server";
import { config, secondmeApi, getCurrentUser } from "@/lib/secondme";
import prisma from "@/lib/prisma";
import { decryptString } from "@/lib/encryption";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization token" },
        { status: 401 }
      );
    }
    const token = authHeader.split(" ")[1];
    // 利用封装好的方法，确保 shades 和 info 嵌套逻辑解析正确
    const user = await getCurrentUser(token);

    if (!user) {
      return NextResponse.json(
        { error: "Failed to fetch user info or invalid token" },
        { status: 401 }
      );
    }

    // 获取本地数据库中的专属配置 (防线、温控等)
    const localUser = await prisma.user.findUnique({
      where: { token },
    });

    // 格式化输出为期望的 profileData 形式，并混入本地参数
    return NextResponse.json({
      info: user,
      shades: user.shades,
      softMemory: user.softMemory,
      localPreferences: localUser ? {
        defenseLevel: localUser.defenseLevel,
        tempPreference: localUser.tempPreference,
        rhythmPerception: localUser.rhythmPerception,
        hiddenNeed: decryptString(localUser.hiddenNeed || ""),
      } : null
    });
  } catch (error: any) {
    console.error("Profile API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
