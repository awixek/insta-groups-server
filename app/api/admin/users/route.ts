import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/auth";
import { adminDbError } from "@/lib/http";

// POST /api/admin/users { action: "ban" | "unban" | "make_admin" | "remove_admin", user_id, reason? }
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  const { action, user_id, reason } = await req.json().catch(() => ({}));
  if (!action || !user_id) return NextResponse.json({ error: "action and user_id required" }, { status: 400 });

  // Can't lock yourself out
  if (user_id === user.id && ["ban", "remove_admin"].includes(action)) {
    return NextResponse.json({ error: "You can't do that to your own account" }, { status: 400 });
  }

  const { data: target } = await admin.from("profiles").select("id, email, is_admin").eq("id", user_id).maybeSingle();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (action === "ban" && target.is_admin) {
    return NextResponse.json({ error: "Remove admin rights before banning an admin" }, { status: 400 });
  }

  switch (action) {
    case "ban":
      {
        const { error: dbErr } = await admin
        .from("profiles")
        .update({ is_banned: true, ban_reason: typeof reason === "string" ? reason.slice(0, 200) : null })
        .eq("id", user_id);
        if (dbErr) return adminDbError("admin users", dbErr);
      }
      break;
    case "unban":
      {
        const { error: dbErr } = await admin.from("profiles").update({ is_banned: false, ban_reason: null }).eq("id", user_id);
        if (dbErr) return adminDbError("admin users", dbErr);
      }
      break;
    case "make_admin":
      {
        const { error: dbErr } = await admin.from("profiles").update({ is_admin: true }).eq("id", user_id);
        if (dbErr) return adminDbError("admin users", dbErr);
      }
      break;
    case "remove_admin":
      {
        const { error: dbErr } = await admin.from("profiles").update({ is_admin: false }).eq("id", user_id);
        if (dbErr) return adminDbError("admin users", dbErr);
      }
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await logAdminAction(admin, user.id, `user.${action}`, "user", user_id, { email: target.email, reason });
  return NextResponse.json({ ok: true });
}
