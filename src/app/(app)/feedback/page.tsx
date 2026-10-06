import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";
import { HiOutlineLockClosed } from "react-icons/hi2";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { FeedbackForm } from "./feedback-form";
import { TrackFeedbackForm } from "./track-form";

export const metadata: Metadata = { title: "Şikayet & Öneri" };

export default async function FeedbackPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Şikayet ve Öneri Kutusu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tamamen anonim olarak düşüncelerinizi, şikayetlerinizi veya önerilerinizi iletebilirsiniz.
          </p>
        </div>
      </div>

      <Tabs defaultValue="new" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
          <TabsTrigger value="new">Yeni Mesaj</TabsTrigger>
          <TabsTrigger value="track">Durum Sorgula</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-0">
          <div className="rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
            <div className="bg-primary/5 p-6 sm:p-8 flex items-start gap-4 border-b border-primary/10">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <HiOutlineLockClosed className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Gönül Rahatlığıyla Yazın</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Bu form tamamen <b>anonimdir</b>. Kimliğiniz, e-posta adresiniz veya IP bilgileriniz kesinlikle sisteme kaydedilmez. Mesajlarınız sadece yöneticiler tarafından içerik olarak görülür.
                </p>
              </div>
            </div>
            <div className="p-6 sm:p-8 bg-card">
              <FeedbackForm />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="track" className="mt-0">
          <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm text-center">
            <h3 className="text-xl font-semibold mb-2">Gönderi Takibi</h3>
            <p className="text-sm text-muted-foreground mb-8">
              Size verilen 8 haneli Takip Kodu ile şikayetinizin veya önerinizin durumunu görebilirsiniz.
            </p>
            <TrackFeedbackForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
