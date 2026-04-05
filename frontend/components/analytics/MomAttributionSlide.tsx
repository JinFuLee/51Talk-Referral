'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { swrFetcher } from '@/lib/api';
import { formatRate, formatRevenue } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { MomAttribution, MomAttributionRow } from '@/lib/types/report';
import type { SlideProps } from '@/lib/presentation/types';

const METRIC_LABELS: Record<string, { zh: string; 'zh-TW': string; en: string; th: string }> = {
  revenue: { zh: '业绩 (USD)', 'zh-TW': '業績 (USD)', en: 'Revenue', th: 'รายได้ (USD)' },
  registrations: { zh: '注册数', 'zh-TW': '註冊數', en: 'Registrations', th: 'ลงทะเบียน' },
  appointments: { zh: '预约数', 'zh-TW': '預約數', en: 'Appointments', th: 'นัดหมาย' },
  attendance: { zh: '出席数', 'zh-TW': '出席數', en: 'Attendance', th: 'เข้าร่วม' },
  payments: { zh: '付费数', 'zh-TW': '付費數', en: 'Payments', th: 'ชำระ' },
  appt_rate: { zh: '预约率', 'zh-TW': '預約率', en: 'Appt Rate', th: 'อัตรานัดหมาย' },
  attend_rate: { zh: '出席率', 'zh-TW': '出席率', en: 'Attend Rate', th: 'อัตราเข้าร่วม' },
  paid_rate: { zh: '付费率', 'zh-TW': '付費率', en: 'Paid Rate', th: 'อัตราชำระ' },
};

function isRateMetric(metric: string) {
  return metric.endsWith('_rate');
}

function formatMetricValue(metric: string, value: number | null | undefined): string {
  if (value == null) return '—';
  if (isRateMetric(metric)) return formatRate(value);
  if (metric === 'revenue') return formatRevenue(value);
  return value.toLocaleString();
}

function judgmentColor(j: '↑' | '↓' | '→'): string {
  if (j === '↑') return 'text-success-token font-bold';
  if (j === '↓') return 'text-danger-token font-bold';
  return 'text-muted-token';
}

function deltaColor(delta: number): string {
  if (delta > 0) return 'text-success-token font-semibold';
  if (delta < 0) return 'text-danger-token font-semibold';
  return 'text-muted-token';
}

type DailyReportSlice = { blocks: { mom_attribution: MomAttribution } };

export function MomAttributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const locale = useLocale();
  const lang = locale as 'zh' | 'zh-TW' | 'en' | 'th';
  const t = useTranslations('MomAttributionSlide');

  const { data, isLoading, error, mutate } = useFilteredSWR<MomAttribution>('/api/report/daily', {
    fetcher: (url: string) =>
      (swrFetcher(url) as Promise<DailyReportSlice>).then((d) => d?.blocks?.mom_attribution),
  });
  const rows: MomAttributionRow[] = data?.rows ?? [];

  const insight = (() => {
    if (!rows.length) return undefined;
    const rateRows = rows.filter((r) => isRateMetric(r.metric));
    if (!rateRows.length) return undefined;
    const worst = rateRows.reduce((a, b) => (a.vs_target < b.vs_target ? a : b));
    const label =
      METRIC_LABELS[worst.metric]?.[lang as keyof (typeof METRIC_LABELS)[string]] ?? worst.metric;
    return `${label} ${t('insightVsTarget')} ${formatRate(worst.vs_target)}，${t('insightNeedsAttention')}`;
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
      ) : rows.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-muted-token">
          <p className="text-base font-medium">{t('empty')}</p>
          <p className="text-sm">{t('emptyHint')}</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left">{t('metric')}</th>
                <th className="slide-th slide-th-right">{t('lastMonth')}</th>
                <th className="slide-th slide-th-right">{t('thisMonth')}</th>
                <th className="slide-th slide-th-right">{t('target')}</th>
                <th className="slide-th slide-th-right">{t('delta')}</th>
                <th className="slide-th slide-th-right">{t('deltaPct')}</th>
                <th className="slide-th slide-th-right">{t('vsTarget')}</th>
                <th className="slide-th slide-th-center">{t('judgment')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isRate = isRateMetric(row.metric);
                return (
                  <tr key={row.metric} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="px-3 py-2 text-xs font-semibold text-primary-token">
                      {METRIC_LABELS[row.metric]?.[lang as keyof (typeof METRIC_LABELS)[string]] ??
                        row.metric}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-mono tabular-nums text-secondary-token">
                      {formatMetricValue(row.metric, row.last_month)}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-mono tabular-nums font-semibold text-primary-token">
                      {formatMetricValue(row.metric, row.this_month)}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-mono tabular-nums text-secondary-token">
                      {formatMetricValue(row.metric, row.target)}
                    </td>
                    <td
                      className={`px-3 py-2 text-xs text-right font-mono tabular-nums ${deltaColor(row.delta)}`}
                    >
                      {row.delta > 0 ? '+' : ''}
                      {isRate ? formatRate(row.delta) : (row.delta ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={`px-3 py-2 text-xs text-right font-mono tabular-nums ${deltaColor(row.delta_pct)}`}
                    >
                      {row.delta_pct > 0 ? '+' : ''}
                      {formatRate(row.delta_pct)}
                    </td>
                    <td
                      className={`px-3 py-2 text-xs text-right font-mono tabular-nums ${deltaColor(row.vs_target)}`}
                    >
                      {row.vs_target > 0 ? '+' : ''}
                      {isRate ? formatRate(row.vs_target) : (row.vs_target ?? 0).toLocaleString()}
                    </td>
                    <td className={`px-3 py-2 text-sm text-center ${judgmentColor(row.judgment)}`}>
                      {row.judgment}
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
