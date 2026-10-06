import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { MessagesClient } from "./messages-client";

export const metadata: Metadata = { title: "Mesajlar & Cihaz Bildirimleri" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const me = await requireUser();
  const query = (q ?? "").trim();

  const isItStaff = ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"].includes(me.role);

  const [users, unread, computers] = await Promise.all([
    prisma.user.findMany({
      where: {
        status: "ACTIVE",
        id: { not: me.id },
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true, email: true, title: true, role: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.directMessage.groupBy({
      by: ["senderId"],
      where: { recipientId: me.id, isRead: false },
      _count: true,
    }),
    isItStaff
      ? prisma.computer.findMany({
          orderBy: { updatedAt: "desc" },
          include: {
            user: { select: { id: true, name: true, email: true } },
            department: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const unreadRecord: Record<string, number> = {};
  for (const u of unread) {
    unreadRecord[u.senderId] = u._count;
  }

  return (
    <MessagesClient
      users={users}
      unreadMap={unreadRecord}
      computers={computers as any}
      isItStaff={isItStaff}
    />
  );
}
