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
import { ChatTriggerButton } from "./chat-trigger-button";
import { DashboardCharts } from "./charts";

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
  requester?: {
    name: string | null;
    title: string | null;
    department: { name: string } | null;
  };
};

export default async function DashboardPage() {
  const user = await requireUser();
  const it = isITStaff(user.role);
  const firstName = user.name?.split(" ")[0];

  let stats: Stat[];
  let recent: RecentTicket[];

  let categoryData: any[] = [];
  let trendData: any[] = [];

  const recentSelect = {
    id: true,
    title: true,
    number: true,
    status: true,
    createdAt: true,
    requester: {
      select: { name: true, email: true, title: true, department: { select: { name: true } } }
    },
  } as const;

    if (it) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [open, inProgress, unassigned, users, recentTickets, categoryCounts, trendRaw] = await Promise.all([
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
        prisma.ticket.groupBy({
          by: ['category'],
          _count: true,
        }),
        prisma.ticket.findMany({
          where: { createdAt: { gte: sevenDaysAgo } },
          select: { createdAt: true },
        }),
      ]);

      const trendMap = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        trendMap.set(format(d, "dd MMM", { locale: tr }), 0);
      }
      trendRaw.forEach(t => {
        const d = format(t.createdAt, "dd MMM", { locale: tr });
        if (trendMap.has(d)) trendMap.set(d, trendMap.get(d)! + 1);
      });
      trendData = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }));

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
      categoryData = categoryCounts;
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

  if (it) {
    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {firstName ? `Merhaba, ${firstName}` : "Hoş Geldiniz"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Destek operasyonuna genel bakış.</p>
          </div>
          <Link href="/tickets/new" className={cn(buttonVariants(), "h-10 gap-2 px-4")}>
            <HiOutlinePlus className="size-4" /> Yeni Talep
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h2 className="text-sm font-semibold">Son Talepler</h2>
            <Link href="/tickets" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Tümü <HiOutlineArrowRight className="size-3" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Sistemde henüz işlem gören veya açılmış bir talep bulunmuyor.</p>
          ) : (
            <div className="divide-y">
              {recent.map((t) => (
                <Link key={t.id} href={`/tickets/${t.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <span className="text-sm font-bold uppercase">
                      {t.requester?.name?.charAt(0) ?? "?"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono font-medium text-primary/80">#{t.number}</span>
                      <span className="opacity-50">•</span>
                      <span className="font-medium text-foreground">{t.requester?.name ?? "İsimsiz"}</span>
                      {t.requester?.title && (
                         <>
                           <span className="opacity-50">•</span>
                           <span>{t.requester.title}</span>
                         </>
                      )}
                      {t.requester?.department?.name && (
                         <>
                           <span className="opacity-50">•</span>
                           <span>{t.requester.department.name}</span>
                         </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", STATUS_BADGE[t.status])}>{STATUS_LABELS[t.status]}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(t.createdAt), "d MMM HH:mm", { locale: tr })}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { href: "/board", label: "Pano", desc: "Kanban görünümü", icon: HiOutlineViewColumns },
            { href: "/tickets", label: "Tüm Talepler", desc: "Listele ve yönet", icon: HiOutlineTicket },
            { href: "/reports", label: "Raporlar", desc: "İstatistikler", icon: HiOutlineClock },
          ].map((h) => (
            <Link key={h.href} href={h.href} className="group relative overflow-hidden rounded-xl border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-muted/40">
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <h.icon className="size-5" />
              </div>
              <p className="font-semibold">{h.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{h.desc}</p>
            </Link>
          ))}
        </div>

        <DashboardCharts categoryData={categoryData} trendData={trendData} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Employee Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 to-primary/60 p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {firstName ? `İyi çalışmalar, ${firstName}! 👋` : "Hoş Geldiniz!"}
          </h1>
          <p className="text-white/80 text-sm md:text-base mb-6">
            IT ekibi olarak size yardımcı olmak için buradayız. Yaşadığınız teknik bir problem varsa veya yeni bir cihaza ihtiyacınız varsa anında talep oluşturabilirsiniz.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/tickets/new" className={cn(buttonVariants({ variant: "secondary" }), "rounded-xl px-6 font-semibold shadow-sm hover:scale-105 transition-transform")}>
              <HiOutlinePlus className="size-4 mr-2" /> Hızlı Talep Oluştur
            </Link>
            <ChatTriggerButton />
          </div>
        </div>
        <HiOutlineTicket className="absolute -right-10 -bottom-10 size-64 text-white/10 rotate-12 pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Stats & Quick Actions */}
        <div className="md:col-span-1 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border bg-card p-5 shadow-sm text-center">
                <div className={cn("mx-auto flex size-12 items-center justify-center rounded-full mb-3", s.tone)}>
                  <s.icon className="size-6" />
                </div>
                <p className="text-3xl font-bold tracking-tight">{s.value}</p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-bold flex items-center gap-2 mb-4">
              <HiOutlineViewColumns className="size-4 text-primary" /> Faydalı Linkler
            </h2>
            <div className="flex flex-col gap-2">
              <Link href="/knowledge" className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-all">
                <span className="text-sm font-medium">Bilgi Bankası</span>
                <HiOutlineArrowRight className="size-4 text-muted-foreground" />
              </Link>
              <Link href="/profile" className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-all">
                <span className="text-sm font-medium">Profil Ayarları</span>
                <HiOutlineArrowRight className="size-4 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Tickets */}
        <div className="md:col-span-2">
          <div className="rounded-2xl border bg-card shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <HiOutlineClock className="size-5 text-primary" /> Son Taleplerim
              </h2>
              <Link href="/tickets" className="text-xs font-semibold text-primary hover:underline">
                Tümünü Gör
              </Link>
            </div>
            
            <div className="flex-1 p-2">
              {recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground space-y-3">
                  <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                    <HiOutlineTicket className="size-8 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">Şu an aktif bir talebiniz yok.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recent.map((t) => (
                    <Link key={t.id} href={`/tickets/${t.id}`} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl hover:bg-muted/40 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold group-hover:text-primary transition-colors">{t.title}</p>
                        <p className="font-mono text-[11px] text-muted-foreground mt-1">
                          #{t.number} <span className="mx-1">•</span> {format(new Date(t.createdAt), "d MMM, HH:mm", { locale: tr })}
                        </p>
                      </div>
                      <span className={cn("shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold border", STATUS_BADGE[t.status])}>
                        {STATUS_LABELS[t.status]}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
