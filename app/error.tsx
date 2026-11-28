"use client";

import { useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="skin">
      <Header />
      <main className="max-w-md mx-auto px-4 mt-20 text-center flex flex-col items-center gap-4">
        <p className="text-5xl">😵</p>
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted text-sm">
          That wasn&apos;t supposed to happen. Try again — if it keeps failing, come back in a few minutes.
        </p>
        <div className="flex gap-2">
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="btn-ghost">
            Go home
          </Link>
        </div>
        {error.digest && <p className="text-xs text-muted">Error ID: {error.digest}</p>}
      </main>
    </div>
  );
}
