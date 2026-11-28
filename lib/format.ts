/** 12400 -> "12.4K", 1500000 -> "1.5M" */
export function compactCount(n: number): string {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
