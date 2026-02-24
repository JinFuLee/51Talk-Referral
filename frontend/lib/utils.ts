import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 格式化金额为 $X (฿Y) */
export function formatRevenue(usd: number | null | undefined, rate: number = 34): string {
  const u = usd ?? 0;
  const t = u * rate;
  return `$${u.toLocaleString("en-US", { maximumFractionDigits: 0 })} (฿${t.toLocaleString("en-US", { maximumFractionDigits: 0 })})`;
}

/** 格式化金额（仅美金简写） */
export function formatUSD(usd: number | null | undefined): string {
  const u = usd ?? 0;
  return `$${u.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/** 返回分离的格式化值 */
export function formatCurrency(usd: number | null | undefined, rate: number = 34): { usd: string; thb: string } {
  const u = usd ?? 0;
  const t = u * rate;
  return {
    usd: `$${u.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
    thb: `฿${t.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
  };
}

/** 格式化金额为简写形式（$1.2M / $3.4k / $567） */
export function formatUSDShort(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

/** 百分比格式化：0.7532 → "75.3%"，null/NaN → "0%" */
export function formatRate(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return "0%";
  return `${(Number(v) * 100).toFixed(1)}%`;
}

export const CHART_FONT_SIZE = { sm: 10, md: 11, lg: 12 } as const
export const CHART_HEIGHT = { sm: 220, md: 260, lg: 320 } as const
