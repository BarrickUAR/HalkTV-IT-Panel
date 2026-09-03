"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteDepartmentAction, updateDepartmentAction } from "./actions";
import { toast } from "sonner";
import { HiOutlinePencilSquare, HiOutlineTrash, HiOutlineCheck, HiOutlineXMark } from "react-icons/hi2";

export function DepartmentRow({ department }: { department: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(department.name);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    const res = await updateDepartmentAction(department.id, name);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Departman güncellendi.");
      setIsEditing(false);
    }
    setIsSaving(false);
  }

  return (
    <tr className="hover:bg-muted/30 transition-colors">
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
                  setIsEditing(false);
                }
              }}
            />
            <Button size="icon" variant="ghost" className="size-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" onClick={handleSave} disabled={isSaving}>
              <HiOutlineCheck className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-foreground" onClick={() => {
              setName(department.name);
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
