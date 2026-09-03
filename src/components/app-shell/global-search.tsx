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
    ? res.tickets.length + res.users.length
    : 0;

  const itemClass =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted";

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-lg border bg-background px-3">
        <HiOutlineMagnifyingGlass className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Talep, ekipman, kişi ara…"
          className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open && q.trim().length >= 2 ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border bg-card shadow-lg">
          {count === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              {pending ? "Aranıyor…" : "Sonuç bulunamadı."}
            </p>
          ) : (
            <div className="max-h-96 divide-y overflow-y-auto">
              {res!.tickets.length > 0 ? (
                <Group label="Talepler">
                  {res!.tickets.map((t) => (
                    <button
                      key={t.id}
                      className={itemClass}
                      onClick={() => go(`/tickets/${t.id}`)}
                    >
                      <HiOutlineTicket className="size-4 shrink-0 text-muted-foreground" />
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {t.number}
                      </span>
                      <span className="truncate">{t.title}</span>
                    </button>
                  ))}
                </Group>
              ) : null}



              {res!.users.length > 0 ? (
                <Group label="Kişiler">
                  {res!.users.map((u) => (
                    <button
                      key={u.id}
                      className={itemClass}
                      onClick={() => go(`/users/${u.id}`)}
                    >
                      <HiOutlineUser className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{u.name}</span>
                      {u.sub ? (
                        <span className="truncate text-xs text-muted-foreground">
                          · {u.sub}
                        </span>
                      ) : null}
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
