"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GroupCard from "@/components/GroupCard";
import type { Group } from "@/lib/types";

type Vote = "up" | "down";

interface Props {
  initialGroups: Group[];
  initialVotes: Record<string, Vote>;
  initialSaved: string[];
  startPage: number;
  totalPages: number;
  query: { platform?: string; category?: string; search?: string; sort?: string };
}

const GRID = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4";

/** Shows all groups in one endless scroll: the next 20 load when you near the bottom. */
export default function InfiniteGroups({ initialGroups, initialVotes, initialSaved, startPage, totalPages, query }: Props) {
  const [groups, setGroups] = useState(initialGroups);
  const [votes, setVotes] = useState(initialVotes);
  const [saved, setSaved] = useState<string[]>(initialSaved);
  const [page, setPage] = useState(startPage);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const done = page >= totalPages;
  const { platform, category, search, sort } = query;

  const loadMore = useCallback(async () => {
    if (busy.current || done) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const params = new URLSearchParams();
      if (platform) params.set("platform", platform);
      if (category) params.set("category", category);
      if (search) params.set("search", search);
      if (sort && sort !== "top") params.set("sort", sort);
      params.set("page", String(page + 1));
      const res = await fetch(`/api/groups?${params.toString()}`);
      if (!res.ok) throw new Error("load failed");
      const d = await res.json();
      setGroups((prev) => {
        const ids = new Set(prev.map((g) => g.id));
        const links = new Set(prev.map((g) => g.invite_link.toLowerCase()));
        const fresh = ((d.groups ?? []) as Group[]).filter((g) => {
          const l = g.invite_link.toLowerCase();
          if (ids.has(g.id) || links.has(l)) return false;
          ids.add(g.id);
          links.add(l);
          return true;
        });
        return [...prev, ...fresh];
      });
      setVotes((v) => ({ ...v, ...(d.votes ?? {}) }));
      setSaved((s) => s.concat(d.saved ?? []));
      setPage(typeof d.page === "number" ? d.page : page + 1);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [page, done, platform, category, search, sort]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || done || failed || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), { rootMargin: "700px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, done, failed]);

  return (
    <>
      <div className={GRID}>
        {groups.map((g) => (
          <GroupCard key={g.id} group={g} initialVote={votes[g.id] ?? null} initialSaved={saved.includes(g.id)} />
        ))}
      </div>
      <div ref={sentinel} className="h-px" />
      <div className="py-6 text-center text-sm text-muted min-h-[3rem]">
        {loading && "Loading more groups…"}
        {failed && (
          <button onClick={loadMore} className="btn-ghost text-sm">
            Couldn't load. Try again
          </button>
        )}
        {done && !loading && groups.length > 50 && "You've seen all the groups."}
      </div>
    </>
  );
}
