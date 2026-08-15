export type GroupStatus =
  | "active"
  | "almost_full"
  | "possibly_full"
  | "pending"
  | "rejected";

export type GroupPlatform = "instagram" | "telegram" | "discord";

export interface Category {
  id: string;
  slug: string;
  name: string;
  name_hi: string | null;
  sort_order: number;
}

export interface Group {
  id: string;
  owner_id: string | null;
  platform: GroupPlatform;
  name: string;
  invite_link: string;
  description: string;
  ai_description: string | null;
  category_id: string | null;
  is_adult: boolean;
  status: GroupStatus;
  ai_flags: string[];
  upvotes: number;
  downvotes: number;
  net_score: number;
  report_full_count: number;
  report_broken_count: number;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_banned: boolean;
  upvotes_used_today: number;
  downvotes_used_today: number;
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
