"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar() {
  const [q, setQ] = useState("");
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/?search=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={onSubmit} className="max-w-5xl mx-auto px-4 mt-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search groups, keywords, categories..."
        className="w-full rounded-2xl bg-surface border border-border px-4 py-3 text-base outline-none focus:border-accent"
      />
    </form>
  );
}
