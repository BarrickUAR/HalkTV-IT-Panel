import { resolveKioskUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { nextTicketNumber } from "@/lib/tickets";
import { notifyMany } from "@/lib/notify";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type QuickIssueType = "MARSIS" | "PRINTER" | "NETWORK" | "REMOTE";

const ISSUE_TEMPLATES: Record<
  QuickIssueType,
  {
    title: string;
    category: "SOFTWARE" | "HARDWARE" | "NETWORK" | "OTHER";
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    descTemplate: (userName: string, pcName: string) => string;
  }
> = {
  MARSIS: {
    title: "Marsis YayÄ±n Otomasyonu BaÄŸlantÄ± Sorunu",
    category: "SOFTWARE",
    priority: "HIGH",
    descTemplate: (userName, pcName) =>
      `KullanÄ±cÄ±: ${userName}\nCihaz: ${pcName}\n\nPersonel, Marsis yayÄ±n otomasyonu sunucusuna baÄŸlanamadÄ±ÄŸÄ±nÄ± bildirdi. (1-TÄ±k Acil Destek Bildirimi)`,
  },
  PRINTER: {
    title: "YazÄ±cÄ± BaÄŸlantÄ± / Ã‡Ä±ktÄ± Alma HatasÄ±",
    category: "HARDWARE",
    priority: "MEDIUM",
    descTemplate: (userName, pcName) =>
      `KullanÄ±cÄ±: ${userName}\nCihaz: ${pcName}\n\nPersonel, departman yazÄ±cÄ±sÄ±na eriÅŸemediÄŸini veya Ã§Ä±ktÄ± alamadÄ±ÄŸÄ±nÄ± bildirdi. (1-TÄ±k Acil Destek Bildirimi)`,
  },
  NETWORK: {
    title: "Ä°nternet / Yerel AÄŸ BaÄŸlantÄ± Kesintisi",
    category: "NETWORK",
    priority: "HIGH",
    descTemplate: (userName, pcName) =>
      `KullanÄ±cÄ±: ${userName}\nCihaz: ${pcName}\n\nPersonel, bilgisayarda internet veya yerel aÄŸ baÄŸlantÄ±sÄ±nÄ±n koptuÄŸunu bildirdi. (1-TÄ±k Acil Destek Bildirimi)`,
  },
  REMOTE: {
    title: "Acil Uzaktan Destek (Ekran PaylaÅŸÄ±mÄ±) Talebi",
    category: "OTHER",
    priority: "HIGH",
    descTemplate: (userName, pcName) =>
      `KullanÄ±cÄ±: ${userName}\nCihaz: ${pcName}\n\nPersonel, cihazÄ±na uzaktan baÄŸlantÄ± yapÄ±larak acil teknik destek verilmesini talep etti. (1-TÄ±k Acil Destek Bildirimi)`,
  },
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      issueType?: QuickIssueType;
      hostname?: string;
      userId?: string;
      username?: string;
      anydeskId?: string;
      alpemixId?: string;
      description?: string;
    };

    let user = await resolveKioskUser({
      userId: body.userId,
      hostname: body.hostname,
      username: body.username,
    });

    // GiriÅŸ yapÄ±lmamÄ±ÅŸsa IT admin hesabÄ±nÄ± vekil seÃ§erek bileti oluÅŸtur
    if (!user) {
      user = await prisma.user.findFirst({
        where: { role: { in: ["SUPER_ADMIN", "TEKNIK_MUDUR", "IT_AGENT"] }, status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          image: true,
          departmentId: true,
          department: { select: { id: true, name: true } }, title: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Sistemde yetkili IT hesabÄ± bulunamadÄ±." },
        { status: 500 },
      );
    }

    const issueType = body.issueType;

    if (!issueType || !ISSUE_TEMPLATES[issueType]) {
      return NextResponse.json(
        { ok: false, error: "GeÃ§ersiz sorun tÃ¼rÃ¼ seÃ§ildi." },
        { status: 400 },
      );
    }

    const template = ISSUE_TEMPLATES[issueType];
    const pcName = body.hostname || "Bilinmiyor";
    const userName = user.name || user.email;

    const number = await nextTicketNumber();

    // SLA: HIGH iÃ§in 8 saat, MEDIUM iÃ§in 24 saat
    const slaHours = template.priority === "HIGH" ? 8 : 24;
    const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    let ticketTitle = template.title;
    let ticketDesc = template.descTemplate(userName, pcName);
    const anydeskId = (body as any).anydeskId || (body as any).alpemixId;
    const userDesc = (body as any).description;

    if (issueType === "REMOTE" && anydeskId) {
      const cleanId = String(anydeskId).replace(/\s+/g, "");
      ticketTitle = `ğŸš¨ Uzaktan Destek (AnyDesk: ${anydeskId})`;
      ticketDesc = `KullanÄ±cÄ±: ${userName}\nCihaz: ${pcName}\n\nğŸ–¥ï¸ ANYDESK BAÄLANTI BÄ°LGÄ°SÄ°:\nAnyDesk ID: ${anydeskId}\nDoÄŸrudan BaÄŸlantÄ± Linki: anydesk:${cleanId}\n\nPersonel AnyDesk'i aÃ§tÄ± ve uzaktan baÄŸlantÄ± bekliyor.\n\nğŸ“ KullanÄ±cÄ± AÃ§Ä±klamasÄ±:\n${userDesc || "Belirtilmedi"}`;
    }

    const ticket = await prisma.ticket.create({
      data: {
        number,
        title: ticketTitle,
        description: ticketDesc,
        category: template.category,
        priority: template.priority,
        status: "OPEN",
        source: "PORTAL",
        requesterId: user.id,
        departmentId: user.departmentId ?? undefined,
        slaDueAt,
      },
    });

    // IT ekibine anlÄ±k acil bildirim fÄ±rlat
    const itAgents = await prisma.user.findMany({
      where: {
        role: { in: ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"] },
        status: "ACTIVE",
      },
      select: { id: true },
    });

    const notifBody = anydeskId
      ? `${userName} AnyDesk ID (${anydeskId}) ile acil uzaktan destek bekliyor.`
      : `${userName} tek tÄ±kla acil destek talebi oluÅŸturdu.`;

    await notifyMany(
      itAgents.map((a) => a.id),
      {
        type: "TICKET_ASSIGNED",
        title: `ğŸš¨ Acil Destek: ${ticketTitle} [${pcName}]`,
        body: notifBody,
        link: `/tickets/${ticket.id}`,
        entityType: "Ticket",
        entityId: ticket.id,
      },
    );

    return NextResponse.json({
      ok: true,
      ticket: {
        id: ticket.id,
        number: ticket.number,
        title: ticket.title,
      },
    });
  } catch (error: any) {
    console.error("Quick report error:", error);
    return NextResponse.json(
      { ok: false, error: "Destek talebi oluÅŸturulamadÄ±." },
      { status: 500 },
    );
  }
}
