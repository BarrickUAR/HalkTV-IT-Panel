import type { Metadata } from "next";
import Link from "next/link";
import { HiOutlineMagnifyingGlass, HiOutlineUser } from "react-icons/hi2";

import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mesajlar" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const me = await requireUser();
  const query = (q ?? "").trim();

  const [users, unread] = await Promise.all([
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
  ]);
  const unreadMap = new Map(unread.map((u) => [u.senderId, u._count]));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mesajlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bir kişiye tıkla, sohbete başla.
        </p>
      </div>

      <form method="get" className="relative">
        <HiOutlineMagnifyingGlass className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={query}
          placeholder="Kişi ara…"
          className="h-11 pl-9"
        />
      </form>

      {users.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Kişi bulunamadı.
        </div>
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {users.map((u) => {
            const count = unreadMap.get(u.id) ?? 0;
            return (
              <Link
                key={u.id}
                href={`/messages/${u.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <HiOutlineUser className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {u.name ?? u.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.title ?? ROLE_LABELS[u.role]}
                  </p>
                </div>
                {count > 0 ? (
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground",
                    )}
                  >
                    {count > 9 ? "9+" : count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
