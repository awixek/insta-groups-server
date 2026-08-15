"use client";

import { useState } from "react";
import type { Group } from "@/lib/types";

const STATUS_DOT: Record<string, string> = {
  active: "🟢",
  almost_full: "🟡",
  possibly_full: "🔴",
};

export default function GroupCard({ group }: { group: Group }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function vote(value: "up" | "down") {
    setBusy(true);
    try {
      const res = await fetch("/api/groups/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: group.id, value }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        alert(error ?? "Vote failed");
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleSave() {
    setBusy(true);
    try {
      const res = await fetch("/api/groups/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: group.id }),
      });
      if (res.ok) {
        const { saved: newState } = await res.json();
        setSaved(newState);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-base">{group.name}</h3>
        <span title={group.status}>{STATUS_DOT[group.status] ?? ""}</span>
      </div>

      <p className="text-sm text-muted line-clamp-2">
        {group.ai_description || group.description}
      </p>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <button disabled={busy} onClick={() => vote("up")} className="text-sm">
            👍 {group.upvotes}
          </button>
          <button disabled={busy} onClick={() => vote("down")} className="text-sm">
            👎 {group.downvotes}
          </button>
          <button disabled={busy} onClick={toggleSave} className="text-sm">
            {saved ? "🔖" : "🏷️"}
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
