'use client';

import { useMemo } from 'react';
import { formatRate } from '@/lib/utils';

interface DecisionSummaryProps {
  /** 实际付费数 */
  paidActual: number | null;
  /** 付费目标 */
  paidTarget: number | null;
  /** 时间进度 0~1 */
  timeProgress: number | null;
  /** 打卡率 0~1 */
  checkinRate: number | null;
  /** 参与率 0~1 */
  participationRate: number | null;
  /** 业绩达成率 0~1（来自 attribution summary）*/
  revenueAchievementRate: number | null;
}

interface Bottleneck {
  name: string;
  actual: string;
  target: string;
  gap: string;
}

export function DecisionSummary({
  paidActual,
  paidTarget,
  timeProgress,
  checkinRate,
  participationRate,
  revenueAchievementRate,
}: DecisionSummaryProps) {
  const analysis = useMemo(() => {
    // 付费达成率
    const paidAchieve =
      paidActual !== null && paidTarget !== null && paidTarget > 0 ? paidActual / paidTarget : null;

    // 预测完成率 = 当前达成率 / 时间进度
    const forecastRate =
      paidAchieve !== null && timeProgress !== null && timeProgress > 0
        ? paidAchieve / timeProgress
        : null;

    // 时间进度差（负=落后）
    const paceGap =
      paidAchieve !== null && timeProgress !== null ? paidAchieve - timeProgress : null;

    // 关键瓶颈：找差距最大的 2 个效率指标
    const bottlenecks: Bottleneck[] = [];

    if (checkinRate !== null) {
      const target = 0.5; // 打卡率目标 50%
      const gap = checkinRate - target;
      if (gap < 0) {
        bottlenecks.push({
          name: '打卡率',
          actual: `${Math.round(checkinRate * 100)}%`,
          target: `${Math.round(target * 100)}%`,
          gap: formatRate(Math.abs(gap)),
        });
      }
    }

    if (participationRate !== null) {
      const target = 0.3; // 参与率目标 30%
      const gap = participationRate - target;
      if (gap < 0) {
        bottlenecks.push({
          name: '参与率',
          actual: `${Math.round(participationRate * 100)}%`,
          target: `${Math.round(target * 100)}%`,
          gap: formatRate(Math.abs(gap)),
        });
      }
    }

    // 按差距排序取最大的 2 个
    bottlenecks.sort((a, b) => parseFloat(b.gap) - parseFloat(a.gap));
    const topBottlenecks = bottlenecks.slice(0, 2);

    // 状态判断
    let status: 'on-track' | 'at-risk' | 'critical' = 'on-track';
    if (paceGap !== null) {
      if (paceGap < -0.1) status = 'critical';
      else if (paceGap < -0.05) status = 'at-risk';
    }

    return {
      paidAchieve,
      forecastRate,
      paceGap,
      topBottlenecks,
      status,
      timeProgressPct: timeProgress !== null ? Math.round(timeProgress * 100) : null,
      paidAchievePct: paidAchieve !== null ? Math.round(paidAchieve * 100) : null,
      forecastPct: forecastRate !== null ? Math.round(forecastRate * 100) : null,
      revAchievePct:
        revenueAchievementRate !== null ? Math.round(revenueAchievementRate * 100) : null,
    };
  }, [
    paidActual,
    paidTarget,
    timeProgress,
    checkinRate,
    participationRate,
    revenueAchievementRate,
  ]);

  // 数据不足时不渲染
  if (analysis.paidAchievePct === null || analysis.timeProgressPct === null) return null;

  const {
    status,
    paidAchievePct,
    timeProgressPct,
    forecastPct,
    topBottlenecks,
    paceGap,
    revAchievePct,
  } = analysis;

  // 左侧 accent 颜色
  const accentColor =
    status === 'critical'
      ? 'border-l-red-500 bg-red-50'
      : status === 'at-risk'
        ? 'border-l-amber-400 bg-amber-50'
        : 'border-l-green-500 bg-green-50';

  const accentTextColor =
    status === 'critical'
      ? 'text-[var(--color-danger)]'
      : status === 'at-risk'
        ? 'text-amber-800'
        : 'text-emerald-800';

  const statusIcon = status === 'critical' ? '🔴' : status === 'at-risk' ? '🟡' : '🟢';

  // 构建一句话结论
  const paceGapText =
    paceGap !== null
      ? paceGap >= 0
        ? `领先进度线 ${formatRate(paceGap)}`
        : `落后进度线 ${formatRate(Math.abs(paceGap))}`
      : null;

  const forecastText = forecastPct !== null ? `月底预计完成 ${forecastPct}%` : null;

  const bottleneckText =
    topBottlenecks.length > 0
      ? `关键瓶颈：${topBottlenecks.map((b) => `${b.name} ${b.actual}（目标 ${b.target}）`).join('，')}`
      : null;

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-lg border border-[var(--border-default)] border-l-4 px-4 py-3 ${accentColor}`}
      role="region"
      aria-label="决策摘要"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm">{statusIcon}</span>
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          本月付费达成率{' '}
          <span className={`text-base font-bold ${accentTextColor}`}>{paidAchievePct}%</span>
          ，时间进度{' '}
          <span className="font-bold text-[var(--text-primary)]">{timeProgressPct}%</span>
          {paceGapText && (
            <>
              ，<span className={accentTextColor}>{paceGapText}</span>
            </>
          )}
          。
        </span>
        {forecastText && (
          <span className="text-sm text-[var(--text-secondary)]">{forecastText}。</span>
        )}
      </div>

      {/* 业绩达成率（如有）*/}
      {revAchievePct !== null && (
        <div className="text-xs text-[var(--text-secondary)]">
          业绩达成率{' '}
          <span
            className={`font-semibold ${revAchievePct >= 80 ? 'text-emerald-800' : revAchievePct >= 60 ? 'text-amber-800' : 'text-[var(--color-danger)]'}`}
          >
            {revAchievePct}%
          </span>
        </div>
      )}

      {/* 关键瓶颈 */}
      {bottleneckText && (
        <div className="text-xs text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">瓶颈：</span>
          {topBottlenecks.map((b, i) => (
            <span key={b.name}>
              {i > 0 && '，'}
              <span className="font-medium text-[var(--text-primary)]">{b.name}</span>{' '}
              <span className="text-[var(--color-danger)] font-semibold">{b.actual}</span>
              <span className="text-[var(--text-muted)]">
                （目标 {b.target}，差 {b.gap}）
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
