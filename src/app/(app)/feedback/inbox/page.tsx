import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { HiOutlineArrowLeft, HiOutlineLightBulb, HiOutlineMegaphone, HiOutlineInbox } from "react-icons/hi2";

import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

import { MarkReadButton } from "./mark-read-button";

export const metadata: Metadata = { title: "Şikayet & Öneri Kutusu" };

export default async function FeedbackInboxPage() {
  const user = await requireUser();
  if (!isITStaff(user.role)) notFound();

  const feedbackList = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gelen Şikayet ve Öneriler (Anonim)</h1>
        <p className="mt-1 text-sm text-muted-foreground">Personellerden gelen tüm geri bildirimler burada listelenir.</p>
      </div>

      {feedbackList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <HiOutlineInbox className="size-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">Henüz gelen bir şikayet veya öneri bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {feedbackList.map((f) => {
            const isComplaint = f.type === "COMPLAINT";
            return (
              <Link
                href={`/feedback/inbox/${f.id}`}
                key={f.id}
                className={cn(
                  "relative flex flex-col gap-4 rounded-xl border bg-card p-5 transition-all hover:shadow-md",
                  f.isRead ? "opacity-90" : "border-primary/40 shadow-sm"
                )}
              >
                {!f.isRead && (
                  <div className="absolute right-5 top-5">
                    <span className="flex h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    isComplaint ? "bg-orange-500/10 text-orange-600" : "bg-emerald-500/10 text-emerald-600"
                  )}>
                    {isComplaint ? <HiOutlineMegaphone className="size-5" /> : <HiOutlineLightBulb className="size-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-bold uppercase tracking-wider",
                        isComplaint ? "text-orange-600" : "text-emerald-600"
                      )}>
                        {isComplaint ? "Şikayet" : "Öneri"}
                      </span>
                      {f.category && (
                        <span className="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                          {f.category}
                        </span>
                      )}
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ml-auto mr-4",
                        f.status === "NEW" ? "bg-blue-500/10 text-blue-600" :
                        f.status === "IN_PROGRESS" ? "bg-amber-500/10 text-amber-600" :
                        f.status === "RESOLVED" ? "bg-emerald-500/10 text-emerald-600" :
                        "bg-red-500/10 text-red-600"
                      )}>
                        {f.status === "NEW" ? "YENİ" : f.status === "IN_PROGRESS" ? "İNCELENİYOR" : f.status === "RESOLVED" ? "ÇÖZÜLDÜ" : "REDDEDİLDİ"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(f.createdAt), "d MMMM yyyy HH:mm", { locale: tr })} • KOD: {f.pinCode}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed line-clamp-2 text-foreground/80">
                    {f.content}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
