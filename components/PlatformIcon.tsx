import type { Platform } from "@/lib/platforms";

/**
 * Platform badge. Files live in /public/platforms/{instagram,telegram,discord}.svg —
 * to use the official brand logos, just replace those 3 files (same names, no code change).
 */
export default function PlatformIcon({
  platform,
  size = 20,
  className = "",
}: {
  platform: Platform;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/platforms/${platform}.svg`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`inline-block shrink-0 ${platform === "telegram" ? "rounded-full" : "rounded-[22%]"} ${className}`}
    />
  );
}
