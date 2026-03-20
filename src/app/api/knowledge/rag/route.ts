import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Add log to force Turbopack cache invalidation
  console.log("[RAG] Fetching deep space literature citation...");
  const { searchParams } = new URL(request.url);
  const cardId = searchParams.get("cardId");

  if (!cardId) {
    return NextResponse.json(
      { error: "cardId is required" },
      { status: 400 }
    );
  }

  try {
    const card = await prisma.knowledgeCard.findUnique({
      where: { cardId }
    });

    if (!card) {
      return NextResponse.json(
        { error: "Knowledge card not found" },
        { status: 404 }
      );
    }

    const { title, source, citationAbstract, citationUrl } = card as any;

    return NextResponse.json({
      title,
      source,
      citationAbstract,
      citationUrl,
    });
  } catch (error) {
    console.error("Error fetching RAG data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
