'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { formatRate } from '@/lib/utils';

const I18N = {
  zh: {
    monthlyPaidAchieve: '本月付费达成率',
    timeProgress: '时间进度',
    aheadOf: '领先进度线',
    behindOf: '落后进度线',
    forecastComplete: '月底预计完成',
    revenueAchieve: '业绩达成率',
    bottleneck: '瓶颈：',
    target: '目标',
    gap: '差',
    checkinRate: '打卡率',
    participationRate: '参与率',
    ariaLabel: '决策摘要',
  },
  'zh-TW': {
    monthlyPaidAchieve: '本月付費達成率',
    timeProgress: '時間進度',
    aheadOf: '領先進度線',
    behindOf: '落後進度線',
    forecastComplete: '月底預計完成',
    revenueAchieve: '業績達成率',
    bottleneck: '瓶頸：',
    target: '目標',
    gap: '差',
    checkinRate: '打卡率',
    participationRate: '參與率',
    ariaLabel: '決策摘要',
  },
  en: {
    monthlyPaidAchieve: 'Monthly Payment Achievement',
    timeProgress: 'Time Progress',
    aheadOf: 'ahead of pace',
    behindOf: 'behind pace',
    forecastComplete: 'Month-end forecast',
    revenueAchieve: 'Revenue Achievement',
    bottleneck: 'Bottleneck: ',
    target: 'Target',
    gap: 'Gap',
    checkinRate: 'Check-in Rate',
    participationRate: 'Participation Rate',
    ariaLabel: 'Decision Summary',
  },
  th: {
    monthlyPaidAchieve: 'อัตราบรรลุการชำระเงินประจำเดือน',
    timeProgress: 'ความคืบหน้าตามเวลา',
    aheadOf: 'นำหน้าเป้าหมาย',
    behindOf: 'ช้ากว่าเป้าหมาย',
    forecastComplete: 'คาดการณ์สิ้นเดือน',
    revenueAchieve: 'อัตราบรรลุรายได้',
    bottleneck: 'คอขวด: ',
    target: 'เป้าหมาย',
    gap: 'ช่องว่าง',
    checkinRate: 'อัตราเช็คอิน',
    participationRate: 'อัตราการมีส่วนร่วม',
    ariaLabel: 'สรุปการตัดสินใจ',
  },
} as const;
type Locale = keyof typeof I18N;

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
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

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
          name: t.checkinRate,
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
          name: t.participationRate,
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
      ? 'border-l-red-500 bg-[var(--color-danger-surface)]'
      : status === 'at-risk'
        ? 'border-l-amber-400 bg-[var(--color-warning-surface)]'
        : 'border-l-green-500 bg-[var(--color-success-surface)]';

  const accentTextColor =
    status === 'critical'
      ? 'text-[var(--color-danger)]'
      : status === 'at-risk'
        ? 'text-[var(--color-warning)]'
        : 'text-[var(--color-success)]';

  const statusIcon = status === 'critical' ? '🔴' : status === 'at-risk' ? '🟡' : '🟢';

  // 构建一句话结论
  const paceGapText =
    paceGap !== null
      ? paceGap >= 0
        ? `${t.aheadOf} ${formatRate(paceGap)}`
        : `${t.behindOf} ${formatRate(Math.abs(paceGap))}`
      : null;

  const forecastText = forecastPct !== null ? `${t.forecastComplete} ${forecastPct}%` : null;

  const bottleneckText =
    topBottlenecks.length > 0
      ? topBottlenecks.map((b) => `${b.name} ${b.actual}`).join('，')
      : null;

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-lg border border-[var(--border-default)] border-l-4 px-4 py-3 ${accentColor}`}
      role="region"
      aria-label={t.ariaLabel}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm">{statusIcon}</span>
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {t.monthlyPaidAchieve}{' '}
          <span className={`text-base font-bold ${accentTextColor}`}>{paidAchievePct}%</span>
          {', '}
          {t.timeProgress}{' '}
          <span className="font-bold text-[var(--text-primary)]">{timeProgressPct}%</span>
          {paceGapText && (
            <>
              {', '}
              <span className={accentTextColor}>{paceGapText}</span>
            </>
          )}
          {'。'}
        </span>
        {forecastText && (
          <span className="text-sm text-[var(--text-secondary)]">{forecastText}。</span>
        )}
      </div>

      {/* 业绩达成率（如有）*/}
      {revAchievePct !== null && (
        <div className="text-xs text-[var(--text-secondary)]">
          {t.revenueAchieve}{' '}
          <span
            className={`font-semibold ${revAchievePct >= 80 ? 'text-[var(--color-success)]' : revAchievePct >= 60 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}
          >
            {revAchievePct}%
          </span>
        </div>
      )}

      {/* 关键瓶颈 */}
      {bottleneckText && (
        <div className="text-xs text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">{t.bottleneck}</span>
          {topBottlenecks.map((b, i) => (
            <span key={b.name}>
              {i > 0 && '，'}
              <span className="font-medium text-[var(--text-primary)]">{b.name}</span>{' '}
              <span className="text-[var(--color-danger)] font-semibold">{b.actual}</span>
              <span className="text-[var(--text-muted)]">
                （{t.target} {b.target}，{t.gap} {b.gap}）
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
