"use client";

import Link from "next/link";
import type { Category } from "@/lib/types";
import type { Platform } from "@/lib/platforms";

export default function CategoryScroll({
  categories,
  platform,
  activeSlug,
}: {
  categories: Category[];
  platform: Platform;
  activeSlug?: string;
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar fade-right pr-8">
      <Link href={`/${platform}`} className={`pill ${!activeSlug ? "pill-active" : ""}`}>
        All
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/${platform}/category/${c.slug}`}
          className={`pill ${activeSlug === c.slug ? "pill-active" : ""}`}
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}
