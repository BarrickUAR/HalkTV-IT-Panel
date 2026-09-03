"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { HiOutlinePaperAirplane } from "react-icons/hi2";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { addComment, fetchComments } from "./actions";
import type { CommentDTO } from "./comment-types";

export function CommentThread({
  ticketId,
  initial,
  isIT,
  currentUserId,
}: {
  ticketId: string;
  initial: CommentDTO[];
  isIT: boolean;
  currentUserId: string;
}) {
  const [comments, setComments] = useState<CommentDTO[]>(initial);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Yakın-gerçek-zaman: her 4 sn'de yeni mesajları çek.
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        setComments(await fetchComments(ticketId));
      } catch {
        // sessiz geç
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [ticketId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  async function doSend() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    const res = await addComment({
      ticketId,
      body: text,
      visibility: internal ? "INTERNAL" : "PUBLIC",
    });
    setSending(false);
    if (res.ok) {
      setBody("");
      setComments(await fetchComments(ticketId));
    } else {
      toast.error(res.error ?? "Gönderilemedi.");
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-5 py-3 text-sm font-semibold">Mesajlar</div>

      <div className="max-h-[28rem] space-y-4 overflow-y-auto p-5">
        {comments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Henüz mesaj yok. İlk mesajı yaz.
          </p>
        ) : (
          comments.map((c) => {
            const mine = c.authorId === currentUserId;
            return (
              <div
                key={c.id}
                className={cn("flex flex-col", mine ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                    c.visibility === "INTERNAL"
                      ? "bg-amber-500/10 text-foreground ring-1 ring-amber-500/30"
                      : mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted",
                  )}
                >
                  {c.visibility === "INTERNAL" ? (
                    <span className="mb-1 block text-[10px] font-semibold text-amber-600 uppercase dark:text-amber-400">
                      İç not · sadece IT
                    </span>
                  ) : null}
                  <p className="whitespace-pre-wrap">{c.body}</p>
                </div>
                <span className="mt-1 px-1 text-[11px] text-muted-foreground">
                  {c.authorName} ·{" "}
                  {format(new Date(c.createdAt), "d MMM HH:mm", { locale: tr })}
                </span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void doSend();
        }}
        className="space-y-2 border-t p-4"
      >
        {isIT ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
              className="size-3.5 accent-primary"
            />
            İç not olarak gönder (talep eden görmez)
          </label>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void doSend();
              }
            }}
            rows={2}
            placeholder={internal ? "IT ekibine iç not…" : "Mesajını yaz…"}
            className="min-h-10 flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <Button
            type="submit"
            size="icon"
            className="size-10 shrink-0"
            disabled={sending || !body.trim()}
          >
            <HiOutlinePaperAirplane className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
