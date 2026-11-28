"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ShareButton from "@/components/ShareButton";
import type { Group } from "@/lib/types";
import { PLATFORMS } from "@/lib/platforms";
import PlatformIcon from "@/components/PlatformIcon";
import GroupAvatar from "@/components/GroupAvatar";
import { compactCount } from "@/lib/format";
import { rememberJoin, requireLogin, toast } from "@/lib/toast";
import { readMarks, writeMark, type Mark } from "@/lib/marks";
import { track } from "@/lib/analytics";

const STATUS_LABEL: Record<string, { text: string; dot: string }> = {
  active: { text: "Active", dot: "bg-emerald-500" },
  almost_full: { text: "Almost full", dot: "bg-amber-500" },
  possibly_full: { text: "May be full", dot: "bg-red-500" },
};

type VoteValue = "up" | "down" | null;

function scoreFor(v: VoteValue) {
  return v === "up" ? 1 : v === "down" ? -1 : 0;
}

export default function GroupCard({
  group,
  initialVote = null,
  initialSaved = false,
}: {
  group: Group;
  initialVote?: VoteValue;
  initialSaved?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);
  const [mark, setMarkState] = useState<Mark | null>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const [userVote, setUserVote] = useState<VoteValue>(initialVote);
  const [netScore, setNetScore] = useState(group.upvotes - group.downvotes);
  const menuRef = useRef<HTMLDivElement>(null);

  // Personal mark (joined / removed), kept in this browser and shared across cards.
  useEffect(() => {
    const sync = () => setMarkState(readMarks()[group.id] ?? null);
    sync();
    window.addEventListener("app:marks", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("app:marks", sync);
      window.removeEventListener("storage", sync);
    };
  }, [group.id]);

  function setMark(m: Mark | null) {
    writeMark(group.id, m);
    setMarkOpen(false);
    toast(m === "joined" ? "Marked as joined" : m === "removed" ? "Marked as removed" : "Mark cleared", "success");
  }

  // Close the ⋮ menu on outside click.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (markRef.current && !markRef.current.contains(e.target as Node)) setMarkOpen(false);
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  // Shared helper for actions that need login. Joining never goes through
  // this — Join is a plain link, no account needed. A 401 opens the login
  // modal (and brings the user back to this page afterwards).
  async function callAuthed(url: string, body: object, loginReason: string) {
    // 15s cap so a slow server never leaves the card stuck in "busy" (buttons disabled) forever
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (res.status === 401) {
        requireLogin(loginReason);
        return null;
      }
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        toast(error ?? "Something went wrong", "error");
        return null;
      }
      return await res.json();
    } catch {
      toast("Network is slow — please try again", "error");
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // Reddit-style: clicking the arrow you've already pressed un-votes it.
  async function vote(clicked: "up" | "down") {
    const next: "up" | "down" | "remove" = userVote === clicked ? "remove" : clicked;
    setBusy(true);
    try {
      const data = await callAuthed("/api/groups/vote", { group_id: group.id, value: next }, "Login to vote");
      if (data) {
        const nextVote: VoteValue = next === "remove" ? null : (next as VoteValue);
        if (typeof data.upvotes === "number" && typeof data.downvotes === "number") {
          setNetScore(data.upvotes - data.downvotes);
        } else {
          setNetScore((s) => s + (scoreFor(nextVote) - scoreFor(userVote)));
        }
        setUserVote(nextVote);
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleSave() {
    setBusy(true);
    try {
      const data = await callAuthed("/api/groups/save", { group_id: group.id }, "Login to save groups");
      if (data) {
        setSaved(data.saved);
        toast(data.saved ? "Saved to your list" : "Removed from saved", "success");
      }
    } finally {
      setBusy(false);
    }
  }

  async function fileReport(type: "full" | "broken_invite" | "spam") {
    setMenuOpen(false);
    setMarkOpen(false);
    setBusy(true);
    try {
      const data = await callAuthed("/api/groups/report", { group_id: group.id, type }, "Login to report a group");
      if (data) {
        toast(
          type === "full"
            ? "Thanks. We'll remove it if it's full."
            : "Thanks. We'll take a look.",
          "success"
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const status = group.status === "active" ? undefined : STATUS_LABEL[group.status];
  const isNew = !!group.created_at && Date.now() - new Date(group.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
  const iconBtn =
    "w-10 h-10 flex items-center justify-center rounded-full text-fg/70 hover:text-fg hover:bg-fg/10 active:scale-95 transition";

  return (
    // data-platform scopes the accent colour (Join button etc.) to this card's platform
    <article data-platform={group.platform} className={`card relative flex flex-col gap-3 hover:border-accent/50 transition-colors ${mark === "removed" ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        <GroupAvatar name={group.name} platform={group.platform} size={48} />
        <div className="min-w-0 flex-1 pr-8">
          <h3 className="font-semibold text-[15px] leading-snug truncate">
            <Link href={`/g/${group.id}`} className="hover:underline">
              {group.name}
            </Link>
          </h3>
          <div className="mt-0.5 flex items-center gap-x-3 gap-y-0.5 flex-wrap text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <PlatformIcon platform={group.platform} size={14} />
              {PLATFORMS[group.platform]?.label ?? group.platform}
            </span>
            {group.member_count ? <span>{compactCount(group.member_count)} members</span> : null}
            {isNew && <span className="rounded-full bg-accent/15 text-accent px-1.5 py-px font-medium">New</span>}
            {status && (
              <span className="inline-flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.text}
              </span>
            )}
          </div>
        </div>

        {/* ⋮ menu: save, share and report problems. Joined/removed marking lives in the action row. */}
        <div className="absolute top-2 right-2" ref={menuRef}>
          <button onClick={() => setMenuOpen((o) => !o)} aria-label="More options" aria-expanded={menuOpen} className={iconBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="12" cy="19" r="1.8" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-52 rounded-xl border border-border bg-surface shadow-xl z-10 overflow-hidden">
              <button
                disabled={busy}
                onClick={() => {
                  setMenuOpen(false);
                  toggleSave();
                }}
                className="w-full text-left text-sm px-4 py-3 hover:bg-fg/5"
              >
                {saved ? "Remove from saved" : "Save group"}
              </button>
              <ShareButton
                path={`/g/${group.id}`}
                title={group.name}
                className="!w-full !justify-start !text-left !rounded-none !border-0 !bg-transparent !px-4 !py-3 hover:!bg-fg/5"
              />
              <button disabled={busy} onClick={() => fileReport("full")} className="w-full text-left text-sm px-4 py-3 hover:bg-fg/5 border-t border-border">
                Report: group is full
              </button>
              <button disabled={busy} onClick={() => fileReport("broken_invite")} className="w-full text-left text-sm px-4 py-3 hover:bg-fg/5">
                Report: link is broken
              </button>
              <button disabled={busy} onClick={() => fileReport("spam")} className="w-full text-left text-sm px-4 py-3 hover:bg-fg/5 border-t border-border text-red-400">
                Report: inappropriate / spam
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-muted line-clamp-2 min-h-[2.5rem]">{group.ai_description || group.description}</p>

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
        <div className="flex items-center gap-0.5 -ml-2">
          <button disabled={busy} onClick={() => vote("up")} aria-label="Upvote" aria-pressed={userVote === "up"} className={iconBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={userVote === "up" ? "#ff4500" : "none"} stroke={userVote === "up" ? "#ff4500" : "currentColor"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4 L20 18 L4 18 Z" />
            </svg>
          </button>
          <span
            className="text-sm font-semibold tabular-nums min-w-[1.5ch] text-center"
            style={{ color: userVote === "up" ? "#ff4500" : userVote === "down" ? "#7193ff" : undefined }}
          >
            {netScore}
          </span>
          <button disabled={busy} onClick={() => vote("down")} aria-label="Downvote" aria-pressed={userVote === "down"} className={iconBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={userVote === "down" ? "#7193ff" : "none"} stroke={userVote === "down" ? "#7193ff" : "currentColor"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20 L4 6 L20 6 Z" />
            </svg>
          </button>
          <div className="relative" ref={markRef}>
            <button
              onClick={() => setMarkOpen((o) => !o)}
              aria-label="Mark as joined or removed"
              aria-expanded={markOpen}
              className={`h-10 px-2.5 inline-flex items-center gap-1.5 rounded-full text-sm hover:bg-fg/10 active:scale-95 transition ${
                mark === "joined" ? "text-emerald-500" : mark === "removed" ? "text-red-400" : "text-fg/70 hover:text-fg"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {mark === "joined" ? <path d="M5 12l5 5L20 7" /> : mark === "removed" ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M5 21V4M5 4h11l-2 4 2 4H5" />}
              </svg>
              {mark === "joined" ? "Joined" : mark === "removed" ? "Removed" : "Mark"}
            </button>
            {markOpen && (
              <div className="absolute left-0 bottom-full mb-1 w-56 rounded-xl border border-border bg-surface shadow-xl z-10 overflow-hidden">
                <button onClick={() => setMark("joined")} className="w-full text-left text-sm px-4 py-3 hover:bg-fg/5">
                  I joined this group
                </button>
                <button onClick={() => setMark("removed")} className="w-full text-left text-sm px-4 py-3 hover:bg-fg/5 border-t border-border">
                  I was removed from it
                </button>
                {mark && (
                  <button onClick={() => setMark(null)} className="w-full text-left text-sm px-4 py-3 hover:bg-fg/5 border-t border-border text-muted">
                    Clear mark
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <a
          href={`/go/${group.id}`}
          target="_blank"
          rel="noopener noreferrer nofollow"
          onClick={() => {
            rememberJoin(group.id, group.name);
            track("join_click", { group_id: group.id, platform: group.platform });
          }}
          className="btn-primary text-sm !py-2 !px-6"
        >
          Join
        </a>
      </div>
    </article>
  );
}
