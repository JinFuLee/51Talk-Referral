'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { swrFetcher } from '@/lib/api';
import { formatRate, formatRevenue } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { FunnelLeverage, LeverageScore } from '@/lib/types/report';
import type { SlideProps } from '@/lib/presentation/types';

// ── 国际化 ───────────────────────────────────────
type DailyReportSlice = { blocks: { funnel_leverage: FunnelLeverage } };

function ScoreBar({ score }: { score: number }) {
  // score 通常在 0-1 之间（impact × feasibility × urgency 归一化后）
  const pct = Math.min(100, score * 100);
  const color =
    score >= 0.5 ? 'bg-success-token' : score >= 0.25 ? 'bg-warning-token' : 'bg-danger-token';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-subtle rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono tabular-nums text-secondary-token w-8 text-right">
        {(score ?? 0).toFixed(2)}
      </span>
    </div>
  );
}

function PotentialBadge({ label }: { label: string }) {
  const isGood = label.includes('高潜力') || label.includes('High');
  const isPending = label.includes('待改善') || label.includes('Improve');
  return (
    <span
      className={`inline-block px-1.5 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${
        isGood
          ? 'bg-success-surface text-success-token'
          : isPending
            ? 'bg-warning-surface text-warning-token'
            : 'bg-subtle text-muted-token'
      }`}
    >
      {label}
    </span>
  );
}

export function FunnelLeverageSlide({ slideNumber, totalSlides }: SlideProps) {
  const t = useTranslations('FunnelLeverageSlide');

  const { data, isLoading, error, mutate } = useFilteredSWR<FunnelLeverage>('/api/report/daily', {
    fetcher: (url: string) =>
      (swrFetcher(url) as Promise<DailyReportSlice>).then((d) => d?.blocks?.funnel_leverage),
  });
  const scores: LeverageScore[] = data?.scores ?? [];
  const topBottleneck = data?.top_bottleneck;

  const insight = (() => {
    if (!topBottleneck) return undefined;
    const stageLabel = t(`stageLabels.${topBottleneck.stage}`) ?? topBottleneck.stage;
    return t('insightTpl', { channel: topBottleneck.channel, stage: stageLabel, score: (topBottleneck.leverage_score ?? 0).toFixed(2), impact: formatRevenue(topBottleneck.revenue_impact) });
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title={t('title')}
      subtitle={t('subtitle')}
      section={t('section')}
      insight={insight}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-full px-4">
          <SkeletonChart className="h-4/5 w-full" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <p className="text-base font-semibold text-danger-token">{t('error')}</p>
            <p className="text-sm text-muted-token">{t('errorHint')}</p>
            <button
              onClick={() => mutate()}
              className="mt-1 px-4 py-1.5 rounded-lg text-sm border border-default-token text-secondary-token hover:bg-subtle transition-colors"
            >
              {t('retry')}
            </button>
          </div>
        </div>
      ) : scores.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-muted-token">
          <p className="text-base font-medium">{t('empty')}</p>
          <p className="text-sm">{t('emptyHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 h-full">
          {/* 最大瓶颈高亮卡片 */}
          {topBottleneck && (
            <div className="flex-shrink-0 px-4 py-3 rounded-xl border-2 border-brand-p1 bg-warning-surface flex items-center gap-4">
              <div className="flex-shrink-0 w-2 h-8 rounded-full bg-brand-p1" />
              <div>
                <p className="text-xs text-muted-token font-medium">{t('bottleneck')}</p>
                <p className="text-sm font-bold text-primary-token">
                  {topBottleneck.channel} ·{' '}
                  {t(`stageLabels.${topBottleneck.stage}`) ?? topBottleneck.stage}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-token">{t('impact')}</p>
                <p className="text-sm font-bold text-warning-token">
                  +{formatRevenue(topBottleneck.revenue_impact)}
                </p>
              </div>
            </div>
          )}

          {/* 杠杆矩阵表 */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left">{t('channel')}</th>
                  <th className="slide-th slide-th-left">{t('stage')}</th>
                  <th className="slide-th slide-th-right">{t('actual')}</th>
                  <th className="slide-th slide-th-right">{t('target')}</th>
                  <th className="slide-th slide-th-right">{t('gap')}</th>
                  <th className="slide-th slide-th-right">{t('impact')}</th>
                  <th className="slide-th" style={{ width: '120px' }}>
                    {t('score')}
                  </th>
                  <th className="slide-th slide-th-center">{t('potential')}</th>
                </tr>
              </thead>
              <tbody>
                {scores
                  .sort((a, b) => b.leverage_score - a.leverage_score)
                  .map((row, i) => (
                    <tr
                      key={`${row.channel}-${row.stage}`}
                      className={`${i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'} ${row.is_bottleneck ? 'ring-1 ring-inset ring-amber-300' : ''}`}
                    >
                      <td className="px-3 py-1.5 text-xs font-semibold text-primary-token">
                        {row.channel}
                        {row.is_bottleneck && (
                          <span className="ml-1 text-warning-token text-xs">★</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-xs text-secondary-token">
                        {t(`stageLabels.${row.stage}`) ?? row.stage}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums text-secondary-token">
                        {formatRate(row.actual_rate)}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums text-muted-token">
                        {formatRate(row.target_rate)}
                      </td>
                      <td
                        className={`px-2 py-1.5 text-xs text-right font-mono tabular-nums font-semibold ${row.gap >= 0 ? 'text-success-token' : 'text-danger-token'}`}
                      >
                        {row.gap > 0 ? '+' : ''}
                        {formatRate(row.gap)}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums text-warning-token font-semibold">
                        +{formatRevenue(row.revenue_impact)}
                      </td>
                      <td className="px-3 py-1.5">
                        <ScoreBar score={row.leverage_score} />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <PotentialBadge label={row.potential_label} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SlideShell>
  );
}
