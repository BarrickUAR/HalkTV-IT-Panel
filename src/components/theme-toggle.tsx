"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { HiOutlineSun, HiOutlineMoon } from "react-icons/hi2";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Temayı değiştir" className="h-9 w-9">
        <span className="size-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Temayı değiştir"
      className="h-9 w-9 text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Açık Temaya Geç" : "Koyu Temaya Geç"}
    >
      {isDark ? (
        <HiOutlineSun className="size-5 text-amber-400 transition-all hover:rotate-45" />
      ) : (
        <HiOutlineMoon className="size-5 text-slate-700 dark:text-slate-300 transition-all hover:-rotate-12" />
      )}
    </Button>
  );
}
