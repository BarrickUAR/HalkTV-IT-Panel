"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-helpers";
import { DEMO_USERS } from "@/lib/demo-data";

const IS_DEMO = process.env.DEMO_MODE === "true";

export type MessageDTO = {
  id: string;
  body: string;
  fromMe: boolean;
  createdAt: string;
};

export type Contact = {
  id: string;
  name: string;
  sub: string;
  unread: number;
  role?: string;
  image?: string | null;
};

const DEMO_MESSAGES: MessageDTO[] = [
  {
    id: "dm-1",
    body: "Merhaba, VPN sorununu araştırıyorum.",
    fromMe: false,
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    id: "dm-2",
    body: "Teşekkürler, ne zaman çözülecek?",
    fromMe: true,
    createdAt: new Date(Date.now() - 3500 * 1000).toISOString(),
  },
];

export async function fetchContacts(
  query?: string,
): Promise<{ contacts: Contact[]; totalUnread: number }> {
  const me = await requireUser();
  const q = (query ?? "").trim().toLowerCase();

  if (IS_DEMO) {
    const contacts = DEMO_USERS.filter(
      (u) =>
        u.id !== me.id &&
        (!q ||
          u.name?.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)),
    ).map((u) => ({
      id: u.id,
      name: u.name ?? u.email,
      sub: u.title ?? u.role,
      unread: 0,
      role: u.role,
      image: u.image,
    }));
    return { contacts, totalUnread: 0 };
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const { ROLE_LABELS } = await import("@/lib/rbac/roles");

    const [users, unread] = await Promise.all([
      prisma.user.findMany({
        where: {
          status: "ACTIVE",
          id: { not: me.id },
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: { id: true, name: true, email: true, title: true, role: true, image: true },
        orderBy: { name: "asc" },
        take: 100,
      }),
      prisma.directMessage.groupBy({
        by: ["senderId"],
        where: { recipientId: me.id, isRead: false },
        _count: true,
      }),
    ]);

    const unreadMap = new Map(unread.map((u) => [u.senderId, u._count]));
    const totalUnread = unread.reduce((s, u) => s + u._count, 0);

    const contacts: Contact[] = users
      .map((u) => ({
        id: u.id,
        name: u.name ?? u.email ?? "?",
        sub: u.title ?? ROLE_LABELS[u.role],
        unread: unreadMap.get(u.id) ?? 0,
        role: u.role,
        image: u.image,
      }))
      .sort((a, b) => b.unread - a.unread || a.name.localeCompare(b.name, "tr"));

    return { contacts, totalUnread };
  } catch {
    return { contacts: [], totalUnread: 0 };
  }
}

export async function unreadMessageCount(): Promise<number> {
  if (IS_DEMO) return 0;
  try {
    const me = await requireUser();
    const { prisma } = await import("@/lib/prisma");
    return prisma.directMessage.count({
      where: { recipientId: me.id, isRead: false },
    });
  } catch {
    return 0;
  }
}

export async function fetchThread(otherId: string): Promise<MessageDTO[]> {
  if (IS_DEMO) return DEMO_MESSAGES;
  try {
    const me = await requireUser();
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: me.id, recipientId: otherId },
          { senderId: otherId, recipientId: me.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 300,
    });
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      fromMe: r.senderId === me.id,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function sendMessage(
  recipientId: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  if (IS_DEMO) return { ok: true };
  try {
    const me = await requireUser();
    const text = body.trim();
    if (!text) return { ok: false, error: "Mesaj boş olamaz." };
    if (text.length > 4000) return { ok: false, error: "Mesaj çok uzun." };
    if (recipientId === me.id)
      return { ok: false, error: "Kendine mesaj gönderemezsin." };

    const { prisma } = await import("@/lib/prisma");
    const { notify } = await import("@/lib/notify");

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true },
    });
    if (!recipient) return { ok: false, error: "Kullanıcı bulunamadı." };

    await prisma.directMessage.create({
      data: { senderId: me.id, recipientId, body: text },
    });
    await notify(recipientId, {
      type: "DIRECT_MESSAGE",
      title: `${me.name ?? me.email ?? "Biri"} mesaj gönderdi`,
      body: text.slice(0, 80),
      link: `/messages/${me.id}`,
      entityType: "DirectMessage",
      entityId: me.id,
    });
    revalidatePath(`/messages/${recipientId}`);
    revalidatePath("/messages");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gönderilmedi." };
  }
}

export async function markThreadRead(otherId: string): Promise<void> {
  if (IS_DEMO) return;
  try {
    const me = await requireUser();
    const { prisma } = await import("@/lib/prisma");
    await prisma.directMessage.updateMany({
      where: { senderId: otherId, recipientId: me.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  } catch {
    // sessiz geç
  }
}
