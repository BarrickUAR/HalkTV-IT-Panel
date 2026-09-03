"use server";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

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
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id, userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return { ok: true };
}

export async function markAllRead(): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return { ok: true };
}
