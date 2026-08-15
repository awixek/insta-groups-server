"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-bg/80 border-b border-border">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          InstaGroups <span className="text-accent">AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/profile" className="btn-ghost text-sm py-1.5 px-3">
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}
