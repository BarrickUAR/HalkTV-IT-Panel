import { format } from "date-fns";
import { tr } from "date-fns/locale";

type LogProps = {
  id: string;
  action: string;
  createdAt: Date;
  metadata: any;
  actor: { name: string | null } | null;
};

export function TicketHistory({ logs }: { logs: LogProps[] }) {
  if (logs.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold">İşlem Geçmişi</h3>
      <div className="space-y-4">
        {logs.map((log) => {
          let actionLabel = log.action;
          if (log.action === "CREATED") actionLabel = "Talep oluşturuldu";
          else if (log.action === "STATUS_CHANGED") {
            const oldS = log.metadata?.oldStatus;
            const newS = log.metadata?.newStatus;
            actionLabel = oldS ? `Durum güncellendi: ${oldS} -> ${newS}` : `Durum güncellendi: ${newS}`;
          } else if (log.action === "ASSIGNEE_CHANGED") {
            const newAssignee = log.metadata?.newAssigneeId ? "Atama yapıldı" : "Atama kaldırıldı";
            actionLabel = newAssignee;
          }

          return (
            <div key={log.id} className="flex gap-3 text-sm">
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary/50" />
              <div className="flex-1">
                <p className="font-medium">{actionLabel}</p>
                <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{log.actor?.name ?? "Sistem"}</span>
                  <span>{format(log.createdAt, "d MMM HH:mm", { locale: tr })}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
