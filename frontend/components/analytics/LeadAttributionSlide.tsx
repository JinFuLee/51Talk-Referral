'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { swrFetcher } from '@/lib/api';
import { formatRate, formatRevenue } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { LeadAttribution, LeadAttributionRow } from '@/lib/types/report';
import type { SlideProps } from '@/lib/presentation/types';

// ── 国际化 ───────────────────────────────────────
type DailyReportSlice = { blocks: { lead_attribution: LeadAttribution } };

function RateCell({ value }: { value: number }) {
  const color =
    value >= 0.5 ? 'text-success-token' : value >= 0.3 ? 'text-warning-token' : 'text-danger-token';
  return (
    <td className={`px-2 py-1.5 text-xs text-right font-mono tabular-nums ${color}`}>
      {formatRate(value)}
    </td>
  );
}

function AttributionRow({
  row,
  index,
  t,
  isTotalRow = false,
}: {
  row: LeadAttributionRow;
  index: number;
  t: (key: string, params?: any) => string;
  isTotalRow?: boolean;
}) {
  const rowClass = isTotalRow
    ? 'slide-tfoot-row'
    : index % 2 === 0
      ? 'slide-row-even'
      : 'slide-row-odd';

  return (
    <tr className={rowClass}>
      <td className="px-3 py-1.5 text-xs font-semibold text-primary-token">
        {isTotalRow ? t('total') : row.channel}
      </td>
      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums text-secondary-token">
        {(row.registrations ?? 0).toLocaleString()}
      </td>
      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums text-muted-token">
        {formatRate(row.reg_share)}
      </td>
      <RateCell value={row.appt_rate} />
      <RateCell value={row.attend_rate} />
      <RateCell value={row.paid_rate} />
      <RateCell value={row.reg_to_pay_rate} />
      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums font-semibold text-primary-token">
        {(row.payments ?? 0).toLocaleString()}
      </td>
      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums text-muted-token">
        {formatRate(row.payment_share)}
      </td>
      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums font-medium text-primary-token">
        {formatRevenue(row.revenue_usd)}
      </td>
      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums text-muted-token">
        {formatRate(row.revenue_share)}
      </td>
    </tr>
  );
}

export function LeadAttributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const t = useTranslations('LeadAttributionSlide');

  const { data, isLoading, error, mutate } = useFilteredSWR<LeadAttribution>('/api/report/daily', {
    fetcher: (url: string) =>
      (swrFetcher(url) as Promise<DailyReportSlice>).then((d) => d?.blocks?.lead_attribution),
  });
  const rows: LeadAttributionRow[] = data?.rows ?? [];
  const total = data?.total;

  const insight = (() => {
    if (!rows.length) return undefined;
    const topRev = rows.reduce((a, b) => (a.revenue_usd > b.revenue_usd ? a : b));
    return t('insightTpl', { n: topRev.channel, share: formatRate(topRev.revenue_share), rate: formatRate(topRev.reg_to_pay_rate) });
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
                <th className="slide-th slide-th-left">{t('channel')}</th>
                <th className="slide-th slide-th-right">{t('reg')}</th>
                <th className="slide-th slide-th-right">{t('regShare')}</th>
                <th className="slide-th slide-th-right">{t('apptRate')}</th>
                <th className="slide-th slide-th-right">{t('attendRate')}</th>
                <th className="slide-th slide-th-right">{t('paidRate')}</th>
                <th className="slide-th slide-th-right">{t('regToPayRate')}</th>
                <th className="slide-th slide-th-right">{t('payments')}</th>
                <th className="slide-th slide-th-right">{t('payShare')}</th>
                <th className="slide-th slide-th-right">{t('revenue')}</th>
                <th className="slide-th slide-th-right">{t('revShare')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <AttributionRow key={row.channel} row={row} index={i} t={t} />
              ))}
            </tbody>
            {total && (
              <tfoot>
                <AttributionRow row={total} index={0} t={t} isTotalRow />
              </tfoot>
            )}
          </table>
        </div>
      )}
    </SlideShell>
  );
}
