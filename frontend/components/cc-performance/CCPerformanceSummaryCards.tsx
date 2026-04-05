'use client';

import { useLocale } from 'next-intl';
import { formatRevenue } from '@/lib/utils';
import type { CCPerformanceRecord } from '@/lib/types/cc-performance';
import type { ViewMode } from './CCPerformanceTable';

/* ── i18n ─────────────────────────────────────────────── */

const I18N = {
  zh: {
    revenue: '当月转介绍业绩',
    of: '/',
    achievement: '达成',
    bmPace: 'BM 节奏',
    bmExpected: '应达',
    bmAhead: '领先 BM',
    bmBehind: '落后 BM',
    pace: '时间 & 节奏',
    timeProgress: '时间进度',
    currentDaily: '当前日均',
    needDaily: '达标需',
    perDay: '/天',
  },
  'zh-TW': {
    revenue: '當月轉介紹業績',
    of: '/',
    achievement: '達成',
    bmPace: 'BM 節奏',
    bmExpected: '應達',
    bmAhead: '領先 BM',
    bmBehind: '落後 BM',
    pace: '時間 & 節奏',
    timeProgress: '時間進度',
    currentDaily: '當前日均',
    needDaily: '達標需',
    perDay: '/天',
  },
  en: {
    revenue: 'Referral Revenue',
    of: '/',
    achievement: 'Achievement',
    bmPace: 'BM Pace',
    bmExpected: 'Expected',
    bmAhead: 'Ahead of BM',
    bmBehind: 'Behind BM',
    pace: 'Time & Pace',
    timeProgress: 'Time',
    currentDaily: 'Daily avg',
    needDaily: 'Need',
    perDay: '/day',
  },
  th: {
    revenue: 'รายได้แนะนำ',
    of: '/',
    achievement: 'บรรลุ',
    bmPace: 'BM',
    bmExpected: 'คาดหวัง',
    bmAhead: 'นำหน้า BM',
    bmBehind: 'ล้าหลัง BM',
    pace: 'เวลา & ก้าว',
    timeProgress: 'เวลา',
    currentDaily: 'เฉลี่ยวัน',
    needDaily: 'ต้องการ',
    perDay: '/วัน',
  },
} as const;

/* ── types ────────────────────────────────────────────── */

interface CCPerformanceSummaryCardsProps {
  grandTotal: CCPerformanceRecord | null;
  timeProgressPct: number;
  exchangeRate: number;
  viewMode: ViewMode;
}

/* ── helpers ──────────────────────────────────────────── */

function statusColor(isPositive: boolean) {
  return isPositive ? 'text-success-token' : 'text-danger-token';
}

function barColor(pct: number): string {
  if (pct >= 100) return 'var(--color-success)';
  if (pct >= 60) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

/* ── component ───────────────────────────────────────── */

export function CCPerformanceSummaryCards({
  grandTotal,
  timeProgressPct,
  exchangeRate,
}: CCPerformanceSummaryCardsProps) {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] ?? I18N.zh;
  const gt = grandTotal;
  const er = exchangeRate;

  const actual = gt?.revenue?.actual ?? 0;
  const target = gt?.revenue?.target ?? 0;
  const achPct = target > 0 ? (actual / target) * 100 : 0;

  const bmExpected = gt?.revenue?.bm_expected ?? 0;
  const bmGap = actual - bmExpected;
  const bmPct = bmExpected > 0 ? (actual / bmExpected) * 100 : 0;

  const timePct = Math.round(timeProgressPct * 100);
  const dailyAvg = gt?.current_daily_avg ?? null;
  const dailyNeed = gt?.remaining_daily_avg ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ── 卡 1：当月业绩（主卡）── */}
      <div
        className="rounded-xl border border-default-token p-5"
        style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-subtle)' }}
      >
        <p className="text-xs text-secondary-token uppercase tracking-wider mb-2">{t.revenue}</p>

        {/* 大数字 + 目标 */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono tabular-nums text-primary-token">
            {formatRevenue(actual, er)}
          </span>
          <span className="text-sm text-muted-token">
            {t.of} {formatRevenue(target, er)}
          </span>
        </div>

        {/* 进度条 */}
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-token">{t.achievement}</span>
            <span className="font-semibold" style={{ color: barColor(achPct) }}>
              {achPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-n-100">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, achPct)}%`,
                backgroundColor: barColor(achPct),
              }}
            />
          </div>
        </div>
      </div>

      {/* ── 卡 2：BM 节奏 ── */}
      <div
        className="rounded-xl border border-default-token p-5"
        style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-subtle)' }}
      >
        <p className="text-xs text-secondary-token uppercase tracking-wider mb-2">{t.bmPace}</p>

        {/* 应达金额 */}
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-token">{t.bmExpected}</span>
          <span className="text-lg font-semibold font-mono tabular-nums text-primary-token">
            {formatRevenue(bmExpected, er)}
          </span>
        </div>

        {/* 差额（核心信息） */}
        <div
          className={`mt-2 text-2xl font-bold font-mono tabular-nums ${statusColor(bmGap >= 0)}`}
        >
          {bmGap >= 0 ? '+' : ''}
          {formatRevenue(bmGap, er)}
        </div>
        <p className={`text-xs mt-0.5 ${statusColor(bmGap >= 0)}`}>
          {bmGap >= 0 ? t.bmAhead : t.bmBehind} · {bmPct.toFixed(0)}%
        </p>
      </div>

      {/* ── 卡 3：时间 + 日均节奏 ── */}
      <div
        className="rounded-xl border border-default-token p-5"
        style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-subtle)' }}
      >
        <p className="text-xs text-secondary-token uppercase tracking-wider mb-2">{t.pace}</p>

        {/* 时间进度 */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold font-mono tabular-nums text-primary-token">
            {timePct}%
          </span>
          <span className="text-xs text-muted-token">{t.timeProgress}</span>
        </div>

        {/* 日均对比：当前 vs 达标需 */}
        <div className="space-y-1.5">
          {dailyAvg != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-token">{t.currentDaily}</span>
              <span className="font-mono tabular-nums font-semibold text-primary-token">
                {formatRevenue(dailyAvg, er)}
              </span>
            </div>
          )}
          {dailyNeed != null && dailyNeed > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-token">{t.needDaily}</span>
              <span className="font-mono tabular-nums font-semibold text-warning-token">
                {formatRevenue(dailyNeed, er)}
                {t.perDay}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
