"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Modal shown when an action needs login — keeps the user on the page and returns them here after login. */
export default function LoginPrompt() {
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    function onLogin(e: Event) {
      setReason(((e as CustomEvent).detail?.reason as string) ?? "Login to continue");
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setReason(null);
    }
    window.addEventListener("app:login", onLogin);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("app:login", onLogin);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!reason) return null;

  async function login() {
    const supabase = createClient();
    const next = window.location.pathname + window.location.search;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center p-4"
      onClick={() => setReason(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Login"
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-sm flex flex-col gap-3 !bg-surface"
      >
        <p className="text-lg font-semibold">{reason}</p>
        <p className="text-sm text-muted">
          Free account, one tap with Google. Joining groups never needs login — only voting, saving and reporting.
        </p>
        <button onClick={login} className="btn-primary">
          Continue with Google
        </button>
        <button onClick={() => setReason(null)} className="btn-ghost">
          Not now
        </button>
      </div>
    </div>
  );
}
