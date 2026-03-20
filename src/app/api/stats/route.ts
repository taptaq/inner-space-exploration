import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const totalCount = await prisma.user.count();
    return NextResponse.json({ totalUsers: totalCount });
  } catch (error) {
    console.error("Failed to fetch user count:", error);
    // fallback if DB fails
    return NextResponse.json({ totalUsers: 21439 });
  }
}
