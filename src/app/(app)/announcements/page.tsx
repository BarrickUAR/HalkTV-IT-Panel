import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/permissions";
import { cn } from "@/lib/utils";
import {
  ANNOUNCEMENT_BANNER,
  ANNOUNCEMENT_LEVEL_LABELS,
} from "@/lib/announcement-labels";

import { AnnouncementToggle } from "./announcement-toggle";
import { CreateAnnouncementForm } from "./create-form";

export const metadata: Metadata = { title: "Duyurular" };

export default async function AnnouncementsPage() {
  const user = await requireUser();
  if (!can(user.role, "announcement:manage")) redirect("/dashboard");

  const items = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Duyurular</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aktif duyurular tüm kullanıcılara üstte bant olarak görünür.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 font-semibold">Yeni duyuru</h2>
        <CreateAnnouncementForm />
      </section>

      {items.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Henüz duyuru yok.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div
              key={a.id}
              className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-medium",
                      ANNOUNCEMENT_BANNER[a.level],
                    )}
                  >
                    {ANNOUNCEMENT_LEVEL_LABELS[a.level]}
                  </span>
                  {!a.isActive ? (
                    <span className="text-xs text-muted-foreground">
                      (pasif)
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 font-medium">{a.title}</p>
                {a.body ? (
                  <p className="text-sm text-muted-foreground">{a.body}</p>
                ) : null}
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {format(a.createdAt, "d MMM yyyy HH:mm", { locale: tr })}
                </p>
              </div>
              <AnnouncementToggle id={a.id} isActive={a.isActive} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
