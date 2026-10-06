import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pin = searchParams.get("pin");

  if (!pin) {
    return NextResponse.json({ error: "PIN kodu gerekli." }, { status: 400 });
  }

  const feedback = await prisma.feedback.findUnique({
    where: { pinCode: pin },
    select: {
      status: true,
      content: true,
      adminResponse: true,
      createdAt: true,
    },
  });

  if (!feedback) {
    return NextResponse.json({ error: "Geçersiz veya hatalı PIN kodu." }, { status: 404 });
  }

  return NextResponse.json(feedback);
}
