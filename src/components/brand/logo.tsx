import Image from "next/image";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
  imageClassName = "h-8 w-auto",
}: {
  className?: string;
  showWordmark?: boolean;
  imageClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/halktv-logo.png"
        alt="Halk TV"
        width={116}
        height={150}
        className={imageClassName}
        priority
      />
      {showWordmark && (
        <span className="text-lg leading-none font-semibold tracking-tight">
          Teknik Destek
        </span>
      )}
    </div>
  );
}
