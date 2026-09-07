import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "TICKET_CREATED"
  | "TICKET_UPDATED"
  | "STATUS_CHANGED"
  | "ASSIGNED"
  | "COMMENT_ADDED"
  | "TIME_LOGGED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "PASSWORD_RESET"
  | "DM_TOGGLED"
  | "USER_BLOCKED"
  | "USER_UNBLOCKED"
  | "COMPUTER_CREATED"
  | "COMPUTER_UPDATED"
  | "COMPUTER_DELETED"
  | "DEPARTMENT_CREATED"
  | "DEPARTMENT_UPDATED"
  | "DEPARTMENT_DELETED"
  | "ANNOUNCEMENT_CREATED"
  | "ANNOUNCEMENT_UPDATED"
  | "FEEDBACK_READ";

export async function createAuditLog({
  actorId,
  action,
  entityType,
  entityId,
  metadata,
  ip,
}: {
  actorId?: string | null;
  action: AuditAction | string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  ip?: string | null;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorId: actorId || null,
        action,
        entityType,
        entityId,
        metadata: metadata ? (metadata as any) : undefined,
        ip: ip || null,
      },
    });
  } catch (error) {
    console.error("Audit log error:", error);
    return null;
  }
}

