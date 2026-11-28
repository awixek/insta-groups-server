"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PLATFORM_LIST, PLATFORMS } from "@/lib/platforms";
import PlatformIcon from "./PlatformIcon";

/** Phone-only bottom tab bar (replaces the old floating Register button that covered content). */
export default function MobileNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  const item = "flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium";
  const on = "text-fg";
  const off = "text-muted";

  return (
    <nav
      aria-label="Primary"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex">
        <Link href="/" className={`${item} ${pathname === "/" ? on : off}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
          </svg>
          Home
        </Link>
        {PLATFORM_LIST.map((p) => {
          const active = pathname === `/${p}` || pathname.startsWith(`/${p}/`);
          return (
            <Link key={p} href={`/${p}`} className={`${item} ${active ? on : off}`}>
              <PlatformIcon platform={p} size={22} className={active ? "" : "opacity-60 grayscale"} />
              {PLATFORMS[p].label}
            </Link>
          );
        })}
        <Link href="/register" className={`${item} ${pathname === "/register" ? on : off}`}>
          <span className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-white" style={{ background: "var(--accent-grad)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          Add
        </Link>
      </div>
    </nav>
  );
}
