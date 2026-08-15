"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | { status: string; reason?: string }>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, invite_link: inviteLink, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setResult({ status: data.group.status, reason: data.moderation?.reason });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-4 mt-8 pb-24">
        <h1 className="text-xl font-semibold mb-1">Register your group</h1>
        <p className="text-sm text-muted mb-6">
          Takes about 3 minutes. AI reviews it automatically — most groups go live instantly.
        </p>

        {result ? (
          <div className="card">
            {result.status === "active" && (
              <p>✅ Your group is live! It's already showing up in the directory.</p>
            )}
            {result.status === "pending" && (
              <p>🕓 Submitted for manual review — our AI wasn't fully confident, a human will check it soon.</p>
            )}
            {result.status === "rejected" && (
              <p>❌ Not approved. {result.reason}</p>
            )}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-muted block mb-1">Group name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-surface border border-border px-3 py-2 outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1">Invite link</label>
              <input
                required
                type="url"
                value={inviteLink}
                onChange={(e) => setInviteLink(e.target.value)}
                placeholder="https://ig.me/join/..."
                className="w-full rounded-xl bg-surface border border-border px-3 py-2 outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1">Small description</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-surface border border-border px-3 py-2 outline-none focus:border-accent"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button disabled={submitting} className="btn-primary">
              {submitting ? "Submitting to AI review..." : "Submit"}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}
