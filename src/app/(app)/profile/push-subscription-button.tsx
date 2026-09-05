"use client";

import { useState, useEffect } from "react";
import { HiOutlineBell, HiOutlineBellSlash } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveSubscriptionAction } from "./actions";

// Use the public key from env
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushSubscriptionButton() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSubscription() {
      try {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        }
      } catch (err) {
        console.error("Push API error", err);
      } finally {
        setLoading(false);
      }
    }
    checkSubscription();
  }, []);

  async function handleSubscribe() {
    if (!('serviceWorker' in navigator)) {
      toast.error("Tarayıcınız bildirimleri desteklemiyor.");
      return;
    }
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Unsubscribe
        await subscription.unsubscribe();
        setIsSubscribed(false);
        toast.info("Bildirimler kapatıldı.");
        return;
      }

      // Subscribe
      if (!publicVapidKey) throw new Error("VAPID key eksik");

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      const res = await saveSubscriptionAction({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.toJSON().keys?.p256dh || "",
          auth: subscription.toJSON().keys?.auth || "",
        }
      });

      if (res.ok) {
        setIsSubscribed(true);
        toast.success("Bildirimler başarıyla açıldı!");
      } else {
        throw new Error(res.error || "Sunucu hatası");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Bildirim izni alınamadı: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-5 mt-4">
      <div className="flex items-center gap-4">
        <div className={`rounded-full p-3 ${isSubscribed ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {isSubscribed ? <HiOutlineBell className="size-5" /> : <HiOutlineBellSlash className="size-5" />}
        </div>
        <div>
          <h3 className="font-semibold text-sm">Tarayıcı (Web) Bildirimleri</h3>
          <p className="text-xs text-muted-foreground mt-1">Yeni bir talep geldiğinde veya güncellendiğinde masaüstü bildirimi alın.</p>
        </div>
      </div>
      <Button 
        variant={isSubscribed ? "outline" : "default"} 
        onClick={handleSubscribe} 
        disabled={loading}
      >
        {loading ? "Bekleniyor..." : isSubscribed ? "Kapat" : "Aktif Et"}
      </Button>
    </div>
  );
}
