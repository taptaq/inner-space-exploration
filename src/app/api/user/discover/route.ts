import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { RecommendedUser } from "@/types/agent";
import { getCurrentUser } from "@/lib/secondme";
import { decryptString, decryptJson } from "@/lib/encryption";

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

    let currentUserEmail = "";
    try {
      const secondMeUser = await getCurrentUser(token);
      if (secondMeUser && secondMeUser.email) {
        currentUserEmail = secondMeUser.email;
      }
    } catch(e) {
      console.error("Failed to fetch secondme user in discover:", e);
    }

    // 查询所有存有有效数据（内太空特征）但排除自己的本地用户
    const localUsers = await prisma.user.findMany({
      where: {
        AND: [
          { token: { not: token } },
          currentUserEmail ? { email: { not: currentUserEmail } } : {}
        ],
        // 可选：确保拉取的用户曾经历过雷达设定
        defenseLevel: { not: null },
      },
      take: 20, // 获取最新/活跃的 20 个用户
      orderBy: {
        updatedAt: "desc"
      }
    });

    if (localUsers.length === 0) {
      console.warn("DB Discover API found nobody else. Returning empty array.");
      return NextResponse.json({
        users: []
      });
    }

    // 格式化为前端熟悉的 RecommendedUser 并附带真实隐秘防线数据
    const formattedUsers: RecommendedUser[] = localUsers.map(user => ({
      username: user.name || "无名漫游者",
      route: user.id, // 这里暂时用 User.Id 代替路由（也可用来后期实现站内信）
      matchScore: 0,
      title: user.title || "深空同屏者",
      hook: user.bio || "等待被读取的一段电波",
      briefIntroduction: user.selfIntroduction || "...",
      
      // 后台带出物理引擎需要跑的算分参数
      defenseLevel: user.defenseLevel || 50,
      tempPreference: user.tempPreference || "恒温",
      rhythmPerception: user.rhythmPerception || 50,
      hiddenNeed: decryptString(user.hiddenNeed || ""),
      
      shades: typeof user.shades === 'object' ? user.shades : (user.shades ? decryptJson(user.shades.toString()) : []),
      softMemory: typeof user.softMemory === 'object' ? user.softMemory : (user.softMemory ? decryptJson(user.softMemory.toString()) : [])
    }));

    return NextResponse.json({
      users: formattedUsers,
    });
  } catch (error: any) {
    console.error("Local DB Discover API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
