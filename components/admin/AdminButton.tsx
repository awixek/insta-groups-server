"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

/** Small button that POSTs JSON to an /api/admin/* route, then refreshes the page. */
export default function AdminButton({
  url,
  body,
  label,
  variant = "ghost",
  confirmMessage,
  prompt,
}: {
  url: string;
  body: Record<string, unknown>;
  label: string;
  variant?: "primary" | "ghost" | "danger";
  confirmMessage?: string;
  /** ask for text first and send it as body[field] (cancel = abort) */
  prompt?: { field: string; message: string; defaultValue?: string; optional?: boolean };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    const payload = { ...body };
    if (prompt) {
      const v = window.prompt(prompt.message, prompt.defaultValue ?? "");
      if (v === null) return;
      if (!v.trim() && !prompt.optional) return;
      payload[prompt.field] = v.trim();
    }
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        toast(error ?? "Action failed", "error");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const cls =
    variant === "primary"
      ? "btn-primary"
      : variant === "danger"
      ? "btn-ghost !border-red-500/60 !text-red-400"
      : "btn-ghost";

  return (
    <button onClick={run} disabled={busy} className={`${cls} text-sm !py-2 !px-3.5 disabled:opacity-50`}>
      {busy ? "…" : label}
    </button>
  );
}
