/** Fire a Google Analytics (GA4) event. Safe no-op when GA is not configured or blocked by an ad-blocker. */
export function track(name: string, params: Record<string, string | number | boolean> = {}) {
  try {
    const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
    if (typeof g === "function") g("event", name, params);
  } catch {}
}
