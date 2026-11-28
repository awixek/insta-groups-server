import type { Group } from "./types";

/**
 * Default sort: highest net_score first.
 * Tie-break: earlier created_at ranks higher.
 * (net_score is a generated DB column, but we re-sort here too in case
 * groups arrive from a query that wasn't already ordered this way.)
 */
export function rankGroups(groups: Group[]): Group[] {
  return [...groups].sort((a, b) => {
    if (b.net_score !== a.net_score) return b.net_score - a.net_score;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

/** Fisher-Yates shuffle for the optional 🎲 discovery view. */
export function shuffleGroups(groups: Group[]): Group[] {
  const arr = [...groups];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const DAILY_UPVOTE_QUOTA = 2;
export const DAILY_DOWNVOTE_QUOTA = 2;
