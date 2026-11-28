"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar({
  basePath = "/",
  initial = "",
  placeholder = "Search groups, topics, keywords…",
  className = "max-w-6xl mx-auto px-4 mt-5",
}: {
  basePath?: string;
  initial?: string;
  placeholder?: string;
  className?: string;
}) {
  const [q, setQ] = useState(initial);
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`${basePath}?search=${encodeURIComponent(q.trim())}`);
    else router.push(basePath);
  }

  return (
    <form onSubmit={onSubmit} role="search" className={className}>
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label="Search groups"
          className="w-full rounded-full bg-surface border border-border pl-11 pr-4 py-3 text-base outline-none focus:border-accent transition-colors"
        />
      </div>
    </form>
  );
}
