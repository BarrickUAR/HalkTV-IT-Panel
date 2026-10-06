"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HiOutlineArrowPath } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { DepartmentRow } from "./department-row";
import { reorderDepartmentsAction } from "./actions";

export function DepartmentListClient({ initialDepartments }: { initialDepartments: any[] }) {
  const [list, setList] = useState(initialDepartments);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDraggedItemIndex(index);
    // Firefox requires dataTransfer.setData to enable drag
    e.dataTransfer?.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      if (e.target instanceof HTMLElement) e.target.style.opacity = "0.5";
    }, 0);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const newList = [...list];
    const draggedItem = newList[draggedItemIndex];
    newList.splice(draggedItemIndex, 1);
    newList.splice(index, 0, draggedItem);
    setDraggedItemIndex(index);
    setList(newList);
    setHasChanges(true);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    setDraggedItemIndex(null);
    if (e.target instanceof HTMLElement) e.target.style.opacity = "1";
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newList = [...list];
    const temp = newList[index - 1];
    newList[index - 1] = newList[index];
    newList[index] = temp;
    setList(newList);
    setHasChanges(true);
  };

  const moveDown = (index: number) => {
    if (index === list.length - 1) return;
    const newList = [...list];
    const temp = newList[index + 1];
    newList[index + 1] = newList[index];
    newList[index] = temp;
    setList(newList);
    setHasChanges(true);
  };

  const handleSaveOrder = async () => {
    setIsSaving(true);
    const orders = list.map((d, i) => ({ id: d.id, sortOrder: i }));
    const res = await reorderDepartmentsAction(orders);
    if (res?.ok) {
      toast.success("Sıralama başarıyla kaydedildi.");
      setHasChanges(false);
    } else {
      toast.error("Sıralama kaydedilemedi.");
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-4">
      {hasChanges && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-600">Sıralamayı değiştirdiniz, kaydetmeyi unutmayın.</p>
          <Button onClick={handleSaveOrder} disabled={isSaving} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
            {isSaving ? <HiOutlineArrowPath className="size-4 animate-spin mr-2" /> : null}
            Sıralamayı Kaydet
          </Button>
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3 w-20 text-center">Sıra</th>
              <th className="px-4 py-3">Departman Adı</th>
              <th className="px-4 py-3">Kat</th>
              <th className="px-4 py-3 text-center">Personel</th>
              <th className="px-4 py-3 text-center">Kayıtlı Cihaz</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Henüz kayıtlı departman bulunmuyor. Yukarıdaki formdan hemen bir departman ekleyebilirsiniz.
                </td>
              </tr>
            ) : (
              list.map((d, index) => (
                <DepartmentRow
                  key={d.id}
                  department={d}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === list.length - 1}
                  onMoveUp={() => moveUp(index)}
                  onMoveDown={() => moveDown(index)}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
