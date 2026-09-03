"use server";

import { requireUser } from "@/lib/auth-helpers";
import { DEMO_NOTIFICATIONS } from "@/lib/demo-data";

const IS_DEMO = process.env.DEMO_MODE === "true";

export type NotificationDTO = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export async function fetchNotifications(): Promise<NotificationDTO[]> {
  const user = await requireUser();

  if (IS_DEMO) {
    const notifs =
      DEMO_NOTIFICATIONS[user.id as keyof typeof DEMO_NOTIFICATIONS] ?? [];
    return notifs.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      link: n.link,
      isRead: n.isRead,
      createdAt: new Date(n.createdAt).toISOString(),
    }));
  }

  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    link: r.link,
    isRead: r.isRead,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function markRead(id: string): Promise<{ ok: boolean }> {
  if (IS_DEMO) return { ok: true }; // Demo'da sessizce geç
  const user = await requireUser();
  const { prisma } = await import("@/lib/prisma");
  await prisma.notification.updateMany({
    where: { id, userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return { ok: true };
}

export async function markAllRead(): Promise<{ ok: boolean }> {
  if (IS_DEMO) return { ok: true };
  const user = await requireUser();
  const { prisma } = await import("@/lib/prisma");
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return { ok: true };
}
