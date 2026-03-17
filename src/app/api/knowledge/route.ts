import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "scenario" | "cards"

  try {
    if (type === "scenario") {
      const rows = await prisma.$queryRawUnsafe<any[]>('SELECT * FROM "ScenarioTip" ORDER BY "scenarioId" ASC');
      return NextResponse.json(rows);
    } 
    
    if (type === "cards") {
      const rows = await prisma.$queryRawUnsafe<any[]>('SELECT * FROM "KnowledgeCard" ORDER BY "id" ASC');
      return NextResponse.json(rows);
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (error: any) {
    console.error("Failed to fetch knowledge:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge from database: " + error.message },
      { status: 500 }
    );
  }
}
