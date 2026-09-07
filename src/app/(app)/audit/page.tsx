import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  HiOutlineClock,
  HiOutlineTicket,
  HiOutlineUsers,
  HiOutlineComputerDesktop,
  HiOutlineShieldCheck,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineDocumentText,
  HiOutlineFunnel,
  HiOutlineMegaphone,
  HiOutlineCheckCircle,
} from "react-icons/hi2";

import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/ticket-labels";
import { ROLE_LABELS } from "@/lib/rbac/roles";

export const metadata = { title: "İşlem Kayıtları (Loglar)" };

const ACTION_CONFIG: Record<
  string,
  { label: string; tone: string; icon: any }
> = {
  TICKET_CREATED: {
    label: "Yeni Talep Açıldı",
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: HiOutlineTicket,
  },
  STATUS_CHANGED: {
    label: "Durum Değiştirildi",
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: HiOutlineClock,
  },
  ASSIGNED: {
    label: "Talep Atandı",
    tone: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    icon: HiOutlineUsers,
  },
  COMMENT_ADDED: {
    label: "Yorum Eklendi",
    tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    icon: HiOutlineDocumentText,
  },
  USER_CREATED: {
    label: "Kullanıcı Oluşturuldu",
    tone: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: HiOutlineUsers,
  },
  USER_UPDATED: {
    label: "Kullanıcı Düzenlendi",
    tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    icon: HiOutlineShieldCheck,
  },
  PASSWORD_RESET: {
    label: "Şifre Sıfırlandı",
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: HiOutlineShieldCheck,
  },
  COMPUTER_CREATED: {
    label: "Cihaz Eklendi",
    tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    icon: HiOutlineComputerDesktop,
  },
  COMPUTER_UPDATED: {
    label: "Cihaz Güncellendi",
    tone: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    icon: HiOutlineComputerDesktop,
  },
  COMPUTER_DELETED: {
    label: "Cihaz Silindi",
    tone: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    icon: HiOutlineComputerDesktop,
  },
  FEEDBACK_SUBMITTED: {
    label: "Şikayet / Öneri İletildi",
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    icon: HiOutlineMegaphone,
  },
  FEEDBACK_READ: {
    label: "Şikayet İncelendi",
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: HiOutlineCheckCircle,
  },
};

function formatAuditDetail(log: any) {
  const meta = (log.metadata || {}) as Record<string, any>;
  const actorName = log.actor?.name || log.actor?.email || "Sistem";

  switch (log.action) {
    case "TICKET_CREATED":
      return `${actorName}, "${meta.title || "Talep"}" başlıklı ${meta.ticketNumber ? `#${meta.ticketNumber}` : ""} talebini oluşturdu.`;
    case "STATUS_CHANGED": {
      const statusText = STATUS_LABELS[meta.newStatus as keyof typeof STATUS_LABELS] || meta.newStatus || "Bilinmiyor";
      return `${actorName}, talebin durumunu "${statusText}" olarak güncelledi.`;
    }
    case "ASSIGNED":
      return `${actorName}, talebi ${meta.newAssigneeId ? "personele" : "havuza"} atadı.`;
    case "USER_CREATED": {
      const roleText = ROLE_LABELS[meta.role as keyof typeof ROLE_LABELS] || meta.role;
      return `${actorName}, ${meta.name || "kullanıcı"} (@${meta.username || ""}) hesabını "${roleText}" yetkisiyle oluşturdu.`;
    }
    case "USER_UPDATED": {
      const roleText = meta.newRole ? ROLE_LABELS[meta.newRole as keyof typeof ROLE_LABELS] || meta.newRole : "";
      return `${actorName}, ${meta.name || "kullanıcı"} bilgilerini güncelledi${roleText ? ` (Rol: ${roleText})` : ""}.`;
    }
    case "PASSWORD_RESET":
      return `${actorName}, ${meta.name || meta.email || "kullanıcı"} için yeni şifre belirledi.`;
    case "COMPUTER_CREATED":
      return `${actorName}, "${meta.name}" adlı cihazı envantere ekledi. (${meta.assignedUser || "Boşta"})`;
    case "COMPUTER_UPDATED":
      return `${actorName}, "${meta.name}" cihaz kaydını güncelledi. (Kullanıcı: ${meta.assignedUser || "Boşta"})`;
    case "COMPUTER_DELETED":
      return `${actorName}, "${meta.name}" adlı cihazı envanterden sildi.`;
    case "FEEDBACK_SUBMITTED": {
      const typeText = meta.type === "COMPLAINT" ? "şikayet" : "öneri";
      return `Bir personel anonim olarak yeni bir ${typeText} iletti: "${meta.summary || ""}"`;
    }
    case "FEEDBACK_READ":
      return `${actorName}, gelen bir anonim şikayet/öneriyi okundu olarak işaretledi.`;
    default:
      return `${actorName}, ${log.entityType} üzerinde işlem gerçekleştirdi.`;
  }
}

function getEntityLink(entityType: string, entityId: string) {
  if (entityType === "Ticket") return `/tickets/${entityId}`;
  if (entityType === "User") return `/users/${entityId}`;
  if (entityType === "Computer") return `/inventory`;
  if (entityType === "Feedback") return `/feedback/inbox`;
  return null;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await requireRole(["IT_AGENT", "TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"]);
  const { type } = await searchParams;

  const whereClause: any = {};
  if (type === "ticket") whereClause.entityType = "Ticket";
  else if (type === "user") whereClause.entityType = "User";
  else if (type === "computer") whereClause.entityType = "Computer";
  else if (type === "feedback") whereClause.entityType = "Feedback";

  const [logs, totalCount, todayCount] = await Promise.all([
    prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 150,
      include: {
        actor: {
          select: { id: true, name: true, email: true, role: true, image: true },
        },
      },
    }),
    prisma.auditLog.count(),
    prisma.auditLog.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sistem İşlem Günlüğü (Audit Log)</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Yöneticiler ve teknik müdürlük için sistemde gerçekleşen tüm kritik işlemlerin ayrıntılı ve şeffaf kaydı.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border bg-card px-3.5 py-2 text-center shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">Bugün</span>
            <span className="text-lg font-bold text-primary">{todayCount}</span>
          </div>
          <div className="rounded-xl border bg-card px-3.5 py-2 text-center shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">Toplam Kayıt</span>
            <span className="text-lg font-bold text-foreground">{totalCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b pb-3">
        <HiOutlineFunnel className="size-4 text-muted-foreground ml-1 mr-1 shrink-0" />
        {[
          { key: undefined, label: "Tüm İşlemler" },
          { key: "ticket", label: "Talepler" },
          { key: "user", label: "Kullanıcılar" },
          { key: "computer", label: "Cihaz & Envanter" },
          { key: "feedback", label: "Şikayet & Öneriler" },
        ].map((tab) => {
          const active = (type === undefined && tab.key === undefined) || type === tab.key;
          return (
            <Link
              key={tab.label}
              href={tab.key ? `/audit?type=${tab.key}` : "/audit"}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                active
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b text-xs uppercase font-semibold text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Zaman</th>
                <th className="px-5 py-3.5 whitespace-nowrap">İşlemi Yapan</th>
                <th className="px-5 py-3.5 whitespace-nowrap">İşlem Türü</th>
                <th className="px-5 py-3.5">Detay / Açıklama</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">İlgili Bağlantı</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-muted-foreground">
                    <HiOutlineClock className="size-8 mx-auto mb-2 opacity-30" />
                    Bu filtreye uygun kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const cfg = ACTION_CONFIG[log.action] || {
                    label: log.action,
                    tone: "bg-muted text-muted-foreground border-border",
                    icon: HiOutlineDocumentText,
                  };
                  const Icon = cfg.icon;
                  const link = getEntityLink(log.entityType, log.entityId);

                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      {/* Tarih */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-muted-foreground">
                        <span className="font-medium text-foreground block">
                          {format(log.createdAt, "d MMMM yyyy", { locale: tr })}
                        </span>
                        <span>{format(log.createdAt, "HH:mm:ss", { locale: tr })}</span>
                      </td>

                      {/* İşlemi Yapan */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                            {log.actor?.name?.charAt(0) || log.actor?.email?.charAt(0) || "S"}
                          </div>
                          <div>
                            <p className="font-semibold text-xs leading-none text-foreground">
                              {log.actor?.name || log.actor?.email || "Sistem / Otomasyon"}
                            </p>
                            {log.actor?.role && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {ROLE_LABELS[log.actor.role] || log.actor.role}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* İşlem Rozeti */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold",
                            cfg.tone
                          )}
                        >
                          <Icon className="size-3.5 shrink-0" />
                          {cfg.label}
                        </span>
                      </td>

                      {/* İnsan Odaklı Açıklama */}
                      <td className="px-5 py-3.5 text-xs text-foreground/90 max-w-md">
                        <p className="leading-relaxed">{formatAuditDetail(log)}</p>
                      </td>

                      {/* Link */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {link ? (
                          <Link
                            href={link}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            Görüntüle
                            <HiOutlineArrowTopRightOnSquare className="size-3.5" />
                          </Link>
                        ) : (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {log.entityType}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
