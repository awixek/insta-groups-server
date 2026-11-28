"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

export default function AdminSelect({
  url,
  baseBody,
  field,
  value,
  options,
}: {
  url: string;
  baseBody: Record<string, unknown>;
  field: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...baseBody, [field]: e.target.value || null }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        toast(error ?? "Action failed", "error");
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={value}
      disabled={busy}
      onChange={onChange}
      className="text-sm rounded-lg bg-surface border border-border px-2.5 py-2 outline-none focus:border-accent max-w-[160px]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
