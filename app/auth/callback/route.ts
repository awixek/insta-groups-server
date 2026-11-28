import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  // only same-site relative paths (blocks open redirects like //evil.com)
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (code) {
    const supabase = createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Ensure a profiles row exists. Uses the service role (browser clients can
    // no longer insert into profiles) and only sets cosmetic fields, so it can
    // never touch is_admin / is_banned.
    if (data?.user) {
      const admin = createAdminClient();
      await admin.from("profiles").upsert(
        {
          id: data.user.id,
          email: data.user.email,
          display_name: data.user.user_metadata?.full_name ?? null,
          avatar_url: data.user.user_metadata?.avatar_url ?? null,
        },
        { onConflict: "id" }
      );
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
