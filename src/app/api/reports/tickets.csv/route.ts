import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/permissions";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/ticket-labels";

export const runtime = "nodejs";

function esc(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const user = await requireUser();
  if (!can(user.role, "report:view")) {
    return new Response("Forbidden", { status: 403 });
  }

  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      requester: { select: { name: true, email: true } },
      assignee: { select: { name: true, email: true } },
    },
    take: 5000,
  });

  const header = [
    "No",
    "Başlık",
    "Durum",
    "Öncelik",
    "Kategori",
    "Talep eden",
    "Atanan",
    "Oluşturma",
    "Çözülme",
  ];
  const lines = [header.join(";")];
  for (const t of tickets) {
    lines.push(
      [
        t.number,
        t.title,
        STATUS_LABELS[t.status],
        PRIORITY_LABELS[t.priority],
        CATEGORY_LABELS[t.category],
        t.requester?.name ?? t.requester?.email ?? "",
        t.assignee?.name ?? t.assignee?.email ?? "",
        t.createdAt.toISOString(),
        t.resolvedAt?.toISOString() ?? "",
      ]
        .map(esc)
        .join(";"),
    );
  }
  // BOM → Excel Türkçe karakterleri doğru göstersin.
  const csv = "﻿" + lines.join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="halktv-talepler.csv"',
    },
  });
}
