"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { HiOutlinePaperAirplane, HiOutlinePaperClip, HiOutlineXMark } from "react-icons/hi2";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { addComment, fetchComments } from "./actions";
import type { CommentDTO } from "./comment-types";

function parseBody(text: string) {
  const parts = [];
  const regex = /\[ATTACHMENT:(.*?):(.*?)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.substring(lastIndex, match.index) });
    }
    parts.push({ type: "attachment", url: match[1], name: match[2] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.substring(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", content: text }];
}

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
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if ((!text && !file) || sending) return;
    setSending(true);

    let finalBody = text;

    if (file) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("subfolder", "tickets");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            finalBody += `\n\n[ATTACHMENT:${data.url}:${file.name}]`;
          }
        } else {
          toast.error("Dosya yüklenemedi.");
          setSending(false);
          return;
        }
      } catch (err) {
        toast.error("Dosya yükleme hatası.");
        setSending(false);
        return;
      }
    }

    finalBody = finalBody.trim();

    const res = await addComment({
      ticketId,
      body: finalBody,
      visibility: internal ? "INTERNAL" : "PUBLIC",
    });

    setSending(false);
    if (res.ok) {
      setBody("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setComments(await fetchComments(ticketId));
    } else {
      toast.error(res.error ?? "Gönderilemedi.");
    }
  }

  return (
    <div className="rounded-xl border bg-card flex flex-col h-[500px]">
      <div className="border-b px-5 py-3 text-sm font-semibold shrink-0">Mesajlar</div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {comments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Bu talep için henüz bir mesaj bulunmuyor. Eklemek istediğiniz bir detay varsa buradan iletebilirsiniz.
          </p>
        ) : (
          comments.map((c) => {
            const mine = c.authorId === currentUserId;
            const parsedBody = parseBody(c.body);
            return (
              <div
                key={c.id}
                className={cn("flex flex-col", mine ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    c.visibility === "INTERNAL"
                      ? "bg-amber-500/10 text-foreground ring-1 ring-amber-500/30"
                      : mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted",
                  )}
                >
                  {c.visibility === "INTERNAL" ? (
                    <span className="mb-1 block text-[10px] font-bold text-amber-600 uppercase tracking-wider dark:text-amber-400">
                      İç not · sadece IT
                    </span>
                  ) : null}
                  <div className="space-y-2">
                    {parsedBody.map((part, idx) => {
                      if (part.type === "text") {
                        return (
                          <p key={idx} className="whitespace-pre-wrap leading-relaxed">
                            {part.content?.trim()}
                          </p>
                        );
                      } else if (part.type === "attachment") {
                        const isImage = part.name?.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                        return isImage ? (
                          <a key={idx} href={part.url} target="_blank" rel="noreferrer" className="block mt-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={part.url} alt={part.name} className="max-w-[240px] rounded-lg border border-black/10 object-cover shadow-sm hover:opacity-90 transition-opacity" />
                          </a>
                        ) : (
                          <a key={idx} href={part.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-2 rounded-md bg-background/20 px-3 py-1.5 text-xs font-semibold hover:bg-background/30 transition-colors border border-black/10">
                            <HiOutlinePaperClip className="size-3.5" />
                            {part.name}
                          </a>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
                <span className="mt-1 px-1 text-[10px] text-muted-foreground font-medium">
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
        className="space-y-2 border-t p-4 shrink-0 bg-muted/10 rounded-b-xl"
      >
        {isIT ? (
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
              className="size-3.5 accent-primary rounded-sm"
            />
            İç not olarak gönder (talep eden görmez)
          </label>
        ) : null}

        {file && (
          <div className="flex items-center gap-2 text-xs font-medium bg-background border px-3 py-1.5 rounded-lg w-max mb-2 shadow-sm">
            <HiOutlinePaperClip className="size-3.5 text-primary" />
            <span className="max-w-[150px] truncate">{file.name}</span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="ml-2 rounded-full p-0.5 hover:bg-destructive/10 text-destructive transition-colors"
            >
              <HiOutlineXMark className="size-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void doSend();
              }
            }}
            rows={2}
            placeholder={internal ? "IT ekibine iç not…" : "Mesajını yaz…"}
            className="min-h-11 flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-11 shrink-0 rounded-xl"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            <HiOutlinePaperClip className="size-5 text-muted-foreground" />
          </Button>
          <Button
            type="submit"
            size="icon"
            className="size-11 shrink-0 rounded-xl shadow-sm"
            disabled={sending || (!body.trim() && !file)}
          >
            <HiOutlinePaperAirplane className="size-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
