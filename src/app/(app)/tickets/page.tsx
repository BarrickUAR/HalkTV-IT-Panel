import type { Metadata } from "next";
import Link from "next/link";
import {
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineInbox,
  HiOutlinePlay,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineLockClosed,
  HiOutlineXCircle
} from "react-icons/hi2";
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
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/ticket-labels";
import { prisma } from "@/lib/prisma";
import { TicketsTable } from "./bulk-select";

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
        requester: { select: { name: true, email: true, title: true, image: true, department: { select: { name: true, floor: true } }, computers: { select: { name: true }, take: 1 } } },
        assignee: { select: { name: true } },
      },
    }),
    it
      ? prisma.user.findMany({
          where: {
            role: { in: ["IT_AGENT", "TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"] },
            status: "ACTIVE",
          },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const tickets = t;
  const agents = a;

  const hasFilter = Boolean(q || status || priority || category || atanan);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {it ? "Talepler" : "Taleplerim"}
        </h1>
        {!it && (
          <Link
            href="/tickets/new"
            className={cn(buttonVariants(), "h-10 gap-2 px-4")}
          >
            <HiOutlinePlus className="size-4" /> Yeni Talep
          </Link>
        )}
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card p-16 text-center shadow-sm">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <HiOutlineMagnifyingGlass className="size-8 text-primary/60" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-foreground">Talep Bulunamadı</h3>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            {hasFilter
              ? "Seçtiğiniz filtrelere uygun bir talep bulunmuyor. Farklı filtreler deneyebilir veya mevcut aramayı temizleyebilirsiniz."
              : "Henüz oluşturulmuş bir talep yok. Teknik destek veya donanım ihtiyaçlarınız için hemen yeni bir talep açabilirsiniz."}
          </p>
          {hasFilter ? (
            <Link
              href="/tickets"
              className={cn(buttonVariants({ variant: "outline" }), "font-semibold")}
            >
              Filtreyi Temizle
            </Link>
          ) : (
            <Link
              href="/tickets/new"
              className={cn(buttonVariants({ variant: "default" }), "font-semibold shadow-sm")}
            >
              <HiOutlinePlus className="mr-2 size-4" /> Yeni Talep Aç
            </Link>
          )}
        </div>
      ) : (
        <TicketsTable
          tickets={tickets}
          isIT={it}
          canDelete={["TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"].includes(user.role)}
          count={tickets.length}
        />
      )}
    </div>
  );
}
