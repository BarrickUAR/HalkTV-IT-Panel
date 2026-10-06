import { NextRequest, NextResponse } from "next/server";
import { resolveKioskUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const hostname = url.searchParams.get("hostname");
    const username = url.searchParams.get("username");

    const user = await resolveKioskUser({ userId, hostname, username });
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
    }

    const [
      notifications,
      unreadMessageCount,
      openTickets,
      pendingApprovals,
      unreadFeedbacks
    ] = await Promise.all([
      // Notifications
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      // Unread messages
      prisma.directMessage.count({
        where: { recipientId: user.id, isRead: false },
      }),
      // Sidebar: open tickets
      prisma.ticket.count({
        where: {
          status: { in: ["OPEN", "IN_PROGRESS"] },
          OR: [{ assigneeId: user.id }, { requesterId: user.id }],
        },
      }),
      // Sidebar: pending approvals
      prisma.approval.count({
        where: { approverId: user.id, status: "PENDING" },
      }),
      // Sidebar: unread feedbacks (only for IT staff)
      ["IT_AGENT", "TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"].includes(user.role)
        ? prisma.feedback.count({ where: { isRead: false } })
        : Promise.resolve(0)
    ]);

    return NextResponse.json({
      notifications: notifications.map(r => ({
        id: r.id,
        title: r.title,
        body: r.body,
        link: r.link,
        isRead: r.isRead,
        createdAt: r.createdAt.toISOString(),
      })),
      unreadMessages: unreadMessageCount,
      sidebar: {
        openTickets,
        pendingApprovals,
        unreadFeedbacks,
        unreadMessages: unreadMessageCount,
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
