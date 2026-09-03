"use server";

import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";
import { DEMO_TICKETS, DEMO_USERS } from "@/lib/demo-data";

const IS_DEMO = process.env.DEMO_MODE === "true";

export type SearchResults = {
  tickets: { id: string; number: string; title: string }[];
  users: { id: string; name: string; sub: string }[];
};

const EMPTY: SearchResults = { tickets: [], users: [] };

export async function globalSearch(query: string): Promise<SearchResults> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return EMPTY;

  const user = await requireUser();
  const it = isITStaff(user.role);
  const isManager = user.role === "IT_MANAGER" || user.role === "SUPER_ADMIN";

  if (IS_DEMO) {
    const tickets = DEMO_TICKETS.filter(
      (t) =>
        (it || t.requesterId === user.id) &&
        (t.number.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q)),
    )
      .slice(0, 6)
      .map((t) => ({ id: t.id, number: t.number, title: t.title }));

    const users = isManager
      ? DEMO_USERS.filter(
          (u) =>
            u.name?.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q),
        )
          .slice(0, 5)
          .map((u) => ({
            id: u.id,
            name: u.name ?? u.email,
            sub: u.title ?? u.email,
          }))
      : [];

    return { tickets, users };
  }

  // ─── Gerçek DB ────────────────────────────────────────────
  try {
    const { prisma } = await import("@/lib/prisma");

    const [tickets, users] = await Promise.all([
      prisma.ticket.findMany({
        where: {
          AND: [
            it ? {} : { requesterId: user.id },
            {
              OR: [
                { number: { contains: q, mode: "insensitive" } },
                { title: { contains: q, mode: "insensitive" } },
              ],
            },
          ],
        },
        select: { id: true, number: true, title: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      isManager
        ? prisma.user.findMany({
            where: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            },
            select: { id: true, name: true, email: true, title: true },
            take: 5,
          })
        : Promise.resolve([]),
    ]);

    return {
      tickets,
      users: users.map((u) => ({
        id: u.id,
        name: u.name ?? u.email ?? "?",
        sub: u.title ?? u.email ?? "",
      })),
    };
  } catch {
    return EMPTY;
  }
}
