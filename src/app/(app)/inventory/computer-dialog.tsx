"use client";

import { useState, useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveComputerAction, deleteComputerAction } from "./actions";
import { HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2";

type ComputerItem = {
  id: string;
  name: string;
  departmentId: string | null;
  userId: string | null;
  notes: string | null;
  department?: { id: string; name: string } | null;
  user?: { id: string; name: string | null; email: string } | null;
};

type DepartmentOption = {
  id: string;
  name: string;
};

type UserOption = {
  id: string;
  name: string | null;
  email: string;
};

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-10 px-6">
      {pending ? "Kaydediliyor..." : isEditing ? "Değişiklikleri Kaydet" : "Cihazı Kaydet"}
    </Button>
  );
}

export function ComputerDialog({
  computer,
  departments,
  users,
  triggerLabel,
  variant = "default",
}: {
  computer?: ComputerItem;
  departments: DepartmentOption[];
  users: UserOption[];
  triggerLabel?: string;
  variant?: "default" | "ghost" | "outline";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, action] = useActionState(saveComputerAction, undefined);
  const isEditing = !!computer;

  useEffect(() => {
    if (state?.ok) {
      toast.success(isEditing ? "Cihaz bilgileri güncellendi." : "Yeni cihaz envantere eklendi.");
      setIsOpen(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, isEditing]);

  const handleDelete = async () => {
    if (!computer) return;
    if (confirm(`"${computer.name}" adlı bilgisayarı envanterden silmek istediğinize emin misiniz?`)) {
      await deleteComputerAction(computer.id);
      toast.success("Cihaz silindi.");
      setIsOpen(false);
    }
  };

  return (
    <>
      {isEditing ? (
        <Button
          variant={variant}
          size="sm"
          onClick={() => setIsOpen(true)}
          className="h-8 gap-1 text-xs"
        >
          <HiOutlinePencilSquare className="size-3.5" />
          {triggerLabel ?? "Düzenle"}
        </Button>
      ) : (
        <Button onClick={() => setIsOpen(true)} className="gap-1.5 h-10">
          <HiOutlinePlus className="size-4" />
          {triggerLabel ?? "Yeni Cihaz Ekle"}
        </Button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {isEditing ? "Cihazı Düzenle" : "Yeni Cihaz Tanımla"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bilgisayar adı ve bulunduğu departmanı belirleyin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <HiOutlineXMark className="size-5" />
              </button>
            </div>

            <form action={action} className="space-y-4">
              {isEditing && <input type="hidden" name="id" value={computer.id} />}

              <div className="space-y-2">
                <Label htmlFor="comp-name" className="text-xs font-semibold">
                  Bilgisayar Adı / Kodu <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="comp-name"
                  name="name"
                  defaultValue={computer?.name ?? ""}
                  placeholder="ör. REJI-EDITOR-01, HABER-PC-04, MUHASEBE-LAPTOP"
                  required
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comp-dept" className="text-xs font-semibold">
                  Bulunduğu Departman / Konum
                </Label>
                <select
                  id="comp-dept"
                  name="departmentId"
                  defaultValue={computer?.departmentId ?? ""}
                  className="w-full rounded-lg border border-input bg-background px-3 h-10 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="">(Belirtilmedi / Genel)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Bu cihazın şirkette hangi birimde/stüdyoda yer aldığını seçin.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comp-user" className="text-xs font-semibold">
                  Zimmetli Personel <span className="text-muted-foreground font-normal">(Opsiyonel)</span>
                </Label>
                <select
                  id="comp-user"
                  name="userId"
                  defaultValue={computer?.userId ?? ""}
                  className="w-full rounded-lg border border-input bg-background px-3 h-10 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="">(Zimmetsiz / Ortak Kullanım)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Cihaz belirli bir kişiye zimmetli değilse boş bırakabilirsiniz.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comp-notes" className="text-xs font-semibold">
                  Notlar / Donanım Bilgisi <span className="text-muted-foreground font-normal">(Opsiyonel)</span>
                </Label>
                <Input
                  id="comp-notes"
                  name="notes"
                  defaultValue={computer?.notes ?? ""}
                  placeholder="ör. Masa 3, Çift Monitör, i7 32GB RAM"
                  className="h-10"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t mt-5">
                {isEditing ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    className="h-9 gap-1"
                  >
                    <HiOutlineTrash className="size-4" /> Sil
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="h-9"
                  >
                    İptal
                  </Button>
                  <SubmitButton isEditing={isEditing} />
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
