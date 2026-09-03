"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";
import type { TicketPriority, TicketStatus } from "@prisma/client";

import { cn } from "@/lib/utils";
import {
  PRIORITY_BADGE,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/ticket-labels";
import { updateTicketStatus } from "@/app/(app)/tickets/[id]/actions";

type Card = {
  id: string;
  number: string;
  title: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignee: string | null;
};

const COLUMNS: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_REQUESTER",
  "RESOLVED",
];

function TicketCard({ card }: { card: Card }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab touch-none rounded-lg border bg-card p-3 text-sm shadow-sm active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <p className="font-mono text-[11px] text-muted-foreground">
        {card.number}
      </p>
      <p className="mt-0.5 leading-snug font-medium">{card.title}</p>
      <div className="mt-2 flex items-center justify-between">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-medium",
            PRIORITY_BADGE[card.priority],
          )}
        >
          {PRIORITY_LABELS[card.priority]}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {card.assignee ?? "—"}
        </span>
      </div>
    </div>
  );
}

function Column({ status, cards }: { status: TicketStatus; cards: Card[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-2 rounded-xl border bg-muted/30 p-3",
        isOver && "ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold">{STATUS_LABELS[status]}</span>
        <span className="text-xs text-muted-foreground">{cards.length}</span>
      </div>
      {cards.map((c) => (
        <TicketCard key={c.id} card={c} />
      ))}
      {cards.length === 0 ? (
        <p className="px-1 py-6 text-center text-xs text-muted-foreground">
          Boş
        </p>
      ) : null}
    </div>
  );
}

export function Board({ initial }: { initial: Card[] }) {
  const [cards, setCards] = useState<Card[]>(initial);
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    if (!e.over) return;
    const target = String(e.over.id) as TicketStatus;
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === target) return;

    const prev = card.status;
    setCards((cs) =>
      cs.map((c) => (c.id === id ? { ...c, status: target } : c)),
    );
    updateTicketStatus(id, target).then((r) => {
      if (!r.ok) {
        setCards((cs) =>
          cs.map((c) => (c.id === id ? { ...c, status: prev } : c)),
        );
        toast.error("Güncellenemedi.");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((status) => (
          <Column
            key={status}
            status={status}
            cards={cards.filter((c) => c.status === status)}
          />
        ))}
      </div>
    </DndContext>
  );
}
