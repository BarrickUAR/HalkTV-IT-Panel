"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteDepartmentAction, updateDepartmentAction } from "./actions";
import { SYSTEM_FLOORS } from "@/lib/floors";
import { toast } from "sonner";
import { HiOutlinePencilSquare, HiOutlineTrash, HiOutlineCheck, HiOutlineXMark, HiOutlineChevronUp, HiOutlineChevronDown } from "react-icons/hi2";

export function DepartmentRow({
  department,
  index,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  draggable,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDragOver
}: {
  department: any;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLTableRowElement>) => void;
  onDragEnter?: (e: React.DragEvent<HTMLTableRowElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLTableRowElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLTableRowElement>) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(department.name);
  const [floor, setFloor] = useState(department.floor || "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    const res = await updateDepartmentAction(department.id, name, floor);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Departman güncellendi.");
      setIsEditing(false);
    }
    setIsSaving(false);
  }

  return (
    <tr
      className="hover:bg-muted/50 transition-colors"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      <td className="px-4 py-3 text-center cursor-move" title="Sürükleyerek yer değiştirebilirsiniz">
        <div className="flex flex-col items-center justify-center gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <HiOutlineChevronUp className="size-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <HiOutlineChevronDown className="size-4" />
          </button>
        </div>
      </td>
      <td className="px-4 py-3 font-medium text-foreground">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 max-w-[250px] text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") {
                  setName(department.name);
                  setFloor(department.floor || "");
                  setIsEditing(false);
                }
              }}
            />
            <Button size="icon" variant="ghost" className="size-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" onClick={handleSave} disabled={isSaving}>
              <HiOutlineCheck className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-foreground" onClick={() => {
              setName(department.name);
              setFloor(department.floor || "");
              setIsEditing(false);
            }} disabled={isSaving}>
              <HiOutlineXMark className="size-4" />
            </Button>
          </div>
        ) : (
          <Link href={`/departments/${department.id}`} className="hover:underline text-primary">
            {department.name}
          </Link>
        )}
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <div className="relative min-w-[130px]">
            <select
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Kat Seçiniz...</option>
              {SYSTEM_FLOORS.map((sf) => (
                <option key={sf} value={sf}>{sf}</option>
              ))}
              <option value="-1. Kat">-1. Kat</option>
              <option value="Saha">Saha / Dış Çekim</option>
            </select>
          </div>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-secondary text-secondary-foreground border border-border">
            {department.floor || "Belirtilmedi"}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-center text-muted-foreground">{department._count.users}</td>
      <td className="px-4 py-3 text-center text-muted-foreground">{department._count.computers}</td>
      <td className="px-4 py-3 text-right">
        {!isEditing && (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => setIsEditing(true)}
              title="Düzenle"
            >
              <HiOutlinePencilSquare className="size-4" />
            </Button>
            <form
              action={async () => {
                const ok = confirm("Bu departmanı silmek istediğinize emin misiniz?");
                if (!ok) return;
                const res = await deleteDepartmentAction(department.id);
                if (res?.error) toast.error(res.error);
                else toast.success("Departman silindi.");
              }}
            >
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Sil"
              >
                <HiOutlineTrash className="size-4" />
              </Button>
            </form>
          </div>
        )}
      </td>
    </tr>
  );
}
