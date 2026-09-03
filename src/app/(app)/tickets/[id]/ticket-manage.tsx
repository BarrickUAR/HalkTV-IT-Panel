"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { TicketStatus } from "@prisma/client";

import { STATUS_LABELS } from "@/lib/ticket-labels";

import { assignTicket, updateTicketStatus } from "./actions";

const STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
];

const fieldClass =
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";

export function TicketManage({
  ticketId,
  status,
  assigneeId,
  agents,
}: {
  ticketId: string;
  status: TicketStatus;
  assigneeId: string | null;
  agents: { id: string; name: string | null; email: string | null }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Durum
        </label>
        <select
          defaultValue={status}
          disabled={pending}
          className={fieldClass}
          onChange={(e) => {
            const v = e.target.value as TicketStatus;
            start(async () => {
              const r = await updateTicketStatus(ticketId, v);
              if (r.ok) {
                toast.success("Durum güncellendi.");
                router.refresh();
              } else toast.error("Güncellenemedi.");
            });
          }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Atanan
        </label>
        <select
          defaultValue={assigneeId ?? ""}
          disabled={pending}
          className={fieldClass}
          onChange={(e) => {
            const v = e.target.value || null;
            start(async () => {
              const r = await assignTicket(ticketId, v);
              if (r.ok) {
                toast.success("Atama güncellendi.");
                router.refresh();
              } else toast.error("Güncellenemedi.");
            });
          }}
        >
          <option value="">Atanmamış</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name ?? a.email}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
