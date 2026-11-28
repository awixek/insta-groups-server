"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLATFORM_LIST, PLATFORMS } from "@/lib/platforms";
import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";
import PlatformIcon from "./PlatformIcon";

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
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  return (
    <header className="site-header sticky top-0 z-40 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="w-9 h-9 -ml-2 flex items-center justify-center rounded-full hover:bg-fg/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute left-0 mt-2 w-56 rounded-xl border border-border bg-surface shadow-xl z-10 overflow-hidden py-1">
              {MENU_LINKS.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block text-sm px-4 py-2.5 hover:bg-fg/5">
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link href="/" aria-label="Random group chats — home" className="mr-1 shrink-0">
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="Platforms">
          {PLATFORM_LIST.map((p) => {
            const active = pathname === `/${p}` || pathname.startsWith(`/${p}/`);
            return (
              <Link
                key={p}
                href={`/${p}`}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-fg/10 text-fg" : "text-muted hover:text-fg hover:bg-fg/5"
                }`}
              >
                <PlatformIcon platform={p} size={18} />
                {PLATFORMS[p].label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Link href="/register" className="btn-primary text-sm !py-2 !px-4 hidden sm:inline-flex">
            + Add group
          </Link>
          {email ? (
            <Link
              href="/profile"
              title={email}
              aria-label="Your account"
              className="w-9 h-9 ml-1 rounded-full bg-accent/15 text-accent font-semibold flex items-center justify-center border border-accent/30"
            >
              {email[0]?.toUpperCase()}
            </Link>
          ) : (
            <Link href="/profile" className="btn-ghost text-sm !py-1.5 !px-3.5 ml-0.5">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
