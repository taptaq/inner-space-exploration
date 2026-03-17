import { NextRequest, NextResponse } from "next/server";
import { config, secondmeApi, getCurrentUser } from "@/lib/secondme";

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
        { error: "Failed to fetch user info" },
        { status: 400 }
      );
    }

    // 格式化输出为期望的 profileData 形式
    return NextResponse.json({
      info: user,
      shades: user.shades,
      softMemory: user.softMemory,
    });
  } catch (error: any) {
    console.error("Profile API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
