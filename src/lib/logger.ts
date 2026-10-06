import { prisma } from "@/lib/prisma";
import { auditContext } from "@/lib/audit-context";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "KIOSK_CONNECTED"
  | "KIOSK_DISCONNECTED"
  | "FILE_UPLOADED"
  | "TICKET_CREATED"
  | "TICKET_UPDATED"
  | "STATUS_CHANGED"
  | "ASSIGNED"
  | "COMMENT_ADDED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "PASSWORD_RESET"
  | "DEPARTMENT_CREATED"
  | "DEPARTMENT_UPDATED"
  | "ANNOUNCEMENT_CREATED"
  | "COMPUTER_ASSIGNED"
  | "COMPUTER_MESSAGE_SENT";

export async function auditLog(opts: {
  actorId?: string | null;
  action: AuditAction | string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    const context = await auditContext(opts.actorId, opts.meta);
    await prisma.auditLog.create({
      data: {
        actorId: opts.actorId ?? null,
        action: opts.action,
        entityType: opts.entityType ?? "",
        entityId: opts.entityId ?? "",
        // Prisma Json? alanı için: undefined geçmek kaydı oluşturmaz, ya da JSON olarak serileştir
        metadata: JSON.parse(JSON.stringify(context.metadata)),
        ip: context.ip,
      },
    });
  } catch {
    // Log hatasi asla ana akisi durdurmamal
  }
}
