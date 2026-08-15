import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/admin", req.url));

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return NextResponse.redirect(new URL("/admin", req.url));

  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    await supabase.from("groups").update({ status: "active" }).eq("id", id);
  }

  return NextResponse.redirect(new URL("/admin", req.url));
}
