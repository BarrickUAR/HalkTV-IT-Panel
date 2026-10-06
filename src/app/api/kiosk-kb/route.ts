import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const category = url.searchParams.get("category")?.trim();

    const where: any = { isPublished: true };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
      ];
    }
    if (category && category !== "ALL") {
      where.category = category;
    }

    const articles = await prisma.knowledgeArticle.findMany({
      where,
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        viewCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, articles });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Bilgi bankası yüklenemedi." }, { status: 500 });
  }
}
