"use server";

import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";

const IS_DEMO = process.env.DEMO_MODE === "true";

export async function fetchSidebarBadgeCounts() {
  if (IS_DEMO) return { tickets: 2 };

  try {
    const user = await requireUser();
    const { prisma } = await import("@/lib/prisma");

    const it = isITStaff(user.role);

    let tickets = 0;
    if (it) {
      // IT için atanmamış veya açık talepler
      tickets = await prisma.ticket.count({
        where: {
          status: { in: ["OPEN", "IN_PROGRESS"] },
          OR: [{ assigneeId: null }, { assigneeId: user.id }],
        },
      });
    } else {
      // Normal kullanıcı için ondan cevap bekleyen (WAITING_REQUESTER) veya açık
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
