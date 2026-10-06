import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { HiOutlineDocumentPlus, HiOutlineArrowPath, HiOutlineUserCircle, HiOutlineChatBubbleLeftEllipsis } from "react-icons/hi2";
import { STATUS_LABELS } from "@/lib/ticket-labels";
import { TicketStatus } from "@prisma/client";

type LogProps = {
  id: string;
  action: string;
  createdAt: Date;
  metadata: any;
  actor: { name: string | null; image?: string | null } | null;
};

export function TicketHistory({ logs }: { logs: LogProps[] }) {
  if (logs.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-3">İşlem Geçmişi</h3>
      <div className="relative space-y-6 before:absolute before:inset-y-0 before:left-[19px] before:w-0.5 before:bg-muted">
        {logs.map((log) => {
          let actionLabel = log.action;
          let Icon = HiOutlineArrowPath;
          let colorClass = "bg-primary/10 text-primary border-primary/20";

          if (log.action === "TICKET_CREATED" || log.action === "CREATED") {
            actionLabel = "Talep oluşturuldu";
            Icon = HiOutlineDocumentPlus;
            colorClass = "bg-blue-500/10 text-blue-600 border-blue-500/20";
          } else if (log.action === "STATUS_CHANGED") {
            const newS = log.metadata?.newStatus as TicketStatus;
            actionLabel = `Durum değiştirildi: ${STATUS_LABELS[newS] ?? newS}`;
            Icon = HiOutlineArrowPath;
            if (newS === "RESOLVED") colorClass = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
            if (newS === "CLOSED") colorClass = "bg-muted text-muted-foreground border-muted-foreground/20";
          } else if (log.action === "ASSIGNEE_CHANGED") {
            const newName = log.metadata?.newAssigneeName;
            actionLabel = newName ? `Talep atandı: ${newName}` : "Atama kaldırıldı";
            Icon = HiOutlineUserCircle;
            colorClass = "bg-amber-500/10 text-amber-600 border-amber-500/20";
          } else if (log.action === "COMMENT_ADDED") {
            actionLabel = "Yeni yorum eklendi";
            Icon = HiOutlineChatBubbleLeftEllipsis;
            colorClass = "bg-primary/10 text-primary border-primary/20";
          } else if (log.action === "PRIORITY_CHANGED") {
             actionLabel = `Öncelik değiştirildi`;
          }

          return (
            <div key={log.id} className="relative flex items-start gap-4">
              <div className={`flex items-center justify-center size-10 rounded-full border-2 bg-background shrink-0 shadow-sm z-10 ${colorClass}`}>
                <Icon className="size-4" />
              </div>

              <div className="flex-1 min-w-0 bg-muted/30 p-3 rounded-xl border mt-0.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1.5">
                  <span className="font-semibold text-sm break-words">{actionLabel}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-mono shrink-0">
                    {format(log.createdAt, "HH:mm", { locale: tr })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80 truncate">{log.actor?.name ?? "Sistem"}</span>
                  <span className="opacity-50 shrink-0">•</span>
                  <span className="shrink-0">{format(log.createdAt, "d MMM yyyy", { locale: tr })}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
