"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  HiOutlineChartBarSquare,
  HiOutlineBookOpen,
  HiOutlineCube,
  HiOutlineClock,
  HiOutlineComputerDesktop,
  HiOutlineSquares2X2,
  HiOutlineViewColumns,
  HiOutlineSpeakerWave,
  HiOutlineTicket,
  HiOutlineUsers,
  HiOutlineMegaphone,
} from "react-icons/hi2";
import type { IconType } from "react-icons";

import type { Role } from "@prisma/client";

import { cn, playNotificationSound } from "@/lib/utils";
import { can, isITStaff } from "@/lib/rbac/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: IconType;
  show: boolean;
  badge?: number;
};

type NavGroup = { title?: string; items: NavItem[] };

interface SidebarProps {
  role: Role;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ tickets: 0, feedbacks: 0 });
  const it = isITStaff(role);

  useEffect(() => {
    let live = true;
    let prevTickets = 0;
    let prevFeedbacks = 0;
    const load = async () => {
      try {
        const res = await fetch("/api/poll");
        if (res.ok && live) {
          const data = await res.json();
          const t = data.sidebar.openTickets;
          const f = data.sidebar.unreadFeedbacks;
          if (t > prevTickets || f > prevFeedbacks) {
            playNotificationSound();
          }
          prevTickets = t;
          prevFeedbacks = f;
          setCounts({ tickets: t, feedbacks: f });
        }
      } catch {}
    };
    load();
    const timer = setInterval(load, 30000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);

  const groups: NavGroup[] = [
    {
      items: [
        {
          href: "/dashboard",
          label: "Anasayfa",
          icon: HiOutlineSquares2X2,
          show: true,
        },
        {
          href: "/tickets",
          label: it ? "Talepler" : "Taleplerim",
          icon: HiOutlineTicket,
          show: true,
          badge: counts.tickets,
        },
        {
          href: "/board",
          label: "Pano",
          icon: HiOutlineViewColumns,
          show: it,
        },
        {
          href: "/knowledge",
          label: "Bilgi Bankası",
          icon: HiOutlineBookOpen,
          show: true,
        },
      ],
    },
    {
      title: "Yönetim",
      items: [
        {
          href: "/users",
          label: "Kullanıcılar",
          icon: HiOutlineUsers,
          show: can(role, "user:manage"),
        },
        {
          href: "/departments",
          label: "Departmanlar",
          icon: HiOutlineCube,
          show: can(role, "location:manage"),
        },
        {
          href: "/inventory",
          label: "Cihazlar",
          icon: HiOutlineComputerDesktop,
          show: can(role, "asset:manage"),
        },
        {
          href: "/assets",
          label: "Demirbaş ve Zimmet",
          icon: HiOutlineCube,
          show: can(role, "asset:manage"),
        },
        {
          href: "/audit",
          label: "İşlem Kayıtları",
          icon: HiOutlineClock,
          show: it,
        },
        {
          href: "/reports",
          label: "Raporlar",
          icon: HiOutlineChartBarSquare,
          show: can(role, "report:view"),
        },
        {
          href: "/announcements",
          label: "Duyurular",
          icon: HiOutlineSpeakerWave,
          show: can(role, "announcement:manage"),
        },
      ],
    },
    {
      items: [
        {
          href: it ? "/feedback/inbox" : "/feedback",
          label: it ? "Şikayet ve Öneriler" : "Şikayet & Öneri",
          icon: HiOutlineMegaphone,
          show: true,
          badge: it ? counts.feedbacks : undefined,
        },
      ],
    },
  ];

  return (
    <nav className="flex flex-col gap-1 py-2 px-2 flex-1 overflow-y-auto">
      {groups.map((group, gi) => {
        const items = group.items.filter((i) => i.show);
        if (items.length === 0) return null;
        return (
          <div key={gi} className="flex flex-col gap-0.5">
            {group.title && (
              <div className="flex items-center gap-2 px-2 pt-4 pb-1.5">
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/50 uppercase whitespace-nowrap">
                  {group.title}
                </span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
            )}

            {items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(`${item.href}/`));

              return (
                <div key={item.href} className="relative">
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors select-none",
                      active
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    {/* Active left bar */}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary" />
                    )}

                    <div className="flex items-center gap-3 min-w-0">
                      <item.icon className="size-[18px] shrink-0" />
                      <span className="truncate leading-none">{item.label}</span>
                    </div>

                    {item.badge && item.badge > 0 ? (
                      <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : null}
                  </Link>
                </div>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
