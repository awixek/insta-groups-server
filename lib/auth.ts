import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

type Admin = ReturnType<typeof createAdminClient>;

type Ok = { ok: true; user: User; profile: Profile; admin: Admin };
type Fail = { ok: false; response: NextResponse };

/**
 * Resolves the logged-in user + their profile (service-role read, so RLS can't
 * hide it). Creates the profile row if it's missing. Rejects banned users.
 */
export async function requireUser(opts: { allowBanned?: boolean } = {}): Promise<Ok | Fail> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Login required" }, { status: 401 }) };
  }

  const admin = createAdminClient();
  let { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (!profile) {
    const { data: created } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email,
          display_name: user.user_metadata?.full_name ?? null,
          avatar_url: user.user_metadata?.avatar_url ?? null,
        },
        { onConflict: "id" }
      )
      .select("*")
      .single();
    profile = created;
  }
  if (!profile) {
    return { ok: false, response: NextResponse.json({ error: "Profile not found" }, { status: 404 }) };
  }
  if (profile.is_banned && !opts.allowBanned) {
    return { ok: false, response: NextResponse.json({ error: "Account banned" }, { status: 403 }) };
  }
  return { ok: true, user, profile: profile as Profile, admin };
}

export async function requireAdmin(): Promise<Ok | Fail> {
  const res = await requireUser();
  if (!res.ok) return res;
  if (!res.profile.is_admin) {
    return { ok: false, response: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  return res;
}

/** Audit trail for every admin action. Never throws. */
export async function logAdminAction(
  admin: Admin,
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> = {}
) {
  try {
    await admin
      .from("admin_actions")
      .insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId, details });
  } catch (e) {
    console.error("admin log failed", e);
  }
}

/** Today's date in India (quota resets at IST midnight, not UTC). */
export function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}
