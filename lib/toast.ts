// Tiny event-based toast + login-prompt bus (no context/provider needed).
export type ToastKind = "info" | "success" | "error";

export function toast(message: string, kind: ToastKind = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app:toast", { detail: { message, kind } }));
}

/** Opens the login modal (used when an API call returns 401). */
export function requireLogin(reason = "Login to continue") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app:login", { detail: { reason } }));
}

const PENDING_KEY = "igPendingJoin";

export interface PendingJoin {
  id: string;
  name: string;
  at: number;
}

export function rememberJoin(id: string, name: string) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ id, name, at: Date.now() } satisfies PendingJoin));
  } catch {}
}

export function readPendingJoin(): PendingJoin | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingJoin) : null;
  } catch {
    return null;
  }
}

export function clearPendingJoin() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {}
}
