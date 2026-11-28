"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLATFORM_LIST, PLATFORMS, type Platform } from "@/lib/platforms";

export default function AdminCategoryForm({ defaultPlatform }: { defaultPlatform: Platform }) {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>(defaultPlatform);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", platform, slug, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      setSlug("");
      setName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const input = "rounded-xl bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-accent";
  return (
    <form onSubmit={submit} className="card flex flex-col gap-2 mb-6">
      <p className="text-sm font-medium">Add category</p>
      <div className="flex flex-wrap gap-2">
        <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className={input}>
          {PLATFORM_LIST.map((p) => (
            <option key={p} value={p}>
              {PLATFORMS[p].label}
            </option>
          ))}
        </select>
        <input required placeholder="slug (e.g. crypto)" value={slug} onChange={(e) => setSlug(e.target.value)} className={input} />
        <input required placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} className={input} />
        <button disabled={busy} className="btn-primary text-sm !py-2">
          Add
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
