"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "./ThemeToggle";

const MENU_LINKS = [
  { href: "/my-groups", label: "My Groups" },
  { href: "/saved", label: "Saved Groups" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
  { href: "/faq", label: "FAQ" },
  { href: "/editorial", label: "Editorial Policy" },
  { href: "/feedback", label: "Review & Suggestions" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
];

export default function Header() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  return (
    <header className="site-header sticky top-0 z-40 backdrop-blur border-b border-border">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-border/50 text-lg -ml-1"
            >
              ☰
            </button>
            {menuOpen && (
              <div className="absolute left-0 mt-1 w-56 rounded-xl border border-border bg-surface shadow-lg z-10 overflow-hidden py-1">
                {MENU_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="block text-sm px-3 py-2 hover:bg-border/40"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/" className="font-semibold text-lg tracking-tight">
            Random <span className="text-accent">insta groups</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {email ? (
            <Link
              href="/profile"
              className="btn-ghost text-sm py-1.5 px-3 max-w-[160px] truncate inline-flex items-center"
              title={email}
            >
              <span className="text-accent font-semibold">{email[0]?.toUpperCase()}</span>
              <span className="truncate">{email.slice(1)}</span>
            </Link>
          ) : (
            <Link href="/profile" className="btn-ghost text-sm py-1.5 px-3">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
