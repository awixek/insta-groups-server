"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Group } from "@/lib/types";

const STATUS_DOT: Record<string, string> = {
  active: "🟢",
  almost_full: "🟡",
  possibly_full: "🔴",
};

type VoteValue = "up" | "down" | null;

function scoreFor(v: VoteValue) {
  return v === "up" ? 1 : v === "down" ? -1 : 0;
}

export default function GroupCard({
  group,
  initialVote = null,
}: {
  group: Group;
  initialVote?: VoteValue;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userVote, setUserVote] = useState<VoteValue>(initialVote);
  const [netScore, setNetScore] = useState(group.upvotes - group.downvotes);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the ⋮ menu on outside click.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  // Shared helper for the actions that require login (vote / save / report).
  // Joining a group never goes through this — the Join button is a plain
  // link, no account needed.
  async function callAuthed(url: string, body: object) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      router.push("/profile");
      return null;
    }
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      alert(error ?? "Something went wrong");
      return null;
    }
    return res.json();
  }

  // Reddit-style: clicking the arrow you've already pressed un-votes it.
  // Clicking the other arrow switches your vote.
  async function vote(clicked: "up" | "down") {
    const next: "up" | "down" | "remove" = userVote === clicked ? "remove" : clicked;
    setBusy(true);
    try {
      const data = await callAuthed("/api/groups/vote", { group_id: group.id, value: next });
      if (data) {
        const nextVote: VoteValue = next === "remove" ? null : (next as VoteValue);
        setNetScore((s) => s + (scoreFor(nextVote) - scoreFor(userVote)));
        setUserVote(nextVote);
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleSave() {
    setBusy(true);
    try {
      const data = await callAuthed("/api/groups/save", { group_id: group.id });
      if (data) setSaved(data.saved);
    } finally {
      setBusy(false);
    }
  }

  async function fileReport(type: "full" | "broken_invite") {
    setMenuOpen(false);
    setBusy(true);
    try {
      const data = await callAuthed("/api/groups/report", { group_id: group.id, type });
      if (data) {
        alert(
          type === "full"
            ? "Thanks — we'll review it and remove the group if it's full."
            : "Thanks for the report — we'll take a look."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card relative flex flex-col gap-2">
      {/* corner controls: quick save + ⋮ menu (request removal / report / save) */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <button
          disabled={busy}
          onClick={toggleSave}
          aria-label={saved ? "Unsave group" : "Save group"}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-border/50 text-sm"
        >
          {saved ? "🔖" : "🏷️"}
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More options"
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-border/50 text-sm"
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded-xl border border-border bg-surface shadow-lg z-10 overflow-hidden">
              <button
                disabled={busy}
                onClick={() => fileReport("full")}
                className="w-full text-left text-sm px-3 py-2 hover:bg-border/40"
              >
                🚫 Request removal
              </button>
              <button
                disabled={busy}
                onClick={() => fileReport("broken_invite")}
                className="w-full text-left text-sm px-3 py-2 hover:bg-border/40"
              >
                ⚠️ Report
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  setMenuOpen(false);
                  toggleSave();
                }}
                className="w-full text-left text-sm px-3 py-2 hover:bg-border/40"
              >
                {saved ? "🔖 Unsave" : "🔖 Save"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start justify-between pr-16">
        <h3 className="font-semibold text-base">{group.name}</h3>
        <span title={group.status}>{STATUS_DOT[group.status] ?? ""}</span>
      </div>

      <p className="text-sm text-muted line-clamp-2">
        {group.ai_description || group.description}
      </p>

      <div className="flex items-center justify-between mt-2">
        {/* Reddit-style vote widget: ▲ score ▼ instead of thumb emojis */}
        <div className="flex items-center gap-1.5 rounded-full border border-border px-1 py-1">
          <button
            disabled={busy}
            onClick={() => vote("up")}
            aria-label="Upvote"
            aria-pressed={userVote === "up"}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-border/50"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={userVote === "up" ? "#ff4500" : "none"}
              stroke={userVote === "up" ? "#ff4500" : "currentColor"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 4 L20 18 L4 18 Z" />
            </svg>
          </button>
          <span
            className="text-sm font-medium tabular-nums min-w-[1.5ch] text-center"
            style={{
              color: userVote === "up" ? "#ff4500" : userVote === "down" ? "#7193ff" : undefined,
            }}
          >
            {netScore}
          </span>
          <button
            disabled={busy}
            onClick={() => vote("down")}
            aria-label="Downvote"
            aria-pressed={userVote === "down"}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-border/50"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={userVote === "down" ? "#7193ff" : "none"}
              stroke={userVote === "down" ? "#7193ff" : "currentColor"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20 L4 6 L20 6 Z" />
            </svg>
          </button>
        </div>
        <a
          href={group.invite_link}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-sm py-1.5 px-3"
        >
          Join
        </a>
      </div>
    </div>
  );
}
