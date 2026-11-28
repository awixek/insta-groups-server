import type { Metadata } from "next";
import type { ReactNode } from "react";

// account / form / admin pages: never indexed (and the root layout no longer gives them a canonical to "/")
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
