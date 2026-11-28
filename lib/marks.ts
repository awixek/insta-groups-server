// Personal marks: each person remembers which groups they joined or were removed from.
// Stored in this browser only (no login needed, nothing sent to the server).
export type Mark = "joined" | "removed";

const KEY = "igGroupMarks";

export function readMarks(): Record<string, Mark> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, Mark>) : {};
  } catch {
    return {};
  }
}

/** Pass null to clear the mark. Tells every card on the page to refresh. */
export function writeMark(groupId: string, mark: Mark | null) {
  try {
    const all = readMarks();
    if (mark) all[groupId] = mark;
    else delete all[groupId];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
  if (typeof window !== "undefined") window.dispatchEvent(new Event("app:marks"));
}
