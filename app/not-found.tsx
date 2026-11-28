import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PlatformIcon from "@/components/PlatformIcon";
import { PLATFORM_LIST, PLATFORMS } from "@/lib/platforms";

export default function NotFound() {
  return (
    <div className="skin">
      <Header />
      <main className="max-w-md mx-auto px-4 mt-16 text-center flex flex-col items-center gap-4">
        <p className="text-6xl font-extrabold text-accent">404</p>
        <h1 className="text-2xl font-bold">This page doesn&apos;t exist</h1>
        <p className="text-muted text-sm">The group may have been removed, or the link is wrong. Try one of these:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {PLATFORM_LIST.map((p) => (
            <Link key={p} href={`/${p}`} className="pill inline-flex items-center gap-2">
              <PlatformIcon platform={p} size={16} />
              {PLATFORMS[p].label}
            </Link>
          ))}
        </div>
        <Link href="/" className="btn-primary mt-2">
          Go home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
