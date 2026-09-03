import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { notifyMany } from "@/lib/notify";
import { nextTicketNumber } from "@/lib/tickets";

export const runtime = "nodejs";

/**
 * E-posta sağlayıcısının (Resend/Postmark/SendGrid inbound parse) POST edeceği webhook.
 * Basit, sağlayıcıdan bağımsız gövde bekler: { from, subject, text }.
 * Güvenlik: INBOUND_EMAIL_SECRET header'ı veya ?secret= parametresi.
 */
function extractEmail(from: unknown): string | null {
  if (typeof from === "string") {
    const m = from.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
    return m ? m[0].toLowerCase() : null;
  }
  if (from && typeof from === "object") {
    const obj = from as Record<string, unknown>;
    if (typeof obj.email === "string") return obj.email.toLowerCase();
    if (typeof obj.address === "string") return obj.address.toLowerCase();
  }
  return null;
}

export async function POST(req: Request) {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret) {
    const url = new URL(req.url);
    const provided =
      req.headers.get("x-webhook-secret") ?? url.searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const email = extractEmail(payload.from ?? payload.sender ?? payload.email);
  if (!email) {
    return NextResponse.json({ error: "no sender" }, { status: 400 });
  }

  const requester = await prisma.user.findFirst({
    where: { email, status: "ACTIVE" },
    select: { id: true, name: true, email: true },
  });
  // Tanınmayan gönderen: kuyruğa takılmasın diye 202 ile sessizce yut.
  if (!requester) {
    return NextResponse.json({ ignored: "unknown sender" }, { status: 202 });
  }

  const subject =
    typeof payload.subject === "string" && payload.subject.trim()
      ? payload.subject.trim().slice(0, 200)
      : "(konusuz e-posta)";
  const body =
    typeof payload.text === "string"
      ? payload.text
      : typeof payload.body === "string"
        ? payload.body
        : "(içerik yok)";

  const number = await nextTicketNumber();
  const ticket = await prisma.ticket.create({
    data: {
      number,
      title: subject,
      description: body.slice(0, 10_000),
      category: "OTHER",
      priority: "MEDIUM",
      source: "EMAIL",
      requesterId: requester.id,
      slaDueAt: new Date(Date.now() + 24 * 3_600_000),
    },
  });

  const itStaff = await prisma.user.findMany({
    where: {
      role: { in: ["IT_AGENT", "TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"] },
      status: "ACTIVE",
    },
    select: { id: true },
  });
  await notifyMany(
    itStaff.map((u) => u.id),
    {
      type: "TICKET_CREATED",
      title: `${requester.name ?? requester.email} e-posta ile talep açtı`,
      body: ticket.title,
      link: `/tickets/${ticket.id}`,
      entityType: "Ticket",
      entityId: ticket.id,
    },
  );

  return NextResponse.json({ ok: true, number: ticket.number });
}
