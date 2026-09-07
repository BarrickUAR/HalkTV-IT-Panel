"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  HiOutlineTicket,
  HiOutlineBookOpen,
  HiOutlineSquares2X2,
  HiOutlineCog8Tooth,
  HiOutlineMegaphone,
} from "react-icons/hi2";
import type { Role } from "@prisma/client";
import { cn, playNotificationSound } from "@/lib/utils";
import { fetchSidebarBadgeCounts } from "./sidebar-actions";

export function EmployeeDock({ role }: { role: Role }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ tickets: 0 });

  useEffect(() => {
    let live = true;
    let prev = 0;
    const load = async () => {
      try {
        const res = await fetchSidebarBadgeCounts();
        if (live) {
          if (res.tickets > prev) playNotificationSound();
          prev = res.tickets;
          setCounts(res);
        }
      } catch {}
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  const items = [
    { href: "/dashboard", label: "Anasayfa", icon: HiOutlineSquares2X2 },
    { href: "/tickets", label: "Taleplerim", icon: HiOutlineTicket, badge: counts.tickets },
    { href: "/knowledge", label: "Bilgi Bankası", icon: HiOutlineBookOpen },
    { href: "/feedback", label: "Şikayet & Öneri", icon: HiOutlineMegaphone },
    { href: "/profile", label: "Profilim", icon: HiOutlineCog8Tooth },
  ];

  return (
    <div className="hidden lg:flex fixed left-5 top-1/2 -translate-y-1/2 z-40">
      <div className="flex flex-col items-center gap-2.5 p-2.5 rounded-[2.2rem] border border-border/60 bg-card/85 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-2xl ring-1 ring-black/5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-1 rounded-2xl w-[72px] h-[72px] transition-all duration-200",
                active 
                  ? "bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/30 scale-105" 
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
              )}
            >
              <item.icon className={cn(
                "size-6 transition-transform group-hover:scale-110",
                active ? "text-white" : "text-foreground/70 group-hover:text-primary"
              )} />
              <span className={cn(
                "text-[9.5px] font-medium text-center leading-tight px-1 max-w-full truncate",
                active ? "text-white font-semibold" : "text-muted-foreground group-hover:text-primary"
              )}>
                {item.label}
              </span>
              {item.badge ? (
                <span className={cn(
                  "absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold shadow-sm",
                  active ? "bg-white text-primary ring-2 ring-primary" : "bg-primary text-primary-foreground ring-2 ring-background"
                )}>
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
