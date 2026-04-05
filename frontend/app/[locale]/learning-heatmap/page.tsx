'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { fmtEnc } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

interface HeatmapRow {
  enclosure: string;
  week1_avg: number | null;
  week2_avg: number | null;
  week3_avg: number | null;
  week4_avg: number | null;
  trend_ratio: number | null;
}

const WEEK_KEYS = ['week1_avg', 'week2_avg', 'week3_avg', 'week4_avg'] as const;

/** 根据 0-1 强度值映射 CSS 背景色（Warm Neutral 深浅） */
function intensityBg(ratio: number): string {
  if (ratio >= 0.85) return 'var(--n-800)';
  if (ratio >= 0.65) return 'var(--n-600)';
  if (ratio >= 0.45) return 'var(--n-400)';
  if (ratio >= 0.25) return 'var(--n-300)';
  if (ratio >= 0.05) return 'var(--n-200)';
  return 'var(--n-100)';
}

function intensityText(ratio: number): string {
  return ratio >= 0.45 ? '#fff' : 'var(--text-primary)';
}

function HeatCell({ value, maxVal }: { value: number | null; maxVal: number }) {
  if (value == null) {
    return (
      <td className="slide-td text-center">
        <span className="text-xs text-muted-token">—</span>
      </td>
    );
  }
  const ratio = maxVal > 0 ? value / maxVal : 0;
  return (
    <td className="slide-td text-center p-1">
      <div
        className="rounded-md px-2 py-1.5 text-xs font-mono tabular-nums font-semibold"
        style={{
          backgroundColor: intensityBg(ratio),
          color: intensityText(ratio),
        }}
      >
        {(value ?? 0).toFixed(2)}
      </div>
    </td>
  );
}

export default function LearningHeatmapPage() {
  usePageDimensions({
    country: true,
    enclosure: true,
    team: true,
  });
  const locale = useLocale();
  const t = useTranslations('learningHeatmap');

  const { data, isLoading, error, mutate } = useFilteredSWR<HeatmapRow[]>(
    '/api/analysis/learning-heatmap'
  );

  const weeks = WEEK_KEYS.map((key, i) => ({ key, label: t('weeks')[i] }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title={t('errorTitle')}
        description={t('errorDesc')}
        action={{ label: t('errorRetry'), onClick: () => mutate() }}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="text-sm text-secondary-token mt-1">{t('subtitleEmpty')}</p>
        </div>
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      </div>
    );
  }

  // 求全局最大值用于归一化
  const allValues = data.flatMap((row) =>
    WEEK_KEYS.map((k) => row[k]).filter((v): v is number => v != null)
  );
  const maxVal = Math.max(...allValues, 0.001);

  const legendBgs = [
    'var(--n-100)',
    'var(--n-200)',
    'var(--n-300)',
    'var(--n-400)',
    'var(--n-600)',
    'var(--n-800)',
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="text-sm text-secondary-token mt-1">{t('subtitle')}</p>
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-3 text-xs text-muted-token">
        <span>{t('legendLabel')}</span>
        {(Array.isArray(t.raw('legendLevels')) ? (t.raw('legendLevels') as string[]) : []).map((label: string, i: number) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: legendBgs[i] }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* 热图表格 */}
      <div className="bg-surface border border-subtle-token rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row">
              <th className="slide-th text-left">{t('colEnclosure')}</th>
              {weeks.map((w) => (
                <th key={w.key} className="slide-th text-center">
                  {w.label}
                </th>
              ))}
              <th className="slide-th text-center">{t('colAvg')}</th>
              <th className="slide-th text-center">
                <span className="inline-flex items-center gap-1 group relative cursor-default">
                  {t('colTrend')}
                  <span
                    className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity"
                    title={t('trendTooltip')}
                  >
                    ⓘ
                  </span>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-subtle text-white text-[10px] rounded px-2 py-1 whitespace-nowrap pointer-events-none shadow-lg">
                    {t('trendTooltip')}
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const vals = WEEK_KEYS.map((k) => row[k]).filter((v): v is number => v != null);
              const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
              return (
                <tr
                  key={row.enclosure}
                  className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                >
                  <td className="slide-td font-medium text-primary-token">
                    {fmtEnc(row.enclosure)}
                  </td>
                  {WEEK_KEYS.map((k) => (
                    <HeatCell key={k} value={row[k]} maxVal={maxVal} />
                  ))}
                  <td className="slide-td text-center">
                    {avg != null ? (
                      <span className="text-xs font-mono tabular-nums text-secondary-token">
                        {avg.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-token">—</span>
                    )}
                  </td>
                  <td className="slide-td text-center">
                    {row.trend_ratio != null ? (
                      <span
                        className={`text-xs font-medium ${
                          row.trend_ratio > 1.15
                            ? 'text-danger-token'
                            : row.trend_ratio < 0.85
                              ? 'text-success-token'
                              : 'text-secondary-token'
                        }`}
                        title={`${t('colTrend')}: ${row.trend_ratio}`}
                      >
                        {row.trend_ratio > 1.15 ? '↓' : row.trend_ratio < 0.85 ? '↑' : '→'}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-token">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 说明 */}
      <p className="text-xs text-muted-token">{t('footerNote')}</p>
    </div>
  );
}
