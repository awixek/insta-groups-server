"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PLATFORMS } from "@/lib/platforms";
import type { Category, Group } from "@/lib/types";

const inputCls = "w-full rounded-xl bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-accent";

/** Edit / mark full / reopen / delete controls shown under a group on My Groups. */
export default function OwnerActions({ group }: { group: Group }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [link, setLink] = useState(group.invite_link);
  const [categoryId, setCategoryId] = useState(group.category_id ?? "");

  useEffect(() => {
    if (!editing || categories.length) return;
    fetch(`/api/categories?platform=${group.platform}`)
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
  }, [editing, categories.length, group.platform]);

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/groups/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: group.id, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const slug = categories.find((c) => c.id === categoryId)?.slug;
    const ok = await call({ action: "update", name, description, invite_link: link, category_slug: slug });
    if (ok) setEditing(false);
  }

  const isLive = group.status === "active" || group.status === "almost_full" || group.status === "possibly_full";
  const isFull = group.status === "possibly_full" || group.status === "almost_full";

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap">
        <button className="btn-ghost text-xs !py-1 !px-2.5" onClick={() => setEditing((e) => !e)}>
          {editing ? "Cancel" : "✏️ Edit"}
        </button>
        {isLive && !isFull && (
          <button disabled={busy} className="btn-ghost text-xs !py-1 !px-2.5" onClick={() => call({ action: "mark_full" })}>
            🔴 Mark full
          </button>
        )}
        {isFull && (
          <button disabled={busy} className="btn-ghost text-xs !py-1 !px-2.5" onClick={() => call({ action: "reopen" })}>
            🟢 Reopen
          </button>
        )}
        <button
          disabled={busy}
          className="btn-ghost text-xs !py-1 !px-2.5 !border-red-500/60 !text-red-400"
          onClick={() => {
            if (window.confirm(`Delete "${group.name}" permanently?`)) call({ action: "delete" });
          }}
        >
          🗑 Delete
        </button>
      </div>

      {editing && (
        <form onSubmit={save} className="card flex flex-col gap-2">
          <p className="text-xs text-muted">Edits are re-checked by AI before going live.</p>
          <input required minLength={3} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          <input required type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder={PLATFORMS[group.platform].placeholder} className={inputCls} />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
            <option value="">Let AI choose</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <textarea required minLength={10} maxLength={300} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
          <button disabled={busy} className="btn-primary text-sm !py-2">{busy ? "Saving…" : "Save changes"}</button>
        </form>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
