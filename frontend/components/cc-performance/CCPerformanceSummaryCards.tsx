'use client';

import { formatRevenue, formatRate } from '@/lib/utils';
import type { CCPerformanceRecord } from '@/lib/types/cc-performance';

interface CCPerformanceSummaryCardsProps {
  grandTotal: CCPerformanceRecord | null;
  timeProgressPct: number;
  exchangeRate: number;
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
  children?: React.ReactNode;
}

function KPICard({ label, tooltip, value, targetLabel, achievementPct, children }: KPICardProps) {
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
            <span className="text-[var(--text-muted)]">达成率</span>
            <span className={`font-semibold ${achievementColor(achievementPct ?? null)}`}>
              {barPct}%
            </span>
          </div>
          <div className="h-1 rounded-full bg-[var(--n-200)]">
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{ width: `${barPct}%`, backgroundColor: achievementBarColor(achievementPct ?? null) }}
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
}: CCPerformanceSummaryCardsProps) {
  const gt = grandTotal;

  // 总业绩卡片
  const revenueActual = formatRevenue(gt?.revenue?.actual ?? null, exchangeRate);
  const revenueTarget =
    gt?.revenue?.target != null
      ? `目标 ${formatRevenue(gt.revenue.target, exchangeRate)}`
      : undefined;

  // 时间进度卡片
  const progressPct = Math.round(timeProgressPct * 100);
  const progressBarColor =
    progressPct >= 80 ? 'var(--color-success)' : progressPct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 总业绩 */}
      <KPICard
        label="团队总业绩"
        tooltip="本月 CC 前端 + 新单 + 转介绍渠道 + 市场渠道 合计"
        value={revenueActual}
        targetLabel={revenueTarget}
        achievementPct={gt?.revenue?.achievement_pct ?? null}
      />

      {/* 达成率 */}
      <KPICard
        label="业绩达成率"
        tooltip="实际业绩 / 月度目标"
        value={
          gt?.revenue?.achievement_pct != null
            ? formatRate(gt.revenue.achievement_pct)
            : '—'
        }
        targetLabel="目标 100%"
        achievementPct={gt?.revenue?.achievement_pct ?? null}
      >
        {/* BM 节奏达成行 */}
        {gt?.revenue?.bm_pct != null && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-[var(--text-muted)]">
              BM {(gt.revenue.bm_pct * 100).toFixed(1)}%
            </span>
            <span
              className={`text-xs font-semibold ${
                gt.revenue.bm_pct >= 1 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {gt.revenue.bm_pct >= 1
                ? `↑${((gt.revenue.bm_pct - 1) * 100).toFixed(1)}%`
                : `↓${((1 - gt.revenue.bm_pct) * 100).toFixed(1)}%`}
            </span>
          </div>
        )}
      </KPICard>

      {/* 时间进度 */}
      <div
        className="rounded-xl border border-[var(--border-default)] p-4"
        style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-subtle)' }}
        title="本月已过时间进度（加权工作日，周三权重 0）"
      >
        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
          时间进度
        </p>
        <div className="text-xl font-bold font-mono tabular-nums text-[var(--text-primary)] mt-1">
          {progressPct}%
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-[var(--text-muted)]">月度加权进度</span>
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
          <div className={`mt-1 text-xs font-semibold ${gt.pace_gap_pct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {gt.pace_gap_pct >= 0
              ? `领先进度 +${(gt.pace_gap_pct * 100).toFixed(1)}pp`
              : `落后进度 ${(gt.pace_gap_pct * 100).toFixed(1)}pp`}
          </div>
        )}
      </div>
    </div>
  );
}
