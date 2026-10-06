import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { HiOutlineArrowLeft, HiOutlinePaperClip } from "react-icons/hi2";

import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

import { FeedbackAdminActions } from "./admin-actions";
import { markFeedbackReadAction } from "../../actions";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!isITStaff(user.role)) notFound();

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      notes: {
        include: { author: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!feedback) notFound();

  // Mark as read automatically when opened
  if (!feedback.isRead) {
    await markFeedbackReadAction(id);
  }

  const isComplaint = feedback.type === "COMPLAINT";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/feedback/inbox"
          className="flex size-10 items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <HiOutlineArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Şikayet & Öneri Detayı</h1>
          <p className="text-sm text-muted-foreground">KOD: {feedback.pinCode}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider px-2 py-1 rounded",
                  isComplaint ? "bg-orange-500/10 text-orange-600" : "bg-emerald-500/10 text-emerald-600"
                )}>
                  {isComplaint ? "Şikayet" : "Öneri"}
                </span>
                {feedback.category && (
                  <span className="text-xs font-semibold bg-muted px-2 py-1 rounded text-muted-foreground">
                    {feedback.category}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(feedback.createdAt), "d MMMM yyyy HH:mm", { locale: tr })}
              </span>
            </div>

            <div className="bg-muted/30 rounded-xl p-5 border text-sm whitespace-pre-wrap leading-relaxed">
              {feedback.content}
            </div>

            {feedback.attachmentUrl && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <HiOutlinePaperClip className="size-4" /> Ekli Dosya
                </h4>
                {feedback.attachmentUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                  <a href={feedback.attachmentUrl} target="_blank" rel="noreferrer" className="block w-48 rounded-lg overflow-hidden border hover:opacity-90 transition-opacity">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={feedback.attachmentUrl} alt="Ek" className="w-full object-cover" />
                  </a>
                ) : (
                  <a href={feedback.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-muted hover:bg-muted/80 px-4 py-2 rounded-lg text-sm font-medium transition-colors border">
                    <HiOutlinePaperClip className="size-4" /> Dosyayı Görüntüle
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-1">
          <FeedbackAdminActions
            feedbackId={feedback.id}
            initialStatus={feedback.status}
            initialResponse={feedback.adminResponse ?? ""}
            notes={feedback.notes.map(n => ({
              id: n.id,
              content: n.content,
              createdAt: n.createdAt.toISOString(),
              authorName: n.author.name ?? "Bilinmiyor",
              authorAvatar: n.author.image,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
