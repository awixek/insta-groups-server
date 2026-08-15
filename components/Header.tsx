"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  return (
    <header className="site-header sticky top-0 z-40 backdrop-blur border-b border-border">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          InstaGroups <span className="text-accent">AI</span>
        </Link>
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
