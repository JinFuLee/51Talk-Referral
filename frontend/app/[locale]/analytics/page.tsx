'use client';

export const dynamic = 'force-dynamic';

import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { formatRate } from '@/lib/utils';
import { MonthlyOverviewSlide } from '@/components/analytics/MonthlyOverviewSlide';
import { GapDashboardSlide } from '@/components/analytics/GapDashboardSlide';
import { ScenarioCompareSlide } from '@/components/analytics/ScenarioCompareSlide';
import { ProjectionSlide } from '@/components/analytics/ProjectionSlide';
import { RevenueContributionSlide } from '@/components/analytics/RevenueContributionSlide';
import type { DailyReport } from '@/lib/types/report';

export default function AnalyticsPage() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
    channel: true,
  });
  const t = useTranslations('analysis');
  // slides use useLocale() internally — no need to pass locale as prop
  const { data, isLoading, error, mutate } = useFilteredSWR<DailyReport>('/api/report/daily');

  const bm = data?.bm_pct ?? 0;
  const date = data?.date ?? '—';

  return (
    <div className="space-y-6">
      {/* ── 顶部 Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] font-display">
            {t('title')}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{t('subtitle')}</p>
        </div>
      </div>

      {/* ── BM 进度条 ── */}
      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            {t('bmProgress')}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-muted)]">
              {t('dataDate')}：{date}
            </span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{formatRate(bm)}</span>
          </div>
        </div>
        <div className="w-full bg-[var(--color-accent-subtle)] rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, bm * 100)}%`,
              backgroundColor:
                bm >= 1
                  ? 'var(--color-success)'
                  : bm >= 0.8
                    ? 'var(--color-warning)'
                    : 'var(--color-accent)',
            }}
          />
        </div>
      </div>

      {/* ── 三态处理 ── */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-base h-48 animate-pulse bg-[var(--n-100)]" />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="card-base flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-base font-semibold text-red-600">{t('loadError')}</p>
          <p className="text-sm text-[var(--text-muted)]">{t('loadErrorDesc')}</p>
          <button onClick={() => mutate()} className="btn-secondary">
            {t('retry')}
          </button>
        </div>
      )}

      {!isLoading && !error && !data && (
        <div className="card-base flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-base font-semibold text-[var(--text-secondary)]">{t('noData')}</p>
          <p className="text-sm text-[var(--text-muted)]">{t('noDataDesc')}</p>
        </div>
      )}

      {/* ── 11 区块布局 ── */}
      {data && !isLoading && (
        <div className="space-y-6">
          {/* Row 1: 区块 1 + 区块 2 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <MonthlyOverviewSlide data={data.blocks.monthly_overview} />
            <GapDashboardSlide
              data={data.blocks.gap_dashboard}
              monthlyData={data.blocks.gap_dashboard?.monthly}
            />
          </div>

          {/* Row 2: 区块 3 + 区块 4 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ScenarioCompareSlide data={data.blocks.scenario_analysis} />
            <ProjectionSlide data={data.blocks.projection} bm_pct={data.bm_pct} />
          </div>

          {/* Row 3: 区块 5（全宽） */}
          <RevenueContributionSlide data={data.blocks.revenue_contribution} />

          {/* Row 4-6: blocks 6-11 placeholder (implemented by FE2) */}
          <div className="card-base p-6 text-center text-sm text-[var(--text-muted)]">
            {t('placeholder')}
          </div>
        </div>
      )}
    </div>
  );
}
