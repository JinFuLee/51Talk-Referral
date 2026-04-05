'use client';

import { useLocale } from 'next-intl';
import { formatRevenue } from '@/lib/utils';
import type { BmComparison } from '@/lib/types/bm-calendar';

/* ── types ────────────────────────────────────────────── */

export interface OverviewSummaryCardsProps {
  kpi8item?: Record<
    string,
    {
      actual: number | null;
      target: number | null;
      current_daily_avg: number | null;
      remaining_daily_avg: number | null;
    } | null
  >;
  bmComparison?: BmComparison;
  timeProgress?: { time_progress: number; elapsed_workdays: number; remaining_workdays: number };
}

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

/* ── helpers ──────────────────────────────────────────── */

function barColor(pct: number): string {
  if (pct >= 100) return 'var(--color-success)';
  if (pct >= 60) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function statusClass(positive: boolean) {
  return positive ? 'text-success-token' : 'text-danger-token';
}

/* ── component ───────────────────────────────────────── */

export function OverviewSummaryCards({
  kpi8item,
  bmComparison,
  timeProgress,
}: OverviewSummaryCardsProps) {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] ?? I18N.zh;

  const rev = kpi8item?.revenue;
  const actual = rev?.actual ?? 0;
  const target = rev?.target ?? 0;
  const achPct = target > 0 ? (actual / target) * 100 : 0;

  const bmRev = bmComparison?.metrics?.revenue;
  const bmExpected = bmRev?.bm_mtd ?? 0;
  const bmGap = bmRev ? bmRev.bm_gap : 0;
  const bmPct = bmExpected > 0 ? (actual / bmExpected) * 100 : 0;

  const timePct = Math.round((timeProgress?.time_progress ?? 0) * 100);
  const dailyAvg = rev?.current_daily_avg ?? null;
  const dailyNeed = rev?.remaining_daily_avg ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ── 卡 1：当月业绩 ── */}
      <div
        className="rounded-xl border border-default-token p-5"
        style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-subtle)' }}
      >
        <p className="text-xs text-secondary-token uppercase tracking-wider mb-2">{t.revenue}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono tabular-nums text-primary-token">
            {formatRevenue(actual)}
          </span>
          <span className="text-sm text-muted-token">
            {t.of} {formatRevenue(target)}
          </span>
        </div>
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
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-token">{t.bmExpected}</span>
          <span className="text-lg font-semibold font-mono tabular-nums text-primary-token">
            {formatRevenue(bmExpected)}
          </span>
        </div>
        <div
          className={`mt-2 text-2xl font-bold font-mono tabular-nums ${statusClass(bmGap >= 0)}`}
        >
          {bmGap >= 0 ? '+' : ''}
          {formatRevenue(bmGap)}
        </div>
        <p className={`text-xs mt-0.5 ${statusClass(bmGap >= 0)}`}>
          {bmGap >= 0 ? t.bmAhead : t.bmBehind} · {bmPct.toFixed(0)}%
        </p>
      </div>

      {/* ── 卡 3：时间 + 日均 ── */}
      <div
        className="rounded-xl border border-default-token p-5"
        style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-subtle)' }}
      >
        <p className="text-xs text-secondary-token uppercase tracking-wider mb-2">{t.pace}</p>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold font-mono tabular-nums text-primary-token">
            {timePct}%
          </span>
          <span className="text-xs text-muted-token">{t.timeProgress}</span>
        </div>
        <div className="space-y-1.5">
          {dailyAvg != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-token">{t.currentDaily}</span>
              <span className="font-mono tabular-nums font-semibold text-primary-token">
                {formatRevenue(dailyAvg)}
              </span>
            </div>
          )}
          {dailyNeed != null && dailyNeed > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-token">{t.needDaily}</span>
              <span className="font-mono tabular-nums font-semibold text-warning-token">
                {formatRevenue(dailyNeed)}
                {t.perDay}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
