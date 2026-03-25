import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 格式化金额为 $X (฿Y)，null/NaN/Infinity → "—" */
export function formatRevenue(usd: number | null | undefined, rate: number = 34): string {
  if (usd == null || Number.isNaN(usd) || !isFinite(usd)) return '—';
  const t = usd * rate;
  return `$${usd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (฿${t.toLocaleString('en-US', { maximumFractionDigits: 0 })})`;
}

/** 格式化金额（仅美金简写），null/NaN/Infinity → "—" */
export function formatUSD(usd: number | null | undefined): string {
  if (usd == null || Number.isNaN(usd) || !isFinite(usd)) return '—';
  return `$${usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** 返回分离的格式化值，null/NaN/Infinity → "—" */
export function formatCurrency(
  usd: number | null | undefined,
  rate: number = 34
): { usd: string; thb: string } {
  if (usd == null || Number.isNaN(usd) || !isFinite(usd)) return { usd: '—', thb: '—' };
  const t = usd * rate;
  return {
    usd: `$${usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
    thb: `฿${t.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
  };
}

/** 格式化金额为简写形式（$1.2M / $3.4k / $567），NaN/Infinity → "—" */
export function formatUSDShort(value: number): string {
  if (Number.isNaN(value) || !isFinite(value)) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

/** 百分比格式化：0.7532 → "75.3%"，null/NaN/Infinity → "—"
 * @param decimals 小数位数，默认 1
 */
export function formatRate(v: number | null | undefined, decimals = 1): string {
  if (v == null || Number.isNaN(Number(v)) || !isFinite(Number(v))) return '—';
  return `${(Number(v) * 100).toFixed(decimals)}%`;
}

export const CHART_FONT_SIZE = { sm: 10, md: 11, lg: 12 } as const;
export const CHART_HEIGHT = { sm: 220, md: 260, lg: 320 } as const;
