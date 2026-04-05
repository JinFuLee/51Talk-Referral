'use client';

import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ScenarioResult } from '@/lib/types/funnel';
import type { SlideProps } from '@/lib/presentation/types';

export function ScenarioAnalysisSlide({ slideNumber, totalSlides }: SlideProps) {
  const t = useTranslations('ScenarioAnalysisSlide');

  const { data, isLoading, error, mutate } = useFilteredSWR<ScenarioResult>('/api/funnel/scenario');

  const insight = (() => {
    if (!data) return undefined;
    return t('insight', {
      paid: data.impact_payments ?? 0,
      revenue: data.impact_revenue ?? 0,
      currentRate: formatRate(data.current_rate),
      scenarioRate: formatRate(data.scenario_rate),
    }) ?? undefined;
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title={t('title')}
      subtitle={t('subtitle')}
      section={t('section')}
      knowledgeChapter="chapter-7"
      knowledgeBook="business-bible"
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
      ) : !data ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-muted-token">
          <p className="text-base font-medium">{t('no_data')}</p>
          <p className="text-sm">{t('no_data_hint')}</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-subtle rounded-lg p-4">
              <p className="text-xs text-muted-token mb-1">{t('current_rate')}</p>
              <p className="text-2xl font-bold text-primary-token">
                {formatRate(data.current_rate)}
              </p>
            </div>
            <div className="bg-action-accent-surface rounded-lg p-4">
              <p className="text-xs text-muted-token mb-1">{t('scenario_rate')}</p>
              <p className="text-2xl font-bold text-action-accent">
                {formatRate(data.scenario_rate)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-subtle rounded-lg p-3 text-center">
              <p className="text-xs text-muted-token mb-1">{t('impact_reg')}</p>
              <p className="text-lg font-bold text-primary-token">
                +{(data.impact_registrations ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-subtle rounded-lg p-3 text-center">
              <p className="text-xs text-muted-token mb-1">{t('impact_paid')}</p>
              <p className="text-lg font-bold text-primary-token">
                +{(data.impact_payments ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-success-surface rounded-lg p-3 text-center">
              <p className="text-xs text-muted-token mb-1">{t('impact_revenue')}</p>
              <p className="text-lg font-bold text-success-token">
                +${(data.impact_revenue ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </SlideShell>
  );
}
