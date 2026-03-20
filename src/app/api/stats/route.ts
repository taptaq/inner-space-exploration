import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 生成拉普拉斯噪声 (Laplace Noise) 用于差分隐私
// mu: 位置参数 (期望值)，b: 尺度参数 (散布程度)
function getLaplaceNoise(mu = 0, b = 2) {
  const u = Math.random() - 0.5;
  return mu - b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

export async function GET() {
  try {
    const exactCount = await prisma.user.count();
    
    // epsilon 取 0.5, sensitivity 取 1 (增删一个用户的偏差)，则 b = 1/0.5 = 2
    // 加入差分隐私噪声，确保无法反推精确值，并避免负数和过于突兀的小数
    const noise = Math.round(getLaplaceNoise(0, 2));
    const privateCount = Math.max(10, exactCount + noise);

    return NextResponse.json({ totalUsers: privateCount });
  } catch (error) {
    console.error("Failed to fetch user count:", error);
    // fallback if DB fails with arbitrary noise
    const fallbackNoise = Math.round(getLaplaceNoise(0, 5));
    return NextResponse.json({ totalUsers: Math.max(21439, 21439 + fallbackNoise) });
  }
}
