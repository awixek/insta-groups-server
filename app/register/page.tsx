"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PlatformIcon from "@/components/PlatformIcon";
import ShareButton from "@/components/ShareButton";
import { PLATFORMS, detectPlatform, isPlatform, type Platform } from "@/lib/platforms";
import { requireLogin } from "@/lib/toast";
import type { Category } from "@/lib/types";

const DRAFT_KEY = "registerDraft";

export default function RegisterPage() {
  const [inviteLink, setInviteLink] = useState("");
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchedNote, setFetchedNote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [result, setResult] = useState<null | { status: string; reason?: string }>(null);
  const [error, setError] = useState<string | null>(null);
  const nameTouched = useRef(false);

  // Restore what the person typed before the login redirect.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setInviteLink(d.inviteLink ?? "");
        setName(d.name ?? "");
        setDescription(d.description ?? "");
        setCategorySlug(d.categorySlug ?? "");
        nameTouched.current = !!d.name;
        const p = detectPlatform(d.inviteLink ?? "");
        if (p) setPlatform(p);
        sessionStorage.removeItem(DRAFT_KEY);
      }
    } catch {}
    const p = new URLSearchParams(window.location.search).get("platform");
    if (isPlatform(p)) setPlatform((cur) => cur ?? p);
  }, []);

  // Categories depend on the detected platform.
  useEffect(() => {
    if (!platform) return;
    let cancelled = false;
    fetch(`/api/categories?platform=${platform}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setCategories(d.categories ?? []))
      .catch(() => !cancelled && setCategories([]));
    return () => {
      cancelled = true;
    };
  }, [platform]);

  // Pasted link -> detect platform, then try to read name/description from it.
  useEffect(() => {
    const p = detectPlatform(inviteLink);
    if (!p) {
      setFetchedNote(null);
      return;
    }
    setPlatform(p);
    setCategorySlug("");
    let cancelled = false;
    const t = setTimeout(async () => {
      setFetching(true);
      try {
        const res = await fetch("/api/groups/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: inviteLink }),
        });
        const d = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setFetchedNote(d.error ?? null);
          return;
        }
        if (d.name && !nameTouched.current) setName(d.name);
        if (d.description) setDescription((cur) => cur || d.description);
        setFetchedNote(
          d.name
            ? "Name filled from the link. You can edit it."
            : p === "instagram"
            ? "Instagram links don't share a name, so type it below."
            : "Couldn't read the name from this link. Type it below."
        );
      } catch {
        if (!cancelled) setFetchedNote(null);
      } finally {
        if (!cancelled) setFetching(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [inviteLink]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!platform) {
      setError("Paste an Instagram, Telegram or Discord invite link first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setStep(0);
    // the server does link check + AI review in one request; show progress text meanwhile
    const timer = setInterval(() => setStep((n) => Math.min(n + 1, 2)), 2500);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          name,
          invite_link: inviteLink.trim(),
          description,
          category_slug: categorySlug || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        // Login is asked only now, and the form is restored after Google login.
        try {
          sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ inviteLink, name, description, categorySlug }));
        } catch {}
        requireLogin("Login to add your group");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setGroupId(data.group.id);
      setResult({ status: data.group.status, reason: data.moderation?.reason });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      clearInterval(timer);
      setSubmitting(false);
    }
  }

  const shownPlatform = platform ?? "instagram";

  return (
    <div className="skin" data-skin={shownPlatform} data-platform={shownPlatform}>
      <Header />
      <main className="max-w-lg mx-auto px-4 mt-8 pb-24">
        <h1 className="text-xl font-semibold mb-1">Add your group</h1>
        <p className="text-sm text-muted mb-6">Paste the invite link. We check it and most groups go live instantly.</p>

        {result ? (
          <div className="card flex flex-col gap-3">
            {result.status === "active" && <p>Your group is live. It's already in the directory.</p>}
            {result.status === "pending" && <p>Sent for manual review. A person will check it soon.</p>}
            {result.status === "rejected" && <p>Not approved. {result.reason}</p>}
            <div className="flex gap-2 flex-wrap">
              {groupId && result.status === "active" && (
                <ShareButton path={`/g/${groupId}`} title={name} className="!bg-accent !border-accent !text-white" />
              )}
              <Link href={`/${shownPlatform}`} className="btn-ghost text-sm">
                View {PLATFORMS[shownPlatform].label} groups
              </Link>
              <Link href="/my-groups" className="btn-ghost text-sm">
                My groups
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="invite" className="text-sm text-muted block mb-1">
                Invite link
              </label>
              <input
                id="invite"
                required
                type="url"
                inputMode="url"
                autoComplete="off"
                value={inviteLink}
                onChange={(e) => setInviteLink(e.target.value)}
                placeholder="https://ig.me/j/…  t.me/…  discord.gg/…"
                className="input"
              />
              {platform && (
                <p className="text-xs text-muted mt-1.5 flex items-center gap-1.5">
                  <PlatformIcon platform={platform} size={14} />
                  {PLATFORMS[platform].label} link{fetching ? ". Reading details…" : fetchedNote ? `. ${fetchedNote}` : ""}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="gname" className="text-sm text-muted block mb-1">
                Group name
              </label>
              <input
                id="gname"
                required
                minLength={3}
                maxLength={60}
                value={name}
                onChange={(e) => {
                  nameTouched.current = true;
                  setName(e.target.value);
                }}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="cat" className="text-sm text-muted block mb-1">
                Category
              </label>
              <select id="cat" value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} className="input">
                <option value="">Let AI choose</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <details className="text-sm" open={description.length > 0}>
              <summary className="cursor-pointer text-muted">Add a description (optional)</summary>
              <textarea
                maxLength={300}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                aria-label="Description"
                className="input mt-2"
              />
              <p className="text-xs text-muted mt-1 text-right">{description.length}/300</p>
            </details>

            {error && <p className="text-sm text-red-400">{error}</p>}
            <button disabled={submitting} className="btn-primary">
              {submitting ? ["Checking your link…", "AI is reviewing…", "Almost done…"][step] : "Add group"}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
