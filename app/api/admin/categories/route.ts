import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/auth";
import { isPlatform } from "@/lib/platforms";
import { invalidateGroups } from "@/lib/cached";

const SLUG_RE = /^[a-z0-9-]{2,30}$/;

// POST /api/admin/categories
// { action: "create", platform, slug, name }
// { action: "rename", id, name }
// { action: "reorder", id, sort_order }
// { action: "delete", id }   (only if no groups use it)
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  const body = await req.json().catch(() => ({}));
  const { action } = body;

  if (action === "create") {
    const slug = String(body.slug ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    if (!isPlatform(body.platform)) return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "Slug: 2–30 chars, a-z 0-9 and - only" }, { status: 400 });
    }
    if (name.length < 2 || name.length > 40) {
      return NextResponse.json({ error: "Name must be 2–40 characters" }, { status: 400 });
    }
    const { count } = await admin
      .from("categories")
      .select("*", { count: "exact", head: true })
      .eq("platform", body.platform);
    const { data, error } = await admin
      .from("categories")
      .insert({ platform: body.platform, slug, name, sort_order: (count ?? 0) + 1 })
      .select()
      .single();
    if (error) {
      const msg = error.code === "23505" ? "That slug already exists on this platform" : "Could not create category";
      if (error.code !== "23505") console.error("[admin/categories]", error);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    await logAdminAction(admin, user.id, "category.create", "category", data.id, { platform: body.platform, slug, name });
    invalidateGroups();
    return NextResponse.json({ ok: true, category: data });
  }

  const id = body.id as string | undefined;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (action === "rename") {
    const name = String(body.name ?? "").trim();
    if (name.length < 2 || name.length > 40) {
      return NextResponse.json({ error: "Name must be 2–40 characters" }, { status: 400 });
    }
    await admin.from("categories").update({ name }).eq("id", id);
    await logAdminAction(admin, user.id, "category.rename", "category", id, { name });
    invalidateGroups();
    return NextResponse.json({ ok: true });
  }

  if (action === "reorder") {
    const sort = Number(body.sort_order);
    if (!Number.isFinite(sort)) return NextResponse.json({ error: "Invalid sort_order" }, { status: 400 });
    await admin.from("categories").update({ sort_order: Math.trunc(sort) }).eq("id", id);
    await logAdminAction(admin, user.id, "category.reorder", "category", id, { sort_order: sort });
    invalidateGroups();
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const { count } = await admin
      .from("groups")
      .select("*", { count: "exact", head: true })
      .eq("category_id", id);
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: `${count} group(s) still use this category. Move them first.` },
        { status: 400 }
      );
    }
    await admin.from("categories").delete().eq("id", id);
    await logAdminAction(admin, user.id, "category.delete", "category", id);
    invalidateGroups();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
