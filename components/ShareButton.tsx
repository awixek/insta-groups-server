"use client";

import { useState } from "react";

/** Native share sheet on phones, WhatsApp / copy-link fallback elsewhere. */
export default function ShareButton({
  path,
  title,
  className = "",
  iconOnly = false,
}: {
  path: string;
  title: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
    const text = `${title} — join on Random group chats`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch {
      return; // user cancelled
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener");
    }
  }

  if (iconOnly) {
    return (
      <button onClick={share} aria-label="Share group" title={copied ? "Link copied" : "Share"} className={className}>
        {copied ? (
          "✓"
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
            <path d="M16 6l-4-4-4 4" />
            <path d="M12 2v14" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button onClick={share} aria-label="Share group" className={`btn-ghost text-sm py-1.5 px-3 ${className}`}>
      {copied ? "Link copied ✓" : "Share"}
    </button>
  );
}
