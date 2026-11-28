import type { Platform } from "@/lib/platforms";

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  const a = words[0]?.[0] ?? "?";
  const b = words.length > 1 ? words[1][0] : "";
  return (a + b).toUpperCase();
}

/**
 * Groups have no uploaded image, so every group gets a stable, coloured
 * initials avatar (same name -> same colour). Instagram groups get the
 * signature gradient ring.
 */
export default function GroupAvatar({ name, platform, size = 48 }: { name: string; platform: Platform; size?: number }) {
  const h = hash(name) % 360;
  const inner = (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white select-none"
      style={{
        width: platform === "instagram" ? size - 6 : size,
        height: platform === "instagram" ? size - 6 : size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${h} 62% 52%), hsl(${(h + 40) % 360} 68% 42%))`,
        boxShadow: platform === "instagram" ? "0 0 0 2px rgb(var(--surface))" : undefined,
      }}
    >
      {initials(name)}
    </div>
  );

  if (platform === "instagram") {
    return (
      <div
        className="rounded-full shrink-0 flex items-center justify-center"
        style={{ width: size, height: size, background: "var(--accent-grad)" }}
      >
        {inner}
      </div>
    );
  }
  return <div className="shrink-0">{inner}</div>;
}
