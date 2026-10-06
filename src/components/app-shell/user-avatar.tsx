"use client";

import { useState } from "react";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  role?: Role | string;
  image?: string | null;
  className?: string;
  name?: string | null;
}

export function UserAvatar({ image, className, name }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Google / Gmail profil fotoğraflarını yüksek çözünürlüğe yükselt (96px -> 384px)
  const highRes = image && image.includes("googleusercontent.com")
    ? image.replace(/=s\d+(-c)?$/, "=s384-c")
    : image;

  if (highRes && !imgError) {
    return (
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white dark:bg-zinc-900 border border-border shadow-xs",
          className
        )}
      >
        <img
          src={highRes}
          alt={name || "Profil"}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  // Avatar yoksa veya yüklenemezse her yerde klasik HalkTV logosu gösterilir
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-950/60 shadow-xs select-none p-1.5",
        className
      )}
      title={name || "Halk TV"}
    >
      <img
        src="/halktv-logo.png"
        alt="Halk TV"
        className="h-full w-full object-contain"
      />
    </div>
  );
}
