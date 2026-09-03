import Image from "next/image";
import { HiOutlineUser } from "react-icons/hi2";
import type { Role } from "@prisma/client";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
  role?: Role | string;
  image?: string | null;
  className?: string;
}

export function UserAvatar({ role, image, className, name }: UserAvatarProps & { name?: string | null }) {
  if (image) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted border shadow-sm",
          className
        )}
      >
        <Image
          src={image}
          alt={name || "Profil"}
          width={40}
          height={40}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white border shadow-sm",
        className
      )}
    >
      <Image
        src="/halktv-logo.png"
        alt="HalkTV Avatar"
        width={40}
        height={40}
        className="h-[60%] w-auto object-contain opacity-80"
        unoptimized
      />
    </div>
  );
}
