export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id="lm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#lm)" />
      <path d="M13 21a7 7 0 0 1 7-7h18a7 7 0 0 1 7 7v8a7 7 0 0 1-7 7H25l-8 7.5V36.2A7 7 0 0 1 13 29z" fill="#fff" />
      <path d="M29 37.5a6 6 0 0 1 6-6h11a6 6 0 0 1 6 6v3.5a6 6 0 0 1-6 6h-.5v6.5L38.5 47H35a6 6 0 0 1-6-6z" fill="#fff" fillOpacity=".62" />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className="font-bold tracking-tight text-[15px] sm:text-[17px] leading-none whitespace-nowrap">
        Random <span className="text-accent">group chats</span>
      </span>
    </span>
  );
}
