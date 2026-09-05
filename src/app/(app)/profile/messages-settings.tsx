"use client";

import { useTransition } from "react";
import { HiOutlineChatBubbleLeftRight, HiOutlineNoSymbol } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { toggleDirectMessagesAction, unblockUserAction } from "@/app/(app)/messages/actions";

export function MessagesSettings({ 
  initialEnabled, 
  blockedUsers 
}: { 
  initialEnabled: boolean;
  blockedUsers: { id: string; name: string }[];
}) {
  const [pending, start] = useTransition();

  return (
    <div className="rounded-xl border bg-card p-5 mt-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-full p-3 bg-primary/10 text-primary">
            <HiOutlineChatBubbleLeftRight className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Sohbet (Mesaj) Alımı</h3>
            <p className="text-xs text-muted-foreground mt-1">İş arkadaşlarınızın size doğrudan mesaj göndermesine izin verin.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={initialEnabled ? "outline" : "default"}
            disabled={pending}
            onClick={() => {
              start(async () => {
                const res = await toggleDirectMessagesAction(!initialEnabled);
                if (res.ok) {
                  toast.success(!initialEnabled ? "Mesaj alımı açıldı." : "Mesaj alımı kapatıldı.");
                } else {
                  toast.error("Bir hata oluştu.");
                }
              });
            }} 
          >
            {initialEnabled ? 'Kapat' : 'Aktif Et'}
          </Button>
        </div>
      </div>

      {blockedUsers.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Engellenen Kullanıcılar
          </h4>
          <div className="space-y-2">
            {blockedUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border">
                <div className="flex items-center gap-2">
                  <HiOutlineNoSymbol className="size-4 text-red-500" />
                  <span className="text-sm font-medium">{user.name}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    if (!confirm(`${user.name} isimli kullanıcının engelini kaldırmak istiyor musunuz?`)) return;
                    start(async () => {
                      const res = await unblockUserAction(user.id);
                      if (res.ok) {
                        toast.success("Engel kaldırıldı.");
                      } else {
                        toast.error("Hata oluştu.");
                      }
                    });
                  }}
                  disabled={pending}
                >
                  Engeli Kaldır
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
