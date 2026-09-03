"use server";

import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";
import { prisma } from "@/lib/prisma";

export async function fetchSidebarBadgeCounts() {
  try {
    const user = await requireUser();
    const it = isITStaff(user.role);

    let tickets = 0;
    if (it) {
      tickets = await prisma.ticket.count({
        where: {
          status: { in: ["OPEN", "IN_PROGRESS"] },
          OR: [{ assigneeId: null }, { assigneeId: user.id }],
        },
      });
    } else {
      tickets = await prisma.ticket.count({
        where: {
          requesterId: user.id,
          status: { in: ["OPEN", "WAITING_REQUESTER"] },
        },
      });
    }

    return { tickets };
  } catch {
    return { tickets: 0 };
  }
}
