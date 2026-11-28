import Link from "next/link";
import { PLATFORM_LIST, PLATFORMS } from "@/lib/platforms";
import { LogoMark } from "./Logo";

const COLS = [
  {
    title: "Explore",
    links: PLATFORM_LIST.map((p) => ({ href: `/${p}`, label: `${PLATFORMS[p].label} groups` })),
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
      { href: "/editorial", label: "Editorial policy" },
    ],
  },
  {
    title: "Legal & feedback",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms & conditions" },
      { href: "/feedback", label: "Review & suggestions" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border mt-14">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 font-bold">
            <LogoMark size={26} /> Random group chats
          </div>
          <p className="text-muted mt-3 max-w-xs">
            Find and share Instagram, Telegram and Discord group links. AI-checked and ranked by real votes.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="font-semibold mb-3">{c.title}</p>
            <ul className="flex flex-col gap-2 text-muted">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-fg transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-5 text-xs text-muted flex flex-col sm:flex-row gap-1 sm:gap-4 sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Random group chats</p>
          <p>Not affiliated with Instagram, Meta, Telegram or Discord. All trademarks belong to their owners.</p>
        </div>
      </div>
    </footer>
  );
}
