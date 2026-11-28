"use client";

import { useEffect, useState } from "react";
import type { ToastKind } from "@/lib/toast";

interface Item {
  id: number;
  message: string;
  kind: ToastKind;
}

export default function Toaster() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let n = 0;
    function onToast(e: Event) {
      const { message, kind } = (e as CustomEvent).detail as { message: string; kind: ToastKind };
      const id = ++n;
      setItems((cur) => [...cur.slice(-2), { id, message, kind }]);
      setTimeout(() => setItems((cur) => cur.filter((i) => i.id !== id)), 3500);
    }
    window.addEventListener("app:toast", onToast);
    return () => window.removeEventListener("app:toast", onToast);
  }, []);

  if (items.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-[min(92vw,380px)] pointer-events-none"
    >
      {items.map((i) => (
        <div
          key={i.id}
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur pointer-events-auto bg-surface text-fg ${
            i.kind === "error"
              ? "border-red-500/60"
              : i.kind === "success"
              ? "border-accent2/60"
              : "border-border"
          }`}
        >
          {i.kind === "success" ? "✅ " : i.kind === "error" ? "⚠️ " : ""}
          {i.message}
        </div>
      ))}
    </div>
  );
}
