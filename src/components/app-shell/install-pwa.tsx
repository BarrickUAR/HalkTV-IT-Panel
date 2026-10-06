"use client";

import { useEffect, useState } from "react";
import { HiOutlineArrowDownTray } from "react-icons/hi2";
import { Button } from "@/components/ui/button";

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isInstalled || !deferredPrompt) {
    return null; // Don't show the button if already installed or can't be installed
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="hidden md:flex gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-all font-semibold"
      onClick={handleInstallClick}
    >
      <HiOutlineArrowDownTray className="size-4" />
      Masaüstü Uygulamasını Kur
    </Button>
  );
}
