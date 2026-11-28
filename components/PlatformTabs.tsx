import Link from "next/link";
import PlatformIcon from "@/components/PlatformIcon";
import { PLATFORM_LIST, PLATFORMS, type Platform } from "@/lib/platforms";

export default function PlatformTabs({ active }: { active?: Platform }) {
  return (
    <nav className="max-w-6xl mx-auto px-4 mt-4 flex gap-2 overflow-x-auto no-scrollbar fade-right pr-8">
      <Link href="/" className={`pill ${!active ? "pill-active" : ""}`}>
        All
      </Link>
      {PLATFORM_LIST.map((p) => (
        <Link key={p} href={`/${p}`} className={`pill ${active === p ? "pill-active" : ""}`}>
          <span className="inline-flex items-center gap-1.5">
            <PlatformIcon platform={p} size={16} />
            {PLATFORMS[p].label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
