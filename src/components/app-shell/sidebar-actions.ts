"use server";

import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";
import { prisma } from "@/lib/prisma";

export async function fetchSidebarBadgeCounts(): Promise<{ tickets: number; feedbacks: number }> {
  try {
    const user = await requireUser();
    const it = isITStaff(user.role);

    let tickets = 0;
    let feedbacks = 0;

    if (it) {
      const [tCount, fCount] = await Promise.all([
        prisma.ticket.count({
          where: {
            status: { in: ["OPEN", "IN_PROGRESS"] },
            OR: [{ assigneeId: null }, { assigneeId: user.id }],
          },
        }),
        prisma.feedback.count({
          where: { isRead: false },
        }),
      ]);
      tickets = tCount;
      feedbacks = fCount;
    } else {
      tickets = await prisma.ticket.count({
        where: {
          requesterId: user.id,
          status: { in: ["OPEN", "WAITING_REQUESTER"] },
        },
      });
    }

    return { tickets, feedbacks };
  } catch {
    return { tickets: 0, feedbacks: 0 };
  }
}
