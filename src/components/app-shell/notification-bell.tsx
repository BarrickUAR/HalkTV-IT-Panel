"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HiOutlineBell } from "react-icons/hi2";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn, playNotificationSound } from "@/lib/utils";
import {
  fetchNotifications,
  markAllRead,
  markRead,
  type NotificationDTO,
} from "@/app/(app)/notifications/actions";

export function NotificationBell() {
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const unread = items.filter((i) => !i.isRead).length;

  async function refresh() {
    try {
      const next = await fetchNotifications();
      // İlk yüklemeden sonra gelen YENİ okunmamışları anlık toast ile duyur.
      if (primed.current) {
        const fresh = next.filter(
          (n) => !n.isRead && !seenIds.current.has(n.id),
        );
        if (fresh.length > 0) {
          const latest = fresh[0];
          playNotificationSound();
          toast(latest.title, {
            description: latest.body ?? undefined,
          });
        }
      }
      seenIds.current = new Set(next.map((n) => n.id));
      primed.current = true;
      setItems(next);
    } catch {
      // sessiz geç
    }
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Bildirimler"
        onClick={() => setOpen((o) => !o)}
      >
        <HiOutlineBell className="size-5" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold">Bildirimler</span>
            {unread > 0 ? (
              <button
                type="button"
                onClick={async () => {
                  await markAllRead();
                  refresh();
                }}
                className="text-xs text-primary hover:underline"
              >
                Tümünü okundu işaretle
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Bildirim yok.
              </p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "#"}
                  onClick={() => {
                    if (!n.isRead) {
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === n.id ? { ...it, isRead: true } : it,
                        ),
                      );
                      markRead(n.id);
                    }
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-start gap-2 border-b px-4 py-3 text-sm last:border-b-0 hover:bg-muted/50",
                    !n.isRead && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      n.isRead ? "bg-transparent" : "bg-primary",
                    )}
                  />
                  <div>
                    <p className="font-medium">{n.title}</p>
                    {n.body ? (
                      <p className="text-muted-foreground">{n.body}</p>
                    ) : null}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {format(new Date(n.createdAt), "d MMM HH:mm", {
                        locale: tr,
                      })}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t px-4 py-2.5 text-center text-xs text-primary hover:underline"
          >
            Tümünü gör
          </Link>
        </div>
      ) : null}
    </div>
  );
}
