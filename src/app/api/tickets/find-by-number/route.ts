import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
  }

  const number = req.nextUrl.searchParams.get("number")?.trim().toUpperCase();
  if (!number) {
    return NextResponse.json({ error: "Numara gerekli." }, { status: 400 });
  }

  // HTK-0042 veya sadece 0042 formatını destekle
  const clean = number.startsWith("HTK-") ? number.slice(4) : number;

  const ticket = await prisma.ticket.findFirst({
    where: {
      OR: [
        { number: { endsWith: clean } },
        { number: number },
      ],
    },
    select: { id: true, number: true, title: true },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Talep bulunamadı." }, { status: 404 });
  }

  return NextResponse.json(ticket);
}
