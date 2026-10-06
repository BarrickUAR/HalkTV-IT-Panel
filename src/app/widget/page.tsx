import { HiOutlineServerStack, HiOutlineClock } from "react-icons/hi2";

export default function WidgetPage() {
  return (
    <div className="widget-page flex h-screen w-full flex-col items-end p-2 pointer-events-none">
      {/*
        pointer-events-none ensures we can click through the transparent parts.
        But the widget box itself should be pointer-events-auto.
      */}
      <div className="pointer-events-auto mt-4 w-64 rounded-xl border border-border/50 bg-background/80 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 border-b pb-3">
          <img src="/icon.png" className="size-6 rounded-md" alt="Logo" />
          <h2 className="text-sm font-bold tracking-tight">HalkTV IT</h2>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HiOutlineServerStack className="size-4" />
            <span className="font-mono text-xs font-semibold">PC-YONETMEN-01</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HiOutlineClock className="size-4" />
            <span className="font-mono text-xs font-semibold" id="time-display">00:00</span>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-primary/10 p-2 text-center text-xs font-semibold text-primary">
          0 Okunmamış Mesaj
        </div>
      </div>

      {/* Script to update time */}
      <script dangerouslySetInnerHTML={{ __html: `
        setInterval(() => {
          const el = document.getElementById('time-display');
          if (el) el.innerText = new Date().toLocaleTimeString('tr-TR');
        }, 1000);
      ` }} />
    </div>
  );
}
