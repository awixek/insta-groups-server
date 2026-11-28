import { createAdminClient } from "@/lib/supabase/server";
import { moderateGroupSubmission } from "@/lib/groq";
import { checkInviteLink } from "@/lib/linkcheck";
import { findBlockedTerm, findPersonalInfo, looksLikePromptInjection } from "@/lib/blocklist";
import { validateInviteLink, type Platform } from "@/lib/platforms";
import type { AiModerationResult, Profile } from "@/lib/types";

type Admin = ReturnType<typeof createAdminClient>;

export interface SubmissionInput {
  platform: Platform;
  name: string;
  description: string;
  inviteLink: string;
  categorySlug: string | null;
  /** when editing an existing group: ignore it in duplicate checks */
  excludeId?: string;
  /** the submitting user. Low-trust accounts never get auto-published: their groups wait for an admin. */
  owner: Pick<Profile, "id" | "is_admin" | "created_at">;
}

const TRUSTED_ACCOUNT_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const HARD_REJECT_FLAGS = ["adult_content", "profanity", "personal_info", "hate", "minor_safety", "violence"];

/** Admins, accounts older than 3 days, or owners who already have a live group are "trusted". */
export async function isTrustedOwner(admin: Admin, owner: SubmissionInput["owner"]): Promise<boolean> {
  if (owner.is_admin) return true;
  const age = Date.now() - new Date(owner.created_at ?? Date.now()).getTime();
  if (age >= TRUSTED_ACCOUNT_AGE_MS) return true;
  const { count } = await admin
    .from("groups")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", owner.id)
    .in("status", ["active", "almost_full", "possibly_full"]);
  return (count ?? 0) > 0;
}

export type SubmissionResult =
  | { ok: false; status: number; error: string }
  | {
      ok: true;
      fields: {
        invite_link: string;
        ai_description: string;
        category_id: string | null;
        status: "active" | "pending";
        ai_flags: string[];
        ai_reviewed_at: string;
        member_count: number | null;
      };
      moderation: AiModerationResult;
    };

/**
 * Everything that must be true before a group listing is stored — used by BOTH
 * the register endpoint and the owner "edit" endpoint, so the rules can't drift.
 */
export async function evaluateSubmission(admin: Admin, input: SubmissionInput): Promise<SubmissionResult> {
  const { platform, name, description, categorySlug } = input;

  if (name.length < 3 || name.length > 60) {
    return { ok: false, status: 400, error: "Group name must be 3–60 characters" };
  }
  if (description.length < 10 || description.length > 300) {
    return { ok: false, status: 400, error: "Description must be 10–300 characters" };
  }

  const blocked = findBlockedTerm(`${name} ${description}`);
  if (blocked) {
    console.warn("[moderation] blocklist hit:", blocked);
    return {
      ok: false,
      status: 400,
      error: "This listing contains words that aren't allowed here. This is a family-friendly site — please choose a clean name and description.",
    };
  }
  if (findPersonalInfo(name) || findPersonalInfo(description)) {
    return {
      ok: false,
      status: 400,
      error: "Please don't put usernames, @handles, phone numbers, emails or profile links in the name or description.",
    };
  }

  const link = validateInviteLink(platform, input.inviteLink);
  if (!link.ok) return { ok: false, status: 400, error: link.error };
  const inviteLink = link.url;

  let dupQuery = admin.from("groups").select("id").ilike("invite_link", escapeLike(inviteLink)).neq("status", "rejected").limit(1);
  if (input.excludeId) dupQuery = dupQuery.neq("id", input.excludeId);
  const { data: dupes } = await dupQuery;
  if (dupes && dupes.length > 0) {
    return { ok: false, status: 409, error: "This group link is already registered." };
  }

  // Telegram/Discord: refuse only links we can CONFIRM are dead ("suspect" is not enough — it can be a false alarm)
  const check = await checkInviteLink(platform, inviteLink);
  if (check.state === "dead") {
    return { ok: false, status: 400, error: "That invite link looks invalid or expired. Please create a fresh one." };
  }

  const { data: categories } = await admin.from("categories").select("*").eq("platform", platform);
  const { data: recent } = await admin
    .from("groups")
    .select("name")
    .eq("platform", platform)
    .order("created_at", { ascending: false })
    .limit(200);

  const moderation = await moderateGroupSubmission({
    platform,
    name,
    description,
    inviteLink,
    categories: categories ?? [],
    recentGroupNames: (recent ?? []).map((r) => r.name),
  });

  const userCategory = (categories ?? []).find((c) => c.slug === categorySlug);
  const aiCategory = (categories ?? []).find((c) => c.slug === moderation.category_slug);
  const matched = userCategory ?? aiCategory;

  // Hard refusals: anything adult / profane / hateful / personal-info / spam the AI wants to reject.
  const flags = moderation.flags ?? [];
  const hardFlag = flags.some((f) => HARD_REJECT_FLAGS.includes(f));
  if (moderation.is_adult || hardFlag || (moderation.decision === "reject" && moderation.is_spam)) {
    return {
      ok: false,
      status: 422,
      error: "This listing doesn't meet our community guidelines (family-friendly, no adult content or profanity, no personal info, no spam).",
    };
  }

  // Auto-publish ONLY when: AI approved, clean flags, not a duplicate, no injection attempt, trusted owner.
  const injected = looksLikePromptInjection(`${name} ${description}`);
  const trusted = await isTrustedOwner(admin, input.owner);
  const autoApprove =
    moderation.decision === "approve" && flags.length === 0 && !moderation.is_duplicate && !moderation.is_spam && !injected && trusted;

  const extraFlags: string[] = [];
  if (injected) extraFlags.push("prompt_injection");
  if (!trusted && moderation.decision === "approve") extraFlags.push("new_account_review");

  return {
    ok: true,
    moderation,
    fields: {
      invite_link: inviteLink,
      ai_description: moderation.ai_description,
      category_id: matched?.id ?? null,
      status: autoApprove ? "active" : "pending",
      ai_flags: Array.from(new Set([...flags, ...extraFlags])),
      ai_reviewed_at: new Date().toISOString(),
      member_count: check.memberCount ?? null,
    },
  };
}

/** Escape LIKE wildcards so an invite link is matched literally (case-insensitively with ilike). */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/** Tidy a group name: drop leading @ and "Owner -" / "Admin -" prefixes, collapse spaces. */
export function cleanName(raw: string): string {
  return raw
    .replace(/^[@\s]+/, "")
    .replace(/^(owner|admin|official)\s*[-–—:|]+\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Used when the owner leaves the description empty (always 10+ chars). */
export function autoDescription(platform: Platform, name: string): string {
  const label = { instagram: "Instagram", telegram: "Telegram", discord: "Discord" }[platform];
  return `${name} is a ${label} group chat. Join to chat and make new friends.`.slice(0, 300);
}
