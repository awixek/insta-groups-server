import type { Platform } from "./platforms";

export type { Platform };

export type GroupStatus =
  | "active"
  | "almost_full"
  | "possibly_full"
  | "pending"
  | "rejected";

export type GroupPlatform = Platform;

export const PUBLIC_STATUSES: GroupStatus[] = ["active", "almost_full", "possibly_full"];

/**
 * Columns the PUBLIC site may read from `groups`. Never use select("*") on groups in
 * browser-facing code: it would expose reviewed_by (admin UUID), ai_flags, rejection notes etc.
 */
export const PUBLIC_GROUP_COLUMNS =
  "id, platform, name, invite_link, description, ai_description, category_id, status, upvotes, downvotes, net_score, report_full_count, report_broken_count, member_count, rejection_reason, created_at";

export interface Category {
  id: string;
  platform: Platform;
  slug: string;
  name: string;
  name_hi: string | null;
  sort_order: number;
}

export interface Group {
  id: string;
  /** NOT selected by public queries (privacy). Only present on server-side `select("*")` reads. */
  owner_id?: string | null;
  /** total Join clicks via /go/[id]. Server-only (not granted to the browser roles). */
  click_count?: number;
  platform: GroupPlatform;
  name: string;
  invite_link: string;
  description: string;
  ai_description: string | null;
  category_id: string | null;
  status: GroupStatus;
  ai_flags?: string[];
  upvotes: number;
  downvotes: number;
  net_score: number;
  report_full_count: number;
  report_broken_count: number;
  rejection_reason?: string | null;
  member_count?: number | null;
  last_checked_at?: string | null;
  check_fail_count?: number;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_banned: boolean;
  ban_reason?: string | null;
  upvotes_used_today: number;
  downvotes_used_today: number;
  votes_reset_at?: string | null;
  created_at?: string;
}

export interface AiModerationResult {
  decision: "approve" | "reject" | "manual_review";
  category_slug: string | null;
  is_adult: boolean;
  is_spam: boolean;
  is_duplicate: boolean;
  ai_description: string;
  flags: string[];
  reason: string;
}
