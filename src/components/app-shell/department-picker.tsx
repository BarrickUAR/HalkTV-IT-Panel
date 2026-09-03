"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineBuildingOffice2, HiOutlineCheck } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { setDepartmentAction } from "./actions";

type DepartmentItem = {
  id: string;
  name: string;
};

export function DepartmentPickerModal({
  departments = [],
}: {
  departments?: DepartmentItem[];
}) {
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Admin panelden gelen departmanlar; eğer henüz hiç eklenmemişse varsayılan kurumsal katlar
  const list = departments.length > 0 ? departments : [
    { id: "haber", name: "Haber Merkezi" },
    { id: "reji", name: "Reji & Yayın" },
    { id: "kurgu", name: "Kurgu & Montaj" },
    { id: "teknik", name: "Teknik Servis & IT" },
    { id: "muhasebe", name: "Muhasebe & Finans" },
    { id: "ik", name: "İnsan Kaynakları" },
    { id: "yonetim", name: "Yönetim" },
  ];

  async function handleSubmit() {
    if (!selected) return;
    setLoading(true);
    try {
      await setDepartmentAction(selected);
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-50">
      <div className="w-full max-w-lg rounded-2xl bg-card border p-6 shadow-2xl animate-in zoom-in-95 space-y-5">
        <div className="text-center space-y-1.5">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <HiOutlineBuildingOffice2 className="size-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Hoş Geldiniz!</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Teknik destek taleplerinizin doğru ekibe hızlı ulaşabilmesi için lütfen çalıştığınız <span className="font-semibold text-foreground">katı / departmanı</span> seçin.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-1">
          {list.map((dept) => {
            const isSelected = selected === dept.id || selected === dept.name;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => setSelected(dept.id)}
                className={`relative flex items-center justify-between rounded-xl border p-3.5 text-sm font-medium transition-all text-left ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary"
                    : "border-border bg-background hover:bg-muted/50 hover:border-muted-foreground/30"
                }`}
              >
                <span className="truncate pr-2">{dept.name}</span>
                {isSelected && (
                  <HiOutlineCheck className="size-4 shrink-0 text-primary" />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-center text-muted-foreground">
          ⚠️ Not: Bu seçim sonrasında sadece IT yöneticisi tarafından değiştirilebilir.
        </p>

        <div className="flex justify-end pt-2 border-t">
          <Button
            onClick={handleSubmit}
            disabled={!selected || loading}
            className="w-full h-11 text-sm font-semibold"
          >
            {loading ? "Kaydediliyor..." : "Kaydet ve Başla"}
          </Button>
        </div>
      </div>
    </div>
  );
}
