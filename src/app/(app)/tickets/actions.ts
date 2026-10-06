"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth-helpers";
import { notifyMany } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/upload";
import { nextTicketNumber } from "@/lib/tickets";
import { verifyUploadClaim } from "@/lib/upload-claim";

const schema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter olmalı.").max(200),
  description: z
    .string()
    .trim()
    .min(5, "Açıklama en az 5 karakter olmalı.")
    .max(5000),
  category: z.enum([
    "HARDWARE",
    "SOFTWARE",
    "ACCOUNT_ACCESS",
    "NETWORK",
    "EMAIL",
    "OTHER",
  ]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  location: z.string().trim().min(2, "Lütfen bir kat/departman seçin."),
});

export type CreateTicketState = { error: string } | undefined;

export async function createTicket(
  _prev: CreateTicketState,
  formData: FormData,
): Promise<CreateTicketState> {
  const user = await requireUser();

  const parsed = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    location: formData.get("location"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formu kontrol et." };
  }

  type ClaimedAttachment = { url: string; claimToken: string; fileName: string; mimeType: string; sizeBytes: number };
  let claimedAttachments: ClaimedAttachment[] = [];
  const claimsRaw = formData.get("attachmentClaims");
  if (claimsRaw) {
    try {
      const parsedClaims: unknown = JSON.parse(String(claimsRaw));
      if (!Array.isArray(parsedClaims) || parsedClaims.length > 10) return { error: "En fazla 10 dosya ekleyebilirsiniz." };
      claimedAttachments = parsedClaims as ClaimedAttachment[];
      if (claimedAttachments.some(item => !item || typeof item.url !== "string" || !verifyUploadClaim(item.claimToken, user.id, item.url, "tickets") || !Number.isInteger(item.sizeBytes) || item.sizeBytes < 1 || item.sizeBytes > 50 * 1024 * 1024)) {
        return { error: "Eklenen dosyalardan biri doğrulanamadı." };
      }
    } catch {
      return { error: "Dosya bilgileri okunamadı." };
    }
  }

  const number = await nextTicketNumber();
  const SLA_HOURS: Record<string, number> = {
    URGENT: 4,
    HIGH: 8,
    MEDIUM: 24,
    LOW: 72,
  };

  const { location, ...ticketData } = parsed.data;

  const ticket = await prisma.ticket.create({
    data: {
      number,
      ...ticketData,
      departmentId: location === "other" ? null : location,
      requesterId: user.id,
      slaDueAt: new Date(
        Date.now() + (SLA_HOURS[parsed.data.priority] ?? 24) * 3_600_000,
      ),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "TICKET_CREATED",
      entityType: "Ticket",
      entityId: ticket.id,
      metadata: {
        ticketNumber: ticket.number,
        title: ticket.title,
        priority: ticket.priority,
        category: ticket.category,
      },
    }
  });

  for (const item of claimedAttachments) {
    await prisma.attachment.create({ data: {
      ticketId: ticket.id,
      uploaderId: user.id,
      fileName: String(item.fileName || "Ek dosya").slice(0, 255),
      mimeType: String(item.mimeType || "application/octet-stream").slice(0, 150),
      sizeBytes: item.sizeBytes,
      storagePath: item.url,
    } });
  }

  const attachment = formData.get("attachment") as File | null;
  if (attachment && attachment.size > 0) {
    const res = await saveUpload(attachment, "tickets");
    if (res.ok) {
      await prisma.attachment.create({
        data: {
          ticketId: ticket.id,
          uploaderId: user.id,
          fileName: res.fileName,
          mimeType: res.mimeType,
          sizeBytes: res.sizeBytes,
          storagePath: res.url,
        }
      });
    }
  }

  // IT ekibine yeni talep bildir
  const itStaff = await prisma.user.findMany({
    where: {
      role: { in: ["IT_AGENT", "TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"] },
      status: "ACTIVE",
      id: { not: user.id },
    },
    select: { id: true },
  });
  await notifyMany(
    itStaff.map((u) => u.id),
    {
      type: "TICKET_CREATED",
      title: `${user.name ?? user.email ?? "Bir personel"} yeni talep açtı`,
      body: ticket.title,
      link: `/tickets/${ticket.id}`,
      entityType: "Ticket",
      entityId: ticket.id,
    },
  );

  revalidatePath("/tickets");
  redirect(`/tickets/${ticket.id}`);
}

// ─── Toplu Silme ────────────────────────────────────────────
export type BulkDeleteResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

export async function bulkDeleteTickets(
  ids: string[],
): Promise<BulkDeleteResult> {
  const user = await requireUser();

  // Sadece teknik yönetim silebilir
  if (!["TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"].includes(user.role)) {
    return { ok: false, error: "Bu işlem için yetkiniz yok." };
  }

  if (!ids.length) return { ok: false, error: "Silinecek talep seçilmedi." };
  if (ids.length > 200) return { ok: false, error: "Tek seferde en fazla 200 talep silinebilir." };

  // Cascade: onDelete:Cascade zaten bağlı kayıtları siliyor.
  // Yine de auditLog ve notification'ları manuel temizle (farklı entity)
  await prisma.auditLog.deleteMany({ where: { entityType: "Ticket", entityId: { in: ids } } }).catch(() => {});
  await prisma.notification.deleteMany({ where: { entityType: "Ticket", entityId: { in: ids } } }).catch(() => {});

  const { count } = await prisma.ticket.deleteMany({ where: { id: { in: ids } } });

  revalidatePath("/tickets");
  return { ok: true, count };
}
