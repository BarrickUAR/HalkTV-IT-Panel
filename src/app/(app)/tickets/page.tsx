import type { Metadata } from "next";
import Link from "next/link";
import { HiOutlinePlus, HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@prisma/client";

import { buttonVariants } from "@/components/ui/button";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  PRIORITY_BADGE,
  PRIORITY_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
} from "@/lib/ticket-labels";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Talepler" };

const fieldClass =
  "h-9 rounded-lg border border-input bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

type Search = {
  q?: string;
  durum?: string;
  oncelik?: string;
  kategori?: string;
  atanan?: string;
};

type TicketRow = {
  id: string;
  number: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: Date;
  requester: { name: string | null; email: string | null };
  assignee: { name: string | null } | null;
  slaDueAt: Date | null;
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const it = isITStaff(user.role);

  const q = sp.q?.trim() ?? "";
  const status =
    sp.durum && sp.durum in STATUS_LABELS
      ? (sp.durum as TicketStatus)
      : undefined;
  const priority =
    sp.oncelik && sp.oncelik in PRIORITY_LABELS
      ? (sp.oncelik as TicketPriority)
      : undefined;
  const category =
    sp.kategori && sp.kategori in CATEGORY_LABELS
      ? (sp.kategori as TicketCategory)
      : undefined;
  const atanan = it ? (sp.atanan ?? "") : "";

  const where: Prisma.TicketWhereInput = {
    ...(it ? {} : { requesterId: user.id }),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(category ? { category } : {}),
    ...(atanan === "yok"
      ? { assigneeId: null }
      : atanan
        ? { assigneeId: atanan }
        : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [t, a] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        requester: { select: { name: true, email: true } },
        assignee: { select: { name: true } },
      },
    }),
    it
      ? prisma.user.findMany({
          where: {
            role: { in: ["IT_AGENT", "IT_LEAD", "IT_MANAGER", "SUPER_ADMIN"] },
            status: "ACTIVE",
          },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const tickets = t as TicketRow[];
  const agents = a;

  const hasFilter = Boolean(q || status || priority || category || atanan);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {it ? "Talepler" : "Taleplerim"}
        </h1>
        <Link
          href="/tickets/new"
          className={cn(buttonVariants(), "h-10 gap-2 px-4")}
        >
          <HiOutlinePlus className="size-4" /> Yeni Talep
        </Link>
      </div>

      {/* Filtreler */}
      <form
        method="get"
        action="/tickets"
        className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3"
      >
        <div className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border bg-background px-3">
          <HiOutlineMagnifyingGlass className="size-4 shrink-0 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="No veya konu ara…"
            className="h-9 w-full bg-transparent text-sm outline-none"
          />
        </div>
        <select name="durum" defaultValue={status ?? ""} className={fieldClass}>
          <option value="">Tüm durumlar</option>
          {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          name="oncelik"
          defaultValue={priority ?? ""}
          className={fieldClass}
        >
          <option value="">Tüm öncelikler</option>
          {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
        <select
          name="kategori"
          defaultValue={category ?? ""}
          className={fieldClass}
        >
          <option value="">Tüm kategoriler</option>
          {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        {it ? (
          <select name="atanan" defaultValue={atanan} className={fieldClass}>
            <option value="">Tüm atananlar</option>
            <option value="yok">Atanmamış</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name ?? a.email}
              </option>
            ))}
          </select>
        ) : null}
        <button
          type="submit"
          className={cn(buttonVariants({ size: "sm" }), "h-9")}
        >
          Uygula
        </button>
        {hasFilter ? (
          <Link
            href="/tickets"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-9",
            )}
          >
            Temizle
          </Link>
        ) : null}
      </form>

      {/* Tablo */}
      {tickets.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          {hasFilter ? (
            <>
              Bu filtreyle talep yok.{" "}
              <Link href="/tickets" className="text-primary hover:underline">
                Filtreyi temizle.
              </Link>
            </>
          ) : (
            <>
              Henüz talep yok.{" "}
              <Link
                href="/tickets/new"
                className="text-primary hover:underline"
              >
                Yeni talep aç.
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <div className="border-b px-4 py-2 text-xs text-muted-foreground">
            {tickets.length} talep
          </div>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">No</th>
                <th className="px-4 py-3 font-medium">Konu</th>
                <th className="px-4 py-3 font-medium">Öncelik</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                {it ? (
                  <>
                    <th className="px-4 py-3 font-medium">Talep eden</th>
                    <th className="px-4 py-3 font-medium">Atanan</th>
                  </>
                ) : null}
                <th className="px-4 py-3 font-medium">SLA</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const slaBreached =
                  t.slaDueAt &&
                  t.slaDueAt < new Date() &&
                  ["OPEN", "IN_PROGRESS", "WAITING_REQUESTER"].includes(t.status);
                return (
                  <tr
                    key={t.id}
                    className="border-t transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/tickets/${t.id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {t.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/tickets/${t.id}`}
                        className="font-medium hover:underline"
                      >
                        {t.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[t.category]}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                          PRIORITY_BADGE[t.priority],
                        )}
                      >
                        {PRIORITY_LABELS[t.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                          STATUS_BADGE[t.status],
                        )}
                      >
                        {STATUS_LABELS[t.status]}
                      </span>
                    </td>
                    {it ? (
                      <>
                        <td className="px-4 py-3 text-muted-foreground">
                          {t.requester.name ?? t.requester.email}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {t.assignee?.name ?? (
                            <span className="text-amber-600 dark:text-amber-400">
                              Atanmamış
                            </span>
                          )}
                        </td>
                      </>
                    ) : null}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {t.slaDueAt ? (
                        <span
                          className={cn(
                            "text-xs",
                            slaBreached
                              ? "font-semibold text-red-600 dark:text-red-400"
                              : "text-muted-foreground",
                          )}
                        >
                          {slaBreached ? "⚠ " : ""}
                          {format(new Date(t.slaDueAt), "d MMM HH:mm", {
                            locale: tr,
                          })}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                      {format(new Date(t.createdAt), "d MMM yyyy", {
                        locale: tr,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
