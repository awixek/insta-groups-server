"use client";

import Link from "next/link";
import type { Category } from "@/lib/types";

export default function CategoryScroll({
  categories,
  activeSlug,
}: {
  categories: Category[];
  activeSlug?: string;
}) {
  return (
    <div className="max-w-5xl mx-auto px-4 mt-4 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Link href="/" className={`pill ${!activeSlug ? "pill-active" : ""}`}>
        All
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/category/${c.slug}`}
          className={`pill ${activeSlug === c.slug ? "pill-active" : ""}`}
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}
