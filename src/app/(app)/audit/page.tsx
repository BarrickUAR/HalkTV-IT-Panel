import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default async function AuditLogPage() {
  const user = await requireRole(["IT_AGENT", "IT_LEAD", "IT_MANAGER", "SUPER_ADMIN"]);

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { name: true, email: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">İşlem Kayıtları (Loglar)</h1>
        <p className="text-muted-foreground mt-1">Sistemdeki günlük aktiviteleri ve değişiklikleri buradan takip edebilirsiniz. (Bu oldu, bu bitti)</p>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground">Tarih</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Kullanıcı</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">İşlem</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">İlgili Kayıt</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Henüz kayıt yok.</td>
              </tr>
            ) : (
              logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {format(log.createdAt, "d MMM yyyy HH:mm", { locale: tr })}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {log.actor?.name || log.actor?.email || "Sistem"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {log.entityType}: {log.entityId}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
