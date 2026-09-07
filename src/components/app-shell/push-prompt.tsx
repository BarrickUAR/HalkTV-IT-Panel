"use client";

import { useState, useEffect } from "react";
import { HiOutlineBell } from "react-icons/hi2";
import { toast } from "sonner";
import { saveSubscriptionAction } from "@/app/(app)/profile/actions";

import { Button } from "@/components/ui/button";

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          return;
        }
        if (Notification.permission === "denied") {
          return;
        }
        if (Notification.permission !== "granted") {
          setShowPrompt(true);
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (!sub) {
          setShowPrompt(true);
        }
      } catch {
        // Sessiz gec
      }
    }
    checkStatus();
  }, []);

  async function enablePush() {
    if (!("serviceWorker" in navigator)) {
      toast.error("Tarayıcınız anlık bildirimleri desteklemiyor.");
      return;
    }
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setShowPrompt(false);
        toast.info("Bildirim izni verilmedi.");
        return;
      }
      if (!publicVapidKey) {
        toast.error("VAPID bildirim anahtarı eksik.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
        });
      }

      const res = await saveSubscriptionAction({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.toJSON().keys?.p256dh || "",
          auth: subscription.toJSON().keys?.auth || "",
        },
      });

      if (res.ok) {
        setShowPrompt(false);
        toast.success("Web bildirimleri başarıyla aktif edildi!");
      }
    } catch (err: any) {
      toast.error("Bildirim izni alınamadı: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!showPrompt) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={enablePush}
      disabled={loading}
      title="Tarayıcı bildirimlerini aç"
      className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium"
    >
      <HiOutlineBell className="size-4" />
      <span>{loading ? "Açılıyor…" : "Bildirimleri Aç"}</span>
    </Button>
  );
}

