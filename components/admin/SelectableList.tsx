"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

export interface BulkAction {
  label: string;
  /** API route to POST to */
  url: string;
  /** JSON body; the selected ids are added under `idsField` */
  body: Record<string, unknown>;
  idsField: string;
  variant?: "primary" | "ghost" | "danger";
  /** `{n}` is replaced with the number of selected items */
  confirmMessage?: string;
}

/**
 * Server-rendered cards with a checkbox each + a sticky action bar.
 * The page renders each card as a React node; this component only adds selection + bulk actions.
 */
export default function SelectableList({
  items,
  actions,
  emptyText,
}: {
  items: { id: string; node: React.ReactNode }[];
  actions: BulkAction[];
  emptyText: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function run(a: BulkAction) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (a.confirmMessage && !window.confirm(a.confirmMessage.replace("{n}", String(ids.length)))) return;
    setBusy(true);
    try {
      const res = await fetch(a.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...a.body, [a.idsField]: ids }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        toast(error ?? "Action failed", "error");
        return;
      }
      toast(`${a.label}: ${ids.length} done`, "success");
      setSelected(new Set());
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const cls = (v?: string) =>
    v === "primary" ? "btn-primary" : v === "danger" ? "btn-ghost !border-red-500/60 !text-red-400" : "btn-ghost";

  if (items.length === 0) return <p className="text-muted text-sm">{emptyText}</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-2 z-20 flex items-center gap-2 flex-wrap rounded-xl border border-border bg-surface/95 backdrop-blur px-3 py-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(allIds))}
            className="w-4 h-4 accent-[rgb(var(--accent))]"
          />
          {selected.size > 0 ? `${selected.size} selected` : "Select all"}
        </label>
        <div className="flex gap-2 flex-wrap ml-auto">
          {actions.map((a) => (
            <button
              key={a.label}
              disabled={busy || selected.size === 0}
              onClick={() => run(a)}
              className={`${cls(a.variant)} text-sm !py-1.5 !px-3 disabled:opacity-40`}
            >
              {busy ? "…" : a.label}
            </button>
          ))}
        </div>
      </div>

      {items.map((it) => (
        <div key={it.id} className="flex gap-3 items-start">
          <input
            type="checkbox"
            checked={selected.has(it.id)}
            onChange={() => toggle(it.id)}
            aria-label="Select group"
            className="mt-5 w-5 h-5 shrink-0 accent-[rgb(var(--accent))]"
          />
          <div className="flex-1 min-w-0">{it.node}</div>
        </div>
      ))}
    </div>
  );
}
