"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineComputerDesktop, HiOutlineMagnifyingGlass, HiOutlineTicket, HiOutlineUser } from "react-icons/hi2";

import { globalSearch, type SearchResults } from "@/app/(app)/search-actions";

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-3 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState<SearchResults | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setRes(null);
      return;
    }
    const t = setTimeout(() => {
      start(async () => setRes(await globalSearch(q)));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQ("");
    setRes(null);
    router.push(href);
  }

  const count = res
    ? res.tickets.length + res.users.length + (res.computers?.length ?? 0)
    : 0;

  const itemClass =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors";

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-xl border bg-background px-3 transition-colors focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50">
        <HiOutlineMagnifyingGlass className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Talep, ekipman, kişi ara..."
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open && q.trim().length >= 2 ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-card shadow-xl">
          {count === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              {pending ? (
                <>
                  <div className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Aranıyor...
                </>
              ) : "Sonuç bulunamadı."}
            </div>
          ) : (
            <div className="max-h-96 divide-y overflow-y-auto">
              {res!.tickets.length > 0 ? (
                <Group label="Talepler">
                  {res!.tickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => go(`/tickets/${t.id}`)}
                      className={itemClass}
                    >
                      <span className="font-mono text-xs text-primary/80">#{t.number}</span>
                      <span className="truncate font-medium">{t.title}</span>
                    </button>
                  ))}
                </Group>
              ) : null}

              {res!.users.length > 0 ? (
                <Group label="Kullanıcılar">
                  {res!.users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => go(`/users/${u.id}`)}
                      className={itemClass}
                    >
                      <span className="font-medium truncate">{u.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{u.sub}</span>
                    </button>
                  ))}
                </Group>
              ) : null}

              {res!.computers && res!.computers.length > 0 ? (
                <Group label="Cihazlar">
                  {res!.computers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => go(`/inventory`)}
                      className={itemClass}
                    >
                      <span className="font-medium truncate">{c.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{c.sub}</span>
                    </button>
                  ))}
                </Group>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
