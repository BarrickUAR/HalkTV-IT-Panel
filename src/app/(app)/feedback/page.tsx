import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";
import Link from "next/link";
import { HiOutlineInbox, HiOutlineLockClosed } from "react-icons/hi2";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = { title: "Şikayet & Öneri" };

export default async function FeedbackPage() {
  const user = await requireUser();
  const it = isITStaff(user.role);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Şikayet ve Öneri Kutusu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tamamen anonim olarak düşüncelerinizi, şikayetlerinizi veya önerilerinizi iletebilirsiniz.
          </p>
        </div>
        {it && (
          <Link
            href="/feedback/inbox"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <HiOutlineInbox className="size-4" /> Gelen Kutusu
          </Link>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="bg-primary/5 p-6 border-b flex items-start gap-4">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <HiOutlineLockClosed className="size-6" />
          </div>
          <div>
            <h3 className="font-semibold">%100 Anonim</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Bu form üzerinden gönderdiğiniz hiçbir bilgi (isim, e-posta, cihaz, IP adresi vb.) kayıt altına alınmaz. Gönderileriniz yalnızca içerik ve tarih/saat olarak IT Yönetimi paneline düşer. Lütfen fikirlerinizi özgürce paylaşın.
            </p>
          </div>
        </div>
        <div className="p-6">
          <FeedbackForm />
        </div>
      </div>
    </div>
  );
}
