"use client";

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineInbox,
  HiOutlinePlay,
  HiOutlineLockClosed,
  HiOutlineXCircle,
} from "react-icons/hi2";
import type { TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  PRIORITY_BADGE,
  PRIORITY_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
} from "@/lib/ticket-labels";
import { UserAvatar } from "@/components/app-shell/user-avatar";
import { QuickStatusButton } from "./quick-status-button";
import { bulkDeleteTickets } from "./actions";

const STATUS_ICONS: Record<TicketStatus, React.ElementType> = {
  OPEN: HiOutlineInbox,
  IN_PROGRESS: HiOutlinePlay,
  WAITING_REQUESTER: HiOutlineClock,
  RESOLVED: HiOutlineCheckCircle,
  CLOSED: HiOutlineLockClosed,
  CANCELLED: HiOutlineXCircle,
};

type TicketRow = {
  id: string;
  number: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: Date | string;
  requester: {
    name: string | null;
    email: string | null;
    title: string | null;
    image?: string | null;
    department: { name: string; floor: string | null } | null;
    computers?: Array<{ name: string }>;
  };
  assignee: { name: string | null } | null;
  slaDueAt: Date | string | null;
};

interface Props {
  tickets: TicketRow[];
  isIT: boolean;
  canDelete: boolean;
  count: number;
}

export function TicketsTable({ tickets, isIT, canDelete, count }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const allSelected = tickets.length > 0 && selected.size === tickets.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(tickets.map((t) => t.id)));
  };

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleDelete = () => {
    if (!selected.size) return;
    if (!confirm(`${selected.size} talep kalici olarak silinecek. Emin misiniz?`)) return;
    startTransition(async () => {
      const res = await bulkDeleteTickets(Array.from(selected));
      if (res.ok) {
        setSelected(new Set());
        setToast(`${res.count} talep basariyla silindi.`);
        setTimeout(() => setToast(null), 4000);
      } else {
        alert(res.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Bulk action toolbar */}
      {canDelete && selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40 px-4 py-2.5 shadow animate-in slide-in-from-top-2 duration-200">
          <span className="flex-1 text-sm font-semibold text-red-700 dark:text-red-400">
            {selected.size} talep secildi
          </span>
          <button
            onClick={handleDelete}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
          >
            <HiOutlineTrash className="size-4" />
            {pending ? "Siliniyor..." : "Secilenleri Sil"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <HiOutlineXMark className="size-3.5" /> Iptal
          </button>
        </div>
      )}

      {toast && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/50 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <HiOutlineCheckCircle className="size-4" /> {toast}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card relative shadow-sm">
        <div className="sticky top-0 z-30 border-b bg-card px-4 py-2 text-xs text-muted-foreground shadow-sm flex items-center gap-2">
          {canDelete && (
            <span className="text-[10px] text-muted-foreground">
              {selected.size > 0 ? `${selected.size} secili` : ""}
            </span>
          )}
          <span className="flex-1">{count} talep</span>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-[32px] z-20 border-b bg-gradient-to-r from-muted/50 to-muted/20 text-left text-xs text-muted-foreground shadow-sm backdrop-blur-md">
            <tr>
              {canDelete && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="Tumunu sec"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    className="size-4 cursor-pointer accent-primary"
                  />
                </th>
              )}
              {isIT && <th className="px-4 py-3 font-medium">Talep Eden</th>}
              <th className="px-4 py-3 font-medium">Talep Konusu</th>
              <th className="px-4 py-3 font-medium">Oncelik</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              {isIT && <th className="px-4 py-3 font-medium">Atanan</th>}
              <th className="px-4 py-3 font-medium">SLA</th>
              <th className="px-4 py-3 font-medium">Tarih</th>
              {isIT && <th className="px-4 py-3 font-medium text-right">Islem</th>}
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => {
              const isActive = ["OPEN", "IN_PROGRESS", "WAITING_REQUESTER"].includes(t.status);
              const slaDue = t.slaDueAt ? new Date(t.slaDueAt) : null;
              const msRemaining = slaDue ? slaDue.getTime() - Date.now() : Infinity;
              const slaBreached = isActive && msRemaining < 0;
              const slaUrgent = isActive && !slaBreached && msRemaining < 24 * 60 * 60 * 1000;
              const StatusIcon = STATUS_ICONS[t.status];
              const isSelected = selected.has(t.id);

              return (
                <tr
                  key={t.id}
                  className={cn(
                    "border-t transition-colors hover:bg-muted/30 even:bg-muted/10 group relative",
                    isSelected && "bg-primary/5 dark:bg-primary/10",
                  )}
                >
                  {canDelete && (
                    <td className="px-4 py-3 align-middle w-10 relative z-20">
                      <input
                        type="checkbox"
                        aria-label="Sec"
                        checked={isSelected}
                        onChange={() => toggleRow(t.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="size-4 cursor-pointer accent-primary"
                      />
                    </td>
                  )}
                  {isIT && (
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <UserAvatar role="USER" image={t.requester.image} name={t.requester.name} className="size-9 shadow-sm border border-border" />
                        <div className="flex min-w-0 flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold">{t.requester.name ?? "Isimsiz"}</span>
                            {t.requester.computers?.[0]?.name && (
                              <span className="inline-flex items-center font-mono text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border shadow-sm">
                                🖥️ {t.requester.computers[0].name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                            {t.requester.title && <span>{t.requester.title}</span>}
                            {t.requester.title && t.requester.department?.name && <span className="opacity-50">•</span>}
                            {t.requester.department?.name && (
                              <span>{t.requester.department.name}{t.requester.department.floor ? ` (${t.requester.department.floor})` : ""}</span>
                            )}
                            {!t.requester.title && !t.requester.department?.name && <span>{t.requester.email}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-col">
                      <Link
                        href={`/tickets/${t.id}`}
                        className="font-semibold text-foreground group-hover:text-primary transition-colors before:absolute before:inset-0 before:z-10"
                        onClick={(e) => isSelected && e.preventDefault()}
                      >
                        {t.title}
                      </Link>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono font-medium text-primary/80">#{t.number}</span>
                        <span className="opacity-50">•</span>
                        <span>{CATEGORY_LABELS[t.category]}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle relative z-20">
                    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm", PRIORITY_BADGE[t.priority])}>
                      {PRIORITY_LABELS[t.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle relative z-20">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm border", STATUS_BADGE[t.status])}>
                      <StatusIcon className="size-3.5" />
                      {STATUS_LABELS[t.status]}
                    </span>
                  </td>
                  {isIT && (
                    <td className="px-4 py-3 align-middle text-muted-foreground relative z-20">
                      {t.assignee?.name ?? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full text-xs">
                          Atanmamis
                        </span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 align-middle whitespace-nowrap relative z-20">
                    {slaDue ? (
                      <div className="flex items-center gap-1.5">
                        {(slaBreached || slaUrgent) && (
                          <div className="flex size-6 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                            <HiOutlineClock className={cn("size-4", slaBreached ? "animate-pulse" : "")} />
                          </div>
                        )}
                        <span className={cn("text-xs", slaBreached || slaUrgent ? "font-semibold text-red-600 dark:text-red-400" : "text-muted-foreground font-medium")}>
                          {format(slaDue, "d MMM HH:mm", { locale: tr })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle whitespace-nowrap text-muted-foreground text-xs relative z-20">
                    {format(new Date(t.createdAt), "d MMM yyyy", { locale: tr })}
                  </td>
                  {isIT && (
                    <td className="px-4 py-3 align-middle text-right relative z-20">
                      <QuickStatusButton ticketId={t.id} currentStatus={t.status} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
