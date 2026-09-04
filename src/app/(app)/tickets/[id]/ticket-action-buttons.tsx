"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  HiOutlineArchiveBox,
  HiOutlineArchiveBoxArrowDown,
  HiOutlineTrash,
} from "react-icons/hi2";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { archiveTicket, unarchiveTicket, deleteTicket } from "./actions";

export function TicketActionButtons({
  ticketId,
  isArchived,
}: {
  ticketId: string;
  isArchived: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleArchive() {
    startTransition(async () => {
      const result = isArchived ? await unarchiveTicket(ticketId) : await archiveTicket(ticketId);
      if (result.ok) {
        toast.success(isArchived ? "Talep arşivden çıkarıldı." : "Talep arşivlendi.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Bir hata oluştu.");
      }
    });
  }

  function handleDelete() {
    if (!confirm("Bu talebi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
    startTransition(async () => {
      const result = await deleteTicket(ticketId);
      if (result.ok) {
        toast.success("Talep silindi.");
        router.push("/tickets");
      } else {
        toast.error(result.error ?? "Bir hata oluştu.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={handleArchive}
        disabled={pending}
        title={isArchived ? "Arşivden Çıkar" : "Arşivle"}
      >
        {isArchived ? (
          <HiOutlineArchiveBoxArrowDown className="size-4" />
        ) : (
          <HiOutlineArchiveBox className="size-4" />
        )}
        {isArchived ? "Arşivden Çıkar" : "Arşivle"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-destructive hover:bg-destructive/10"
        onClick={handleDelete}
        disabled={pending}
        title="Sil"
      >
        <HiOutlineTrash className="size-4" />
        Sil
      </Button>
    </div>
  );
}
