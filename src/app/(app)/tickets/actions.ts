"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth-helpers";
import { notifyMany } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { uploadFileToSupabase } from "@/lib/supabase";
import { nextTicketNumber } from "@/lib/tickets";

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

  const number = await nextTicketNumber();
  const SLA_HOURS: Record<string, number> = {
    URGENT: 4,
    HIGH: 8,
    MEDIUM: 24,
    LOW: 72,
  };
  const ticket = await prisma.ticket.create({
    data: {
      number,
      ...parsed.data,
      requesterId: user.id,
      slaDueAt: new Date(
        Date.now() + (SLA_HOURS[parsed.data.priority] ?? 24) * 3_600_000,
      ),
    },
  });

  const attachment = formData.get("attachment") as File | null;
  if (attachment && attachment.size > 0) {
    const path = await uploadFileToSupabase(attachment);
    if (path) {
      await prisma.attachment.create({
        data: {
          ticketId: ticket.id,
          uploaderId: user.id,
          fileName: attachment.name,
          mimeType: attachment.type,
          sizeBytes: attachment.size,
          storagePath: path,
        }
      });
    }
  }

  // IT ekibine yeni talep bildir
  const itStaff = await prisma.user.findMany({
    where: {
      role: { in: ["IT_AGENT", "IT_LEAD", "IT_MANAGER", "SUPER_ADMIN"] },
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
