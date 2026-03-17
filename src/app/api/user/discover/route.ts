import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { RecommendedUser } from "@/types/agent";

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

    // 查询所有存有有效数据（内太空特征）但排除自己的本地用户
    const localUsers = await prisma.user.findMany({
      where: {
        NOT: {
          token: token,
        },
        // 可选：确保拉取的用户曾经历过雷达设定
        defenseLevel: { not: null },
      },
      take: 20, // 获取最新/活跃的 20 个用户
      orderBy: {
        updatedAt: "desc"
      }
    });

    if (localUsers.length === 0) {
      console.warn("DB Discover API found nobody else. Falling back to mock universe data for testing purposes.");
      return NextResponse.json({
        users: [
          {
            username: "星尘观测者_Lumina",
            route: "lumina",
            matchScore: 0,
            title: "寂静宙域迷航者",
            hook: "在绝对零度中寻找微弱的温宿",
            briefIntroduction: "我曾在边缘星系观测了三万次新星爆发，但仍然读不懂人类的频率。",
            // Provide explicit dummy agent params so the match algorithm doesn't error out
            defenseLevel: 90,
            tempPreference: "极寒",
            rhythmPerception: 20,
            hiddenNeed: "渴望一场完全失控的陨石雨",
            shades: [],
            softMemory: []
          },
          {
            username: "拾荒人-K9",
            route: "k9-scavenger",
            matchScore: 0,
            title: "深空信号解构师",
            hook: "丢弃一切，直至寻到本质",
            briefIntroduction: "不要试图防备我。你的每次心跳都在主动向我发送握手协议。",
            defenseLevel: 30,
            tempPreference: "熔毁",
            rhythmPerception: 95,
            hiddenNeed: "想被绝对的暴力引力撕成碎片",
            shades: [],
            softMemory: []
          },
          {
            username: "Nebula_Echo",
            route: "nebula-echo",
            matchScore: 0,
            title: "共鸣实验体",
            hook: "我是一面只会反射你隐秘诉求的镜子",
            briefIntroduction: "没有名字，只有频率。你抛出的引力越大，我贴得越紧。",
            defenseLevel: 50,
            tempPreference: "恒温",
            rhythmPerception: 50,
            hiddenNeed: "请成为唯一能听懂我回声的人",
            shades: [],
            softMemory: []
          }
        ]
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
      hiddenNeed: user.hiddenNeed || "",
      
      shades: typeof user.shades === 'object' ? user.shades : [],
      softMemory: typeof user.softMemory === 'object' ? user.softMemory : []
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
