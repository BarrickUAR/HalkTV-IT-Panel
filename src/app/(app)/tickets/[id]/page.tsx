import Link from "next/link";
import { notFound } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineStar } from "react-icons/hi2";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isITStaff } from "@/lib/rbac/permissions";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  PRIORITY_BADGE,
  PRIORITY_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
} from "@/lib/ticket-labels";

import { fetchComments } from "./actions";
import { CommentThread } from "./comment-thread";
import { SurveyWidget } from "./survey-widget";
import { TicketManage } from "./ticket-manage";
import { TimeLog } from "./time-log";

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children ?? value}</dd>
    </div>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

function fmtMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? `${h}s ${mm}dk` : `${mm}dk`;
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const it = isITStaff(user.role);

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      requester: { select: { name: true, email: true, department: { select: { name: true } }, computers: { select: { name: true } } } },
      assignee: { select: { name: true } },
      survey: true,
      timeEntries: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  const agents = it
    ? await prisma.user.findMany({
        where: {
          role: { in: ["IT_AGENT", "IT_LEAD", "IT_MANAGER", "SUPER_ADMIN"] },
          status: "ACTIVE",
        },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : [];

  if (!ticket || (!it && ticket.requesterId !== user.id)) notFound();

  const comments = await fetchComments(id);

  const totalMinutes = ticket.timeEntries.reduce((s: number, e: any) => s + e.minutes, 0);
  const canRate =
    !it &&
    ticket.requesterId === user.id &&
    (ticket.status === "RESOLVED" || ticket.status === "CLOSED") &&
    !ticket.survey;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <HiOutlineArrowLeft className="size-4" /> Talepler
      </Link>

      <div className="mt-4 mb-6">
        <p className="font-mono text-xs text-muted-foreground">
          {ticket.number}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {ticket.title}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ana kolon */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-2 text-sm font-semibold">Açıklama</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>

          <CommentThread
            ticketId={ticket.id}
            initial={comments}
            isIT={it}
            currentUserId={user.id}
          />
        </div>

        {/* Yan kolon */}
        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Detaylar</h3>
            {it ? (
              <TicketManage
                ticketId={ticket.id}
                status={ticket.status}
                assigneeId={ticket.assigneeId}
                agents={agents}
              />
            ) : null}
            <dl
              className={cn(
                "space-y-2.5 text-sm",
                it ? "mt-4 border-t pt-4" : "",
              )}
            >
              {!it ? (
                <Row label="Durum">
                  <Badge className={STATUS_BADGE[ticket.status as keyof typeof STATUS_BADGE]}>
                    {STATUS_LABELS[ticket.status as keyof typeof STATUS_LABELS]}
                  </Badge>
                </Row>
              ) : null}
              <Row label="Öncelik">
                <Badge className={PRIORITY_BADGE[ticket.priority as keyof typeof PRIORITY_BADGE]}>
                  {PRIORITY_LABELS[ticket.priority as keyof typeof PRIORITY_LABELS]}
                </Badge>
              </Row>
              {(ticket as any).location ? (
                <Row label="Kat/Departman" value={(ticket as any).location} />
              ) : null}
              <Row
                label="Talep eden"
                value={ticket.requester.name ?? ticket.requester.email ?? "—"}
              />
              {it && ticket.requester.computers?.[0]?.name ? (
                <Row
                  label="Bilgisayar Adı"
                  value={ticket.requester.computers[0].name}
                />
              ) : null}
              {!it ? (
                <Row
                  label="Atanan"
                  value={ticket.assignee?.name ?? "Henüz atanmadı"}
                />
              ) : null}
              <Row
                label="Oluşturma"
                value={format(ticket.createdAt, "d MMM yyyy HH:mm", {
                  locale: tr,
                })}
              />
              {ticket.slaDueAt ? (
                <Row label="SLA">
                  <span
                    className={cn(
                      ticket.slaDueAt < new Date() &&
                        (ticket.status === "OPEN" ||
                          ticket.status === "IN_PROGRESS" ||
                          ticket.status === "WAITING_REQUESTER")
                        ? "font-semibold text-red-600 dark:text-red-400"
                        : "",
                    )}
                  >
                    {format(ticket.slaDueAt, "d MMM HH:mm", { locale: tr })}
                  </span>
                </Row>
              ) : null}
            </dl>
          </div>

          {it ? (
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Zaman</h3>
                <span className="text-sm text-muted-foreground">
                  {fmtMinutes(totalMinutes)}
                </span>
              </div>
              <TimeLog ticketId={ticket.id} />
              {ticket.timeEntries.length > 0 ? (
                <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  {ticket.timeEntries.map((e: any) => (
                    <div key={e.id} className="flex justify-between gap-2">
                      <span>
                        {fmtMinutes(e.minutes)}
                        {e.note ? ` · ${e.note}` : ""}
                      </span>
                      <span>{e.user.name ?? e.user.email}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {ticket.survey ? (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold">Değerlendirme</h3>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <HiOutlineStar
                    key={n}
                    className={cn(
                      "size-5",
                      n <= ticket.survey!.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground",
                    )}
                  />
                ))}
              </div>
              {ticket.survey.comment ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {ticket.survey.comment}
                </p>
              ) : null}
            </div>
          ) : canRate ? (
            <SurveyWidget ticketId={ticket.id} />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
