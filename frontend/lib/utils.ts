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
