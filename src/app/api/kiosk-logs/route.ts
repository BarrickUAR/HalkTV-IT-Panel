import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveKioskUser } from "@/lib/auth-helpers";
import { auditDisplay, entityLabels } from "@/lib/audit-display";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const userId = url.searchParams.get("userId");
    const hostname = url.searchParams.get("hostname");
    const username = url.searchParams.get("username");

    const user = await resolveKioskUser({ userId, hostname, username });
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const isIT = ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"].includes(user.role);
    if (!isIT) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const cursor = url.searchParams.get("cursor");
    const category = url.searchParams.get("category");
    const query = (url.searchParams.get("q") || "").trim().slice(0, 100);
    const where: Prisma.AuditLogWhereInput = {};
    if (category) where.entityType = category;
    if (query) where.OR = [
      { actor: { name: { contains: query, mode: "insensitive" } } },
      { ip: { contains: query, mode: "insensitive" } },
      { entityId: { contains: query, mode: "insensitive" } },
      { metadata: { path: ["hostname"], string_contains: query } },
    ];
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 41,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            title: true,
            image: true,
            department: { select: { name: true, floor: true } },
            computers: { select: { name: true, notes: true }, orderBy: { updatedAt: "desc" }, take: 1 }
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      nextCursor: logs.length > 40 ? logs[39].id : null,
      logs: logs.slice(0, 40).map((l) => {
        const meta = (l.metadata || {}) as Record<string, any>;
        const { label, tone } = auditDisplay(l.action);
        return ({
        id: l.id,
        action: l.action,
        label, tone,
        entityLabel: entityLabels[l.entityType] || "Sistem",
        entityType: l.entityType,
        entityId: l.entityId,
        actorName: meta.actorName || l.actor?.name || l.actor?.email || "Sistem",
        actorRole: l.actor ? ROLE_LABELS[l.actor.role] : "Sistem",
        actorTitle: meta.actorTitle || l.actor?.title || null,
        actorImage: l.actor?.image || null,
        department: [meta.actorFloor || l.actor?.department?.floor, meta.actorDepartment || l.actor?.department?.name].filter(Boolean).join(" · ") || null,
        computerName: meta.hostname || null,
        assignedComputer: l.actor?.computers?.[0]?.name || null,
        currentDeviceIp: l.actor?.computers?.[0]?.notes?.match(/IP:\s*([^\s|]+)/)?.[1] || null,
        ip: l.ip || meta.ip || null,
        ipSource: meta.ipSource || null,
        windowsUser: meta.username || null,
        targetName: meta.computerName || meta.name || meta.title || null,
        roleChange: meta.oldRole && meta.newRole && meta.oldRole !== meta.newRole ? `${ROLE_LABELS[meta.oldRole as keyof typeof ROLE_LABELS] || meta.oldRole} → ${ROLE_LABELS[meta.newRole as keyof typeof ROLE_LABELS] || meta.newRole}` : null,
        createdAt: l.createdAt.toISOString(),
      }); }),
    });
  } catch (err) {
    console.error("kiosk-logs error:", err);
    return NextResponse.json({ ok: false, error: "Loglar alınamadı" }, { status: 500 });
  }
}
