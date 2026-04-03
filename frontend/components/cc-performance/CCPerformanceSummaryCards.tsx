'use client';

import { useLocale } from 'next-intl';
import { formatRevenue, formatRate } from '@/lib/utils';
import type { CCPerformanceRecord } from '@/lib/types/cc-performance';
import type { ViewMode } from './CCPerformanceTable';

const I18N = {
  zh: {
    achievementRate: '达成率',
    teamRevenue: '团队总业绩',
    teamRevenueTooltipBm: '本月 CC 前端合计 vs BM 节奏期望',
    teamRevenueTooltipTarget: '本月 CC 前端 + 新单 + 转介绍渠道 + 市场渠道 合计',
    bmAchievement: 'BM 达成率',
    revenueAchievement: '业绩达成率',
    bmTooltip: '实际业绩 / BM 节奏期望',
    targetTooltip: '实际业绩 / 月度目标',
    bmPace: 'BM 节奏线',
    target100: '目标 100%',
    timeProgress: '时间进度',
    timeProgressTooltip: '本月已过时间进度（加权工作日，周三权重 0）',
    monthlyWeighted: '月度加权进度',
    ahead: (pp: string) => `领先进度 +${pp}pp`,
    behind: (pp: string) => `落后进度 ${pp}pp`,
    bmRef: (v: string) => `BM ${v}`,
    targetRef: (v: string) => `目标 ${v}`,
  },
  'zh-TW': {
    achievementRate: '達成率',
    teamRevenue: '團隊總業績',
    teamRevenueTooltipBm: '本月 CC 前端合計 vs BM 節奏期望',
    teamRevenueTooltipTarget: '本月 CC 前端 + 新單 + 轉介紹渠道 + 市場渠道 合計',
    bmAchievement: 'BM 達成率',
    revenueAchievement: '業績達成率',
    bmTooltip: '實際業績 / BM 節奏期望',
    targetTooltip: '實際業績 / 月度目標',
    bmPace: 'BM 節奏線',
    target100: '目標 100%',
    timeProgress: '時間進度',
    timeProgressTooltip: '本月已過時間進度（加權工作日，週三權重 0）',
    monthlyWeighted: '月度加權進度',
    ahead: (pp: string) => `領先進度 +${pp}pp`,
    behind: (pp: string) => `落後進度 ${pp}pp`,
    bmRef: (v: string) => `BM ${v}`,
    targetRef: (v: string) => `目標 ${v}`,
  },
  en: {
    achievementRate: 'Achievement',
    teamRevenue: 'Team Performance',
    teamRevenueTooltipBm: 'CC frontend total this month vs BM pace expectation',
    teamRevenueTooltipTarget: 'CC frontend + new orders + referral channel + market channel total',
    bmAchievement: 'BM Achievement',
    revenueAchievement: 'Performance Achievement',
    bmTooltip: 'Actual / BM pace expectation',
    targetTooltip: 'Actual / Monthly target',
    bmPace: 'BM Pace',
    target100: 'Target 100%',
    timeProgress: 'Time Progress',
    timeProgressTooltip: 'Elapsed weighted workdays this month (Wed weight 0)',
    monthlyWeighted: 'Monthly Weighted Progress',
    ahead: (pp: string) => `Ahead +${pp}pp`,
    behind: (pp: string) => `Behind ${pp}pp`,
    bmRef: (v: string) => `BM ${v}`,
    targetRef: (v: string) => `Target ${v}`,
  },
  th: {
    achievementRate: 'อัตราบรรลุ',
    teamRevenue: 'ผลงานรวมทีม',
    teamRevenueTooltipBm: 'ยอดรวม CC ด้านหน้าเดือนนี้ vs BM',
    teamRevenueTooltipTarget: 'CC ด้านหน้า + คำสั่งซื้อใหม่ + แนะนำ + ตลาด',
    bmAchievement: 'บรรลุ BM',
    revenueAchievement: 'บรรลุเป้าหมาย',
    bmTooltip: 'จริง / BM',
    targetTooltip: 'จริง / เป้าหมายรายเดือน',
    bmPace: 'BM',
    target100: 'เป้าหมาย 100%',
    timeProgress: 'ความคืบหน้าเวลา',
    timeProgressTooltip: 'วันทำงานถ่วงน้ำหนักที่ผ่านไปแล้วเดือนนี้',
    monthlyWeighted: 'ความคืบหน้าถ่วงน้ำหนัก',
    ahead: (pp: string) => `นำหน้า +${pp}pp`,
    behind: (pp: string) => `ล้าหลัง ${pp}pp`,
    bmRef: (v: string) => `BM ${v}`,
    targetRef: (v: string) => `เป้า ${v}`,
  },
} as const;

interface CCPerformanceSummaryCardsProps {
  grandTotal: CCPerformanceRecord | null;
  timeProgressPct: number;
  exchangeRate: number;
  viewMode: ViewMode;
}

function achievementColor(pct: number | null): string {
  if (pct == null) return 'text-[var(--text-muted)]';
  if (pct >= 1) return 'text-emerald-700';
  if (pct >= 0.8) return 'text-amber-700';
  return 'text-red-700';
}

function achievementBarColor(pct: number | null): string {
  if (pct == null) return 'var(--n-200)';
  if (pct >= 1) return 'var(--color-success)';
  if (pct >= 0.8) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

interface KPICardProps {
  label: string;
  tooltip: string;
  value: string;
  targetLabel?: string;
  achievementPct?: number | null;
  achievementRateLabel?: string;
  children?: React.ReactNode;
}

function KPICard({
  label,
  tooltip,
  value,
  targetLabel,
  achievementPct,
  achievementRateLabel,
  children,
}: KPICardProps) {
  const barPct = achievementPct != null ? Math.min(100, Math.round(achievementPct * 100)) : null;

  return (
    <div
      className="rounded-xl border border-[var(--border-default)] p-4"
      style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-subtle)' }}
      title={tooltip}
    >
      <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">{label}</p>
      <div className="text-xl font-bold font-mono tabular-nums text-[var(--text-primary)] mt-1">
        {value}
      </div>
      {targetLabel && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-[var(--text-muted)]">{targetLabel}</span>
          {achievementPct != null && (
            <span className={`text-xs font-semibold ${achievementColor(achievementPct)}`}>
              {achievementPct >= 1
                ? `↑${((achievementPct - 1) * 100).toFixed(1)}%`
                : `↓${((1 - achievementPct) * 100).toFixed(1)}%`}
            </span>
          )}
        </div>
      )}
      {barPct != null && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--text-muted)]">
              {achievementRateLabel ?? 'Achievement'}
            </span>
            <span className={`font-semibold ${achievementColor(achievementPct ?? null)}`}>
              {barPct}%
            </span>
          </div>
          <div className="h-1 rounded-full bg-[var(--n-200)]">
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: `${barPct}%`,
                backgroundColor: achievementBarColor(achievementPct ?? null),
              }}
            />
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

export function CCPerformanceSummaryCards({
  grandTotal,
  timeProgressPct,
  exchangeRate,
  viewMode,
}: CCPerformanceSummaryCardsProps) {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] ?? I18N.zh;
  const gt = grandTotal;

  // 总业绩卡片：根据 viewMode 切换参照系
  const revenueActual = formatRevenue(gt?.revenue?.actual ?? null, exchangeRate);
  const revenueReference =
    viewMode === 'bm'
      ? gt?.revenue?.bm_expected != null
        ? t.bmRef(formatRevenue(gt.revenue.bm_expected, exchangeRate))
        : undefined
      : gt?.revenue?.target != null
        ? t.targetRef(formatRevenue(gt.revenue.target, exchangeRate))
        : undefined;

  // 达成率卡片：根据 viewMode 切换
  const achievementPct =
    viewMode === 'bm' ? (gt?.revenue?.bm_pct ?? null) : (gt?.revenue?.achievement_pct ?? null);

  // 时间进度卡片
  const progressPct = Math.round(timeProgressPct * 100);
  const progressBarColor =
    progressPct >= 80
      ? 'var(--color-success)'
      : progressPct >= 50
        ? 'var(--color-warning)'
        : 'var(--color-danger)';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 总业绩 */}
      <KPICard
        label={t.teamRevenue}
        tooltip={viewMode === 'bm' ? t.teamRevenueTooltipBm : t.teamRevenueTooltipTarget}
        value={revenueActual}
        targetLabel={revenueReference}
        achievementPct={achievementPct}
        achievementRateLabel={t.achievementRate}
      />

      {/* 达成率 */}
      <KPICard
        label={viewMode === 'bm' ? t.bmAchievement : t.revenueAchievement}
        tooltip={viewMode === 'bm' ? t.bmTooltip : t.targetTooltip}
        value={achievementPct != null ? formatRate(achievementPct) : '—'}
        targetLabel={viewMode === 'bm' ? t.bmPace : t.target100}
        achievementPct={achievementPct}
        achievementRateLabel={t.achievementRate}
      />

      {/* 时间进度 */}
      <div
        className="rounded-xl border border-[var(--border-default)] p-4"
        style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-subtle)' }}
        title={t.timeProgressTooltip}
      >
        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
          {t.timeProgress}
        </p>
        <div className="text-xl font-bold font-mono tabular-nums text-[var(--text-primary)] mt-1">
          {progressPct}%
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-[var(--text-muted)]">{t.monthlyWeighted}</span>
        </div>
        <div className="mt-2">
          <div className="h-1 rounded-full bg-[var(--n-200)]">
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, backgroundColor: progressBarColor }}
            />
          </div>
        </div>
        {gt?.pace_gap_pct != null && (
          <div
            className={`mt-1 text-xs font-semibold ${gt.pace_gap_pct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
          >
            {gt.pace_gap_pct >= 0
              ? t.ahead((gt.pace_gap_pct * 100).toFixed(1))
              : t.behind((gt.pace_gap_pct * 100).toFixed(1))}
          </div>
        )}
      </div>
    </div>
  );
}
