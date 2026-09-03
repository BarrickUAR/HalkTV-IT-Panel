import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineViewColumns,
  HiOutlinePlus,
  HiOutlineTicket,
  HiOutlineExclamationTriangle,
  HiOutlineUsers,
} from "react-icons/hi2";
import type { IconType } from "react-icons";


import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@prisma/client";
import { STATUS_BADGE, STATUS_LABELS } from "@/lib/ticket-labels";

import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Panel" };

type Stat = { icon: IconType; label: string; value: number; tone: string; href?: string };

function StatCard({ icon: Icon, label, value, tone, href }: Stat) {
  const inner = (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          tone,
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl leading-none font-bold tracking-tight">{value}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="rounded-xl border bg-card p-5 block transition-colors hover:bg-muted/40">
        {inner}
      </Link>
    );
  }
  return <div className="rounded-xl border bg-card p-5">{inner}</div>;
}

type RecentTicket = {
  id: string;
  number: string;
  title: string;
  status: TicketStatus;
  createdAt: Date;
};

export default async function DashboardPage() {
  const user = await requireUser();
  const it = isITStaff(user.role);
  const firstName = user.name?.split(" ")[0];

  let stats: Stat[];
  let recent: RecentTicket[];

  const recentSelect = {
    id: true,
    number: true,
    title: true,
    status: true,
    createdAt: true,
  } as const;

    if (it) {
      const [open, inProgress, unassigned, users, recentTickets] =
        await Promise.all([
          prisma.ticket.count({ where: { status: "OPEN" } }),
          prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
          prisma.ticket.count({
            where: { assigneeId: null, status: { in: ["OPEN", "IN_PROGRESS"] } },
          }),
          prisma.user.count(),
          prisma.ticket.findMany({
            orderBy: { createdAt: "desc" },
            take: 6,
            select: recentSelect,
          }),
        ]);
      stats = [
        {
          icon: HiOutlineTicket,
          label: "Açık talepler",
          value: open,
          tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
          href: "/tickets?durum=OPEN",
        },
        {
          icon: HiOutlineClock,
          label: "İşlemde",
          value: inProgress,
          tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          href: "/tickets?durum=IN_PROGRESS",
        },
        {
          icon: HiOutlineExclamationTriangle,
          label: "Atanmamış",
          value: unassigned,
          tone: "bg-red-500/10 text-red-600 dark:text-red-400",
          href: "/tickets?atanan=yok",
        },
        {
          icon: HiOutlineUsers,
          label: "Kullanıcı",
          value: users,
          tone: "bg-primary/10 text-primary",
          href: "/users",
        },
      ];
      recent = recentTickets;
    } else {
      const [myOpen, myResolved, recentTickets] = await Promise.all([
        prisma.ticket.count({
          where: {
            requesterId: user.id,
            status: { in: ["OPEN", "IN_PROGRESS", "WAITING_REQUESTER"] },
          },
        }),
        prisma.ticket.count({
          where: { requesterId: user.id, status: { in: ["RESOLVED", "CLOSED"] } },
        }),
        prisma.ticket.findMany({
          where: { requesterId: user.id },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: recentSelect,
        }),
      ]);
      stats = [
        {
          icon: HiOutlineTicket,
          label: "Açık taleplerim",
          value: myOpen,
          tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        },
        {
          icon: HiOutlineCheckCircle,
          label: "Çözülen",
          value: myResolved,
          tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        },
      ];
      recent = recentTickets;
    }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Üst başlık */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {firstName ? `Merhaba, ${firstName}` : "Hoş Geldiniz"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {it
              ? "Destek operasyonuna genel bakış."
              : "Bir sorunun mu var? Yeni talep aç, biz ilgilenelim."}
          </p>
        </div>
        <Link
          href="/tickets/new"
          className={cn(buttonVariants(), "h-10 gap-2 px-4")}
        >
          <HiOutlinePlus className="size-4" /> Yeni Talep
        </Link>
      </div>

      {/* İstatistik kartları */}
      <div
        className={cn(
          "grid grid-cols-2 gap-4",
          stats.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-2",
        )}
      >
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Son talepler */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-semibold">
            {it ? "Son Talepler" : "Son Taleplerim"}
          </h2>
          <Link
            href="/tickets"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Tümü <HiOutlineArrowRight className="size-3" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Henüz talep yok.
          </p>
        ) : (
          <div className="divide-y">
            {recent.map((t) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {t.number} ·{" "}
                    {format(new Date(t.createdAt), "d MMM", { locale: tr })}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                    STATUS_BADGE[t.status],
                  )}
                >
                  {STATUS_LABELS[t.status]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Hızlı linkler (IT) */}
      {it ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { href: "/board", label: "Pano", desc: "Kanban görünümü", icon: HiOutlineViewColumns },
            { href: "/tickets", label: "Tüm Talepler", desc: "Listele ve yönet", icon: HiOutlineTicket },
            { href: "/reports", label: "Raporlar", desc: "İstatistikler", icon: HiOutlineClock },
          ].map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
            >
              <q.icon className="size-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{q.label}</p>
                <p className="text-xs text-muted-foreground">{q.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
