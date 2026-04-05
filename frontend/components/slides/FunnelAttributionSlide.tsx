'use client';

import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { SlideProps } from '@/lib/presentation/types';

interface FunnelStage {
  name: string;
  target: number | null;
  actual: number | null;
  gap: number | null;
  achievement_rate: number | null;
  conversion_rate: number | null;
}

interface FunnelResponse {
  stages: FunnelStage[];
}
export function FunnelAttributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const t = useTranslations('FunnelAttributionSlide');

  const { data, isLoading, error, mutate } = useFilteredSWR<FunnelResponse>('/api/funnel');
  const allStages = data?.stages ?? [];

  // 只保留计数型 stage（过滤掉名称含率关键词的率值 stage）
  const countStages = allStages.filter((s) => !s.name.includes('率'));

  // 相邻环节计算转化率
  const rows = countStages.map((s, i) => {
    const prev = i > 0 ? (countStages[i - 1].actual ?? 0) : 0;
    const curr = s.actual ?? 0;
    const stepRate = prev > 0 ? curr / prev : null;
    return { ...s, stepRate };
  });

  // 一句话结论：找达成率最低的环节
  const insight = (() => {
    const withTarget = rows.filter((r) => (r.target ?? 0) > 0 && r.achievement_rate !== null);
    if (!withTarget.length) return undefined;
    const worst = withTarget.reduce((a, b) =>
      (a.achievement_rate ?? 0) < (b.achievement_rate ?? 0) ? a : b
    );
    const rate = Math.round((worst.achievement_rate ?? 0) * 100);
    return t('insight', { name: worst.name, rate });
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title={t('title')}
      subtitle={t('subtitle')}
      section={t('section')}
      knowledgeChapter="chapter-2"
      insight={insight}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-full px-4">
          <SkeletonChart className="h-4/5 w-full" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <p className="text-base font-semibold text-danger-token">{t('loading_failed')}</p>
            <p className="text-sm text-muted-token">{t('check_backend')}</p>
            <button
              onClick={() => mutate()}
              className="mt-1 px-4 py-1.5 rounded-lg text-sm border border-default-token text-secondary-token hover:bg-subtle transition-colors"
            >
              {t('retry')}
            </button>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-token">{t('no_data')}</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left">{t('col_stage')}</th>
                <th className="slide-th slide-th-right">{t('col_actual')}</th>
                <th className="slide-th slide-th-right">{t('col_target')}</th>
                <th className="slide-th slide-th-right">{t('col_gap')}</th>
                <th className="slide-th slide-th-right">{t('col_achievement')}</th>
                <th className="slide-th slide-th-right">{t('col_step_rate')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const actual = r.actual ?? 0;
                const target = r.target ?? 0;
                const gap = r.gap ?? 0;
                const rate = r.achievement_rate ?? 0;
                const isGood = gap >= 0;
                return (
                  <tr key={r.name} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="px-3 py-2 text-sm font-semibold text-primary-token">{r.name}</td>
                    <td className="px-3 py-2 text-sm text-right font-mono tabular-nums font-bold text-primary-token">
                      {actual.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-mono tabular-nums text-secondary-token">
                      {target > 0 ? target.toLocaleString() : '-'}
                    </td>
                    <td
                      className={`px-3 py-2 text-sm text-right font-mono tabular-nums font-bold ${isGood ? 'text-success-token' : 'text-danger-token'}`}
                    >
                      {target > 0 ? `${isGood ? '+' : ''}${gap.toLocaleString()}` : '-'}
                    </td>
                    <td
                      className={`px-3 py-2 text-sm text-right font-semibold ${rate >= 1 ? 'text-success-token' : rate >= 0.8 ? 'text-warning-token' : rate > 0 ? 'text-danger-token' : 'text-muted-token'}`}
                    >
                      {rate > 0 ? formatRate(rate) : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-right">
                      {r.stepRate != null ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            r.stepRate >= 0.8
                              ? 'text-success-token bg-success-surface'
                              : r.stepRate >= 0.5
                                ? 'text-warning-token bg-warning-surface'
                                : 'text-danger-token bg-danger-surface'
                          }`}
                        >
                          {formatRate(r.stepRate)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
