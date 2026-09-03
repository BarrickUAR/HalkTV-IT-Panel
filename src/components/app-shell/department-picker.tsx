"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { setDepartmentAction } from "./actions";

const DEPARTMENTS = [
  "Haber Merkezi",
  "Editör Katı",
  "Reji",
  "Teknik",
  "Prodüksiyon",
  "İnsan Kaynakları",
  "Muhasebe",
  "Yönetim",
];

export function DepartmentPickerModal() {
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    if (!selected) return;
    setLoading(true);
    await setDepartmentAction(selected);
    router.refresh(); // sayfayı yenile ki modal kaybolsun
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 -sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-lg animate-in zoom-in-95">
        <h2 className="text-xl font-bold tracking-tight">Hoş Geldiniz!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Taleplerinizin doğru ekibe daha hızlı ulaşabilmesi için lütfen çalıştığınız birimi seçin.
          <br />
          <span className="font-medium text-foreground">Not: Bu seçimi daha sonra değiştiremezsiniz.</span>
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelected(dept)}
              className={`rounded-lg border p-3 text-sm font-medium transition-all text-left ${
                selected === dept
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSubmit} disabled={!selected || loading}>
            {loading ? "Kaydediliyor..." : "Kaydet ve Başla"}
          </Button>
        </div>
      </div>
    </div>
  );
}
