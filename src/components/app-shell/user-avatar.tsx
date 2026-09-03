import Image from "next/image";
import { HiOutlineUser } from "react-icons/hi2";
import type { Role } from "@prisma/client";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
  role?: Role | string;
  image?: string | null;
  className?: string;
}

export function UserAvatar({ role, image, className }: UserAvatarProps) {
  const isManager = role === "IT_MANAGER" || role === "SUPER_ADMIN" || role === "IT_LEAD" || role === "IT_AGENT";

  if (isManager) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white border shadow-sm",
          className
        )}
      >
        <Image
          src="/halktv-logo.png"
          alt="HalkTV IT"
          width={40}
          height={40}
          className="h-[60%] w-auto object-contain"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground border shadow-sm",
        className
      )}
    >
      {image ? (
        <Image
          src={image}
          alt="Profil"
          width={40}
          height={40}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <HiOutlineUser className="size-[55%]" />
      )}
    </div>
  );
}
