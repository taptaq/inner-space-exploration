import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
    
    // 从请求体中解构我们需要保存的属性集合
    const {
      // 本我感官参数
      defenseLevel,
      tempPreference,
      rhythmPerception,
      hiddenNeed,
      // SecondMe Profile 外联数据
      profileData
    } = await req.json();

    // 先用 token 定位当前正在操作的数据库 User 记录
    const currentUser = await prisma.user.findUnique({
      where: { token },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found for the provided token" },
        { status: 404 }
      );
    }

    // 更新用户记录上的拓展特征字段
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        defenseLevel: defenseLevel !== undefined ? defenseLevel : currentUser.defenseLevel,
        tempPreference: tempPreference !== undefined ? tempPreference : currentUser.tempPreference,
        rhythmPerception: rhythmPerception !== undefined ? rhythmPerception : currentUser.rhythmPerception,
        hiddenNeed: hiddenNeed !== undefined ? hiddenNeed : currentUser.hiddenNeed,
        
        bio: profileData?.info?.bio || currentUser.bio,
        selfIntroduction: profileData?.info?.selfIntroduction || currentUser.selfIntroduction,
        // 这里需要注意，如果在 discover API 我们映射对方名为 username，它实际上是 name 字段
        name: profileData?.info?.name || currentUser.name,
        
        // 将 shades 和 softMemory 作为 JSON 持久化存储
        shades: profileData?.shades ? (profileData.shades as any) : currentUser.shades,
        softMemory: profileData?.softMemory ? (profileData.softMemory as any) : currentUser.softMemory,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error: any) {
    console.error("Save Profile API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
