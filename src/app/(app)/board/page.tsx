import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isITStaff } from "@/lib/rbac/permissions";

import { Board } from "./board";

export const metadata: Metadata = { title: "Pano" };

export default async function BoardPage() {
  const user = await requireUser();
  if (!isITStaff(user.role)) redirect("/dashboard");

  const tickets = await prisma.ticket.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS", "WAITING_REQUESTER", "RESOLVED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { assignee: { select: { name: true, email: true } } },
  });

  const initial = tickets.map((t) => ({
    id: t.id,
    number: t.number,
    title: t.title,
    priority: t.priority,
    status: t.status,
    assignee: t.assignee?.name ?? t.assignee?.email ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Talep Panosu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kartı sürükleyerek durumunu değiştir.
        </p>
      </div>
      <Board initial={initial} />
    </div>
  );
}
