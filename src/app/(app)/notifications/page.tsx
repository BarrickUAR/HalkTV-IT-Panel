import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

import { MarkAllReadButton } from "./mark-all";

export const metadata: Metadata = { title: "Bildirimler" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const hasUnread = items.some((i) => !i.isRead);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Bildirimler</h1>
        {hasUnread ? <MarkAllReadButton /> : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Bildirim yok.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          {items.map((n) => (
            <Link
              key={n.id}
              href={n.link ?? "#"}
              className={cn(
                "flex items-start gap-3 border-b px-4 py-3 text-sm last:border-b-0 hover:bg-muted/40",
                !n.isRead && "bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  n.isRead ? "bg-transparent" : "bg-primary",
                )}
              />
              <div>
                <p className="font-medium">{n.title}</p>
                {n.body ? (
                  <p className="text-muted-foreground">{n.body}</p>
                ) : null}
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {format(n.createdAt, "d MMM yyyy HH:mm", { locale: tr })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
