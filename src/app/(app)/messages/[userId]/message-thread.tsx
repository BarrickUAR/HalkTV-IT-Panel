"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { HiOutlinePaperAirplane } from "react-icons/hi2";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { fetchThread, sendMessage, type MessageDTO } from "../actions";

export function MessageThread({
  otherId,
  initial,
}: {
  otherId: string;
  initial: MessageDTO[];
}) {
  const [messages, setMessages] = useState<MessageDTO[]>(initial);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        setMessages(await fetchThread(otherId));
      } catch {
        // sessiz geç
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [otherId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function doSend() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    const r = await sendMessage(otherId, text);
    setSending(false);
    if (r.ok) {
      setBody("");
      setMessages(await fetchThread(otherId));
    } else {
      toast.error(r.error ?? "Gönderilemedi.");
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="max-h-[60vh] min-h-64 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Henüz mesaj yok. İlk mesajı yaz.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex flex-col",
                m.fromMe ? "items-end" : "items-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                  m.fromMe ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
              <span className="mt-1 px-1 text-[11px] text-muted-foreground">
                {format(new Date(m.createdAt), "d MMM HH:mm", { locale: tr })}
              </span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void doSend();
        }}
        className="flex items-end gap-2 border-t p-4"
      >
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
          placeholder="Mesaj yaz…"
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
      </form>
    </div>
  );
}
