"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { User } from "@supabase/supabase-js";

export default function ProfilePage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
  }, []);

  async function loginWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-4 mt-8 pb-24">
        <h1 className="text-lg font-semibold mb-6">Profile</h1>
        {loading ? (
          <p className="text-muted text-sm">Loading...</p>
        ) : user ? (
          <div className="card flex flex-col gap-3">
            <p className="font-medium">{user.user_metadata?.full_name ?? user.email}</p>
            <p className="text-sm text-muted">{user.email}</p>
            <button onClick={logout} className="btn-ghost w-fit">
              Log out
            </button>
          </div>
        ) : (
          <button onClick={loginWithGoogle} className="btn-primary">
            Continue with Google
          </button>
        )}
      </main>
      <Footer />
    </>
  );
}
