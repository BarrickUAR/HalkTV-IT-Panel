import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HiOutlineArrowDownTray } from "react-icons/hi2";

import type {
  Role,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@prisma/client";

import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/permissions";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/ticket-labels";

import { PrintReportButton } from "./print-button";

export const metadata: Metadata = { title: "Raporlar" };

type Row = { label: string; count: number };

function Breakdown({ title, rows }: { title: string; rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Veri yok.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 text-sm">
              <span className="w-32 shrink-0 truncate text-muted-foreground">
                {r.label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right font-medium">
                {r.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function ReportsPage() {
  const user = await requireUser();
  if (!can(user.role, "report:view")) redirect("/dashboard");

  const [
    totalTickets,
    byStatus,
    byPriority,
    byCategory,
    resolvedList,
    byAssignee,
    usersByRole,
  ] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.groupBy({ by: ["status"], _count: true }),
    prisma.ticket.groupBy({ by: ["priority"], _count: true }),
    prisma.ticket.groupBy({ by: ["category"], _count: true }),
    prisma.ticket.findMany({
      where: { resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
      take: 500,
    }),
    prisma.ticket.groupBy({
      by: ["assigneeId"],
      where: {
        assigneeId: { not: null },
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING_REQUESTER"] },
      },
      _count: true,
    }),
    prisma.user.groupBy({ by: ["role"], _count: true }),
  ]);

  const statusCount = new Map(byStatus.map((r) => [r.status, r._count]));
  const priorityCount = new Map(byPriority.map((r) => [r.priority, r._count]));
  const categoryCount = new Map(byCategory.map((r) => [r.category, r._count]));
  const roleCount = new Map(usersByRole.map((r) => [r.role, r._count]));

  const open =
    (statusCount.get("OPEN") ?? 0) +
    (statusCount.get("IN_PROGRESS") ?? 0) +
    (statusCount.get("WAITING_REQUESTER") ?? 0);
  const resolved =
    (statusCount.get("RESOLVED") ?? 0) + (statusCount.get("CLOSED") ?? 0);

  const avgMs = resolvedList.length
    ? resolvedList.reduce(
        (s, t) => s + (t.resolvedAt!.getTime() - t.createdAt.getTime()),
        0,
      ) / resolvedList.length
    : 0;
  const avgHours = avgMs / 3_600_000;
  const avgLabel =
    resolvedList.length === 0
      ? "—"
      : avgHours < 48
        ? `${avgHours.toFixed(1)} saat`
        : `${(avgHours / 24).toFixed(1)} gün`;

  const statusRows = (Object.keys(STATUS_LABELS) as TicketStatus[])
    .map((s) => ({ label: STATUS_LABELS[s], count: statusCount.get(s) ?? 0 }))
    .filter((r) => r.count > 0);
  const priorityRows = (Object.keys(PRIORITY_LABELS) as TicketPriority[])
    .map((p) => ({ label: PRIORITY_LABELS[p], count: priorityCount.get(p) ?? 0 }))
    .filter((r) => r.count > 0);
  const categoryRows = (Object.keys(CATEGORY_LABELS) as TicketCategory[])
    .map((c) => ({ label: CATEGORY_LABELS[c], count: categoryCount.get(c) ?? 0 }))
    .filter((r) => r.count > 0);
  const roleRows = (Object.keys(ROLE_LABELS) as Role[])
    .map((r) => ({ label: ROLE_LABELS[r], count: roleCount.get(r) ?? 0 }))
    .filter((r) => r.count > 0);

  const agents = await prisma.user.findMany({
    where: { id: { in: byAssignee.map((r) => r.assigneeId!).filter(Boolean) } },
    select: { id: true, name: true, email: true },
  });
  const agentName = new Map(
    agents.map((a) => [a.id, a.name ?? a.email ?? "?"]),
  );
  const workloadRows = byAssignee
    .map((r) => ({
      label: agentName.get(r.assigneeId!) ?? "?",
      count: r._count,
    }))
    .sort((a, b) => b.count - a.count);

  const stats = [
    { label: "Toplam talep", value: totalTickets },
    { label: "Açık", value: open },
    { label: "Çözülen", value: resolved },
    { label: "Ort. çözüm", value: avgLabel },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">Raporlar</h1>
        <div className="flex items-center gap-2">
          <a
            href="/api/reports/tickets.csv"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <HiOutlineArrowDownTray className="size-4" /> CSV İndir
          </a>
          <PrintReportButton />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p
              className={cn(
                "mt-2 font-bold tracking-tight",
                typeof s.value === "number" ? "text-3xl" : "text-2xl",
              )}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="Duruma göre talepler" rows={statusRows} />
        <Breakdown title="Önceliğe göre talepler" rows={priorityRows} />
        <Breakdown title="Kategoriye göre talepler" rows={categoryRows} />
        <Breakdown title="IT iş yükü (açık talepler)" rows={workloadRows} />
        <Breakdown title="Kullanıcılar (rol)" rows={roleRows} />
      </div>
    </div>
  );
}
