"use client";

import { useEffect, useState } from "react";
import { writeMark } from "@/lib/marks";
import { clearPendingJoin, readPendingJoin, requireLogin, toast, type PendingJoin } from "@/lib/toast";

/**
 * After someone taps Join they leave for Instagram/Telegram/Discord. When they
 * come back to this tab, ask how it went — turns silent bounces into reports.
 */
export default function JoinFollowUp() {
  const [pending, setPending] = useState<PendingJoin | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function check() {
      if (document.visibilityState !== "visible") return;
      const p = readPendingJoin();
      // ignore instant returns (<6s) and stale ones (>1h)
      if (p && Date.now() - p.at > 6000 && Date.now() - p.at < 3600_000) setPending(p);
    }
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    check();
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  if (!pending) return null;

  function dismiss() {
    clearPendingJoin();
    setPending(null);
  }

  async function report(type: "full" | "broken_invite") {
    if (!pending) return;
    setBusy(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch("/api/groups/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: pending.id, type }),
        signal: ctrl.signal,
      });
      if (res.status === 401) {
        requireLogin("Login to report this group");
        return;
      }
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        toast(error ?? "Couldn't send the report", "error");
        return;
      }
      toast("Thanks — we'll look into it", "success");
      dismiss();
    } catch {
      toast("Network is slow — please try again", "error");
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-16 sm:bottom-0 inset-x-0 z-[55] p-3 flex justify-center">
      <div className="card w-full max-w-md flex flex-col gap-3 shadow-xl !bg-surface">
        <p className="text-sm">
          How did <b>{pending.name}</b> go?
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            className="btn-primary text-sm !py-2"
            onClick={() => {
              writeMark(pending.id, "joined");
              toast("Glad you got in 🎉", "success");
              dismiss();
            }}
          >
            ✅ Joined
          </button>
          <button disabled={busy} className="btn-ghost text-sm !py-2" onClick={() => report("full")}>
            🚫 Group full
          </button>
          <button disabled={busy} className="btn-ghost text-sm !py-2" onClick={() => report("broken_invite")}>
            ⚠️ Link broken
          </button>
          <button className="text-xs text-muted underline ml-auto self-center" onClick={dismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
