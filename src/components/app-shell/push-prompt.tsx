"use client";

import { useState, useEffect } from "react";
import { HiOutlineBell } from "react-icons/hi2";
import { toast } from "sonner";
import { saveSubscriptionAction } from "@/app/(app)/profile/actions";

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
    <button
      type="button"
      onClick={enablePush}
      disabled={loading}
      title="Anlık bildirimleri tarayıcınızda açın"
      className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 transition-all duration-200 shadow-2xs"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </span>
      <HiOutlineBell className="size-3.5" />
      <span>{loading ? "Açılıyor…" : "Bildirimleri Aç"}</span>
    </button>
  );
}

