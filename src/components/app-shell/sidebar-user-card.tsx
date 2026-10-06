"use client";

import Link from "next/link";
import type { Role } from "@prisma/client";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import { UserAvatar } from "./user-avatar";
import { HiOutlineCog8Tooth } from "react-icons/hi2";

interface SidebarUserCardProps {
  name: string | null;
  email: string | null;
  role: Role;
  image?: string | null;
  collapsed?: boolean;
}

export function SidebarUserCard({ name, email, role, image, collapsed }: SidebarUserCardProps) {
  if (collapsed) {
    return (
      <Link
        href="/profile"
        title={name ?? "Kullanıcı"}
        className="flex items-center justify-center h-14 border-t hover:bg-muted transition-colors"
      >
        <UserAvatar role={role} image={image} name={name} className="size-8" />
      </Link>
    );
  }

  return (
    <Link
      href="/profile"
      className="flex items-center gap-3 px-4 py-3 border-t hover:bg-muted transition-colors group"
    >
      <UserAvatar role={role} image={image} name={name} className="size-9 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name ?? "Kullanıcı"}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {ROLE_LABELS[role] ?? role}
        </p>
      </div>
      <HiOutlineCog8Tooth className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  );
}
