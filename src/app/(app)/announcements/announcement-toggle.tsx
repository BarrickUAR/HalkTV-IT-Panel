"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { setAnnouncementActive } from "./actions";

export function AnnouncementToggle({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 shrink-0"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setAnnouncementActive(id, !isActive);
          router.refresh();
        })
      }
    >
      {isActive ? "Kaldır" : "Yayınla"}
    </Button>
  );
}
