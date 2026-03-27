import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ── 围场段显示格式化 ──────────────────────────────────────── */

const ENC_DISPLAY: Record<string, string> = {
  // 围场列值（旧 7 段）
  '0~30': 'M0（0~30）',
  '31~60': 'M1（31~60）',
  '61~90': 'M2（61~90）',
  '91~120': 'M3（91~120）',
  '121~150': 'M4（121~150）',
  '151~180': 'M5（151~180）',
  'M6+': 'M6+（181+）',
  '181+': 'M6+（181+）',
  // 生命周期列值（新 14 段）
  '0M': 'M0（0~30）',
  '1M': 'M1（31~60）',
  '2M': 'M2（61~90）',
  '3M': 'M3（91~120）',
  '4M': 'M4（121~150）',
  '5M': 'M5（151~180）',
  '6M': 'M6（181~210）',
  '7M': 'M7（211~240）',
  '8M': 'M8（241~270）',
  '9M': 'M9（271~300）',
  '10M': 'M10（301~330）',
  '11M': 'M11（331~360）',
  '12M': 'M12（361~390）',
  '12M+': 'M12+（391+）',
  // M 标签（Settings 页面用）
  M0: 'M0（0~30）',
  M1: 'M1（31~60）',
  M2: 'M2（61~90）',
  M3: 'M3（91~120）',
  M4: 'M4（121~150）',
  M5: 'M5（151~180）',
  M6: 'M6（181~210）',
  M7: 'M7（211~240）',
  M8: 'M8（241~270）',
  M9: 'M9（271~300）',
  M10: 'M10（301~330）',
  M11: 'M11（331~360）',
  M12: 'M12（361~390）',
};

/** 围场原始值 → 统一显示格式 M0（0~30），未匹配则原样返回 */
export function fmtEnc(raw: string | null | undefined): string {
  if (!raw) return '—';
  return ENC_DISPLAY[raw.trim()] ?? raw;
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

/** 智能格式化：自动判断数量型 vs 比率型
 * @param v 值（数量型为整数，比率型为 0-1 小数）
 * @param isRate 是否为比率型（0-1 小数），默认 false
 * @param decimals 比率型小数位数，默认 1
 */
export function formatValue(v: number | null | undefined, isRate = false, decimals = 1): string {
  if (v == null || Number.isNaN(Number(v)) || !isFinite(Number(v))) return '—';
  if (isRate) return formatRate(v, decimals);
  return Number(v).toLocaleString();
}

export const CHART_FONT_SIZE = { sm: 10, md: 11, lg: 12 } as const;
export const CHART_HEIGHT = { sm: 220, md: 260, lg: 320 } as const;

/**
 * 率指标条件着色 — 深色高对比（白底可读）
 * thresholds: [低阈值, 高阈值]，例 [0.3, 0.5]
 * ≥高阈值=深绿, ≥低阈值=深琥珀, <低阈值=深红
 */
export function metricColor(
  value: number | null | undefined,
  thresholds: [number, number]
): string {
  if (value === null || value === undefined) return 'text-[var(--text-muted)]';
  if (value >= thresholds[1]) return 'text-emerald-800 font-semibold';
  if (value >= thresholds[0]) return 'text-amber-800';
  return 'text-red-700';
}
