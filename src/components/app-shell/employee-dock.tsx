"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HiOutlineTicket, HiOutlineBookOpen, HiOutlineSquares2X2, HiOutlineCog8Tooth } from "react-icons/hi2";
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
    { href: "/profile", label: "Profilim", icon: HiOutlineCog8Tooth },
  ];

  return (
    <div className="hidden lg:flex fixed left-6 top-1/2 -translate-y-1/2 z-40">
      <div className="flex flex-col items-center gap-4 p-3 rounded-[2rem] border border-white/20 bg-white/70 dark:bg-zinc-900/70 dark:border-zinc-800/50 backdrop-blur-2xl shadow-xl">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-1.5 rounded-2xl w-[76px] h-[76px] transition-all duration-300",
                active 
                  ? "bg-primary text-primary-foreground shadow-md scale-105" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <item.icon className={cn("size-6 transition-transform", active && "scale-110")} />
              <span className="text-[10px] font-medium text-center leading-tight px-1 max-w-full break-words">
                {item.label}
              </span>
              {item.badge ? (
                <span className={cn(
                  "absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold shadow-sm",
                  active ? "bg-white text-primary" : "bg-primary text-primary-foreground"
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
