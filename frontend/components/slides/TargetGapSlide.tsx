'use client';

import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { SlideProps } from '@/lib/presentation/types';

// 对齐 /api/funnel 真实返回
interface FunnelResponse {
  date: string | null;
  stages: {
    name: string;
    target: number | null;
    actual: number | null;
    gap: number | null;
    achievement_rate: number | null;
    conversion_rate: number | null;
  }[];
  target_revenue: number | null;
  actual_revenue: number | null;
  revenue_gap: number | null;
  revenue_achievement: number | null;
}
export function TargetGapSlide({ slideNumber, totalSlides }: SlideProps) {
  const t = useTranslations('TargetGapSlide');

  const { data, isLoading, error, mutate } = useFilteredSWR<FunnelResponse>('/api/funnel');
  const stages = data?.stages ?? [];

  // 生成一句话结论
  const insight = (() => {
    if (!stages.length) return undefined;
    const withTarget = stages.filter((s) => (s.target ?? 0) > 0 && s.achievement_rate !== null);
    if (!withTarget.length) return undefined;
    const worst = withTarget.reduce((a, b) =>
      (a.achievement_rate ?? 0) < (b.achievement_rate ?? 0) ? a : b
    );
    const best = withTarget.reduce((a, b) =>
      (a.achievement_rate ?? 0) > (b.achievement_rate ?? 0) ? a : b
    );
    const worstRate = Math.round((worst.achievement_rate ?? 0) * 100);
    const bestRate = Math.round((best.achievement_rate ?? 0) * 100);
    if (worst.name === best.name) {
      return t('insight_single', { name: worst.name, worstRate });
    }
    return t('insight_dual', { worstName: worst.name, worstRate, bestName: best.name, bestRate });
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title={t('title')}
      subtitle={t('subtitle')}
      section={t('section')}
      knowledgeChapter="chapter-4"
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
      ) : stages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-token">{t('no_data')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 h-full content-center">
          {stages.map((s) => {
            const actual = s.actual ?? 0;
            const target = s.target ?? 0;
            const gap = s.gap ?? 0;
            const rate = s.achievement_rate ?? 0;
            const isAtRisk = target > 0 && rate < 0.8;
            return (
              <div
                key={s.name}
                className={`flex flex-col gap-2 rounded-[var(--radius-xl)] p-6 ${
                  isAtRisk ? 'bg-danger-surface border-2 border-danger-token' : 'bg-subtle'
                }`}
              >
                <p className="text-sm font-medium text-secondary-token">{s.name}</p>
                <div
                  className={`text-3xl font-bold ${
                    isAtRisk ? 'text-danger-token' : 'text-primary-token'
                  }`}
                  style={isAtRisk ? undefined : { color: 'var(--brand-p1, var(--text-primary))' }}
                >
                  {actual.toLocaleString()}
                </div>
                {target > 0 && <p className="text-sm text-muted-token">{t('target_label', { v: target.toLocaleString() })}</p>}
                {target > 0 && (
                  <>
                    <div
                      className={`text-lg font-bold ${gap >= 0 ? 'text-success-token' : 'text-danger-token'}`}
                    >
                      {gap >= 0 ? '+' : ''}
                      {gap.toLocaleString()}
                    </div>
                    <div className="w-full bg-subtle rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${rate >= 1 ? 'bg-success-token' : rate >= 0.8 ? 'bg-warning-token' : 'bg-danger-token'}`}
                        style={{ width: `${Math.min(100, rate * 100)}%` }}
                      />
                    </div>
                    <p
                      className={`text-sm font-semibold ${rate >= 1 ? 'text-success-token' : rate >= 0.8 ? 'text-warning-token' : 'text-danger-token'}`}
                    >
                      {formatRate(rate)}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SlideShell>
  );
}
