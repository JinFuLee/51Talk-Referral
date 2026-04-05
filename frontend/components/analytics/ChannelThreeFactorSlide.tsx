'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { swrFetcher } from '@/lib/api';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ChannelThreeFactor, ChannelThreeFactorRow } from '@/lib/types/report';
import type { SlideProps } from '@/lib/presentation/types';

// ── 国际化 ───────────────────────────────────────
type DailyReportSlice = { blocks: { channel_three_factor: ChannelThreeFactor } };

function DeltaCell({ value }: { value: number | null | undefined }) {
  if (value == null) return <td className="px-2 py-1.5 text-xs text-right text-muted-token">—</td>;
  const color =
    value > 0 ? 'text-success-token' : value < 0 ? 'text-danger-token' : 'text-muted-token';
  return (
    <td className={`px-2 py-1.5 text-xs text-right font-mono tabular-nums font-semibold ${color}`}>
      {value > 0 ? '+' : ''}
      {formatRevenue(value)}
    </td>
  );
}

function ChannelRow({
  row,
  index,
  t,
}: {
  row: ChannelThreeFactorRow;
  index: number;
  t: (key: string, params?: any) => string;
}) {
  const isLMDI = row.display_method === 'lmdi';
  const d = isLMDI ? row.lmdi : row.laspeyres;

  const volDelta = isLMDI ? row.lmdi.vol_lmdi : row.laspeyres.vol_delta;
  const convDelta = isLMDI ? row.lmdi.conv_lmdi : row.laspeyres.conv_delta;
  const priceDelta = isLMDI ? row.lmdi.price_lmdi : row.laspeyres.price_delta;

  return (
    <tr className={index % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
      <td className="px-3 py-2 text-xs font-semibold text-primary-token">{row.channel}</td>
      <td className="px-2 py-2 text-center">
        <span
          className={`inline-block px-1.5 py-0.5 text-xs rounded font-medium ${
            isLMDI ? 'bg-warning-surface text-warning-token' : 'bg-accent-surface text-brand-p2'
          }`}
        >
          {isLMDI ? t('lmdiLabel') : t('laspLabel')}
        </span>
      </td>
      <DeltaCell value={volDelta} />
      <DeltaCell value={convDelta} />
      <DeltaCell value={priceDelta} />
      {!isLMDI && <DeltaCell value={d.residual} />}
      {isLMDI && <td className="px-2 py-1.5 text-xs text-right text-muted-token">—</td>}
      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums font-bold text-primary-token">
        {formatRevenue(d.actual_delta)}
      </td>
    </tr>
  );
}

export function ChannelThreeFactorSlide({ slideNumber, totalSlides }: SlideProps) {
  const t = useTranslations('ChannelThreeFactorSlide');

  const { data, isLoading, error, mutate } = useFilteredSWR<ChannelThreeFactor>(
    '/api/report/daily',
    {
      fetcher: (url: string) =>
        (swrFetcher(url) as Promise<DailyReportSlice>).then((d) => d?.blocks?.channel_three_factor),
    }
  );
  const channels: ChannelThreeFactorRow[] = data?.channels ?? [];

  const insight = (() => {
    if (!channels.length) return undefined;
    const top = channels.reduce((a, b) => {
      const aDelta = a.display_method === 'lmdi' ? a.lmdi.actual_delta : a.laspeyres.actual_delta;
      const bDelta = b.display_method === 'lmdi' ? b.lmdi.actual_delta : b.laspeyres.actual_delta;
      return Math.abs(aDelta) > Math.abs(bDelta) ? a : b;
    });
    const delta =
      top.display_method === 'lmdi' ? top.lmdi.actual_delta : top.laspeyres.actual_delta;
    const sign = delta > 0 ? '+' : '';
    return `${top.channel} ${t('insightLargest')}（${sign}${formatRevenue(delta)}）`;
  })();

  // 统计哪些渠道使用 LMDI（用于说明）
  const lmdiCount = channels.filter((c) => c.display_method === 'lmdi').length;

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
      ) : channels.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-muted-token">
          <p className="text-base font-medium">{t('empty')}</p>
          <p className="text-sm">{t('emptyHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 h-full">
          {/* 方法说明 */}
          {lmdiCount > 0 && (
            <div className="flex-shrink-0 px-3 py-1.5 bg-warning-surface rounded-lg border border-warning-token text-xs text-warning-token">
              {t('lmdiNotice', { n: lmdiCount })}
            </div>
          )}

          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left">{t('channel')}</th>
                  <th className="slide-th slide-th-center">{t('method')}</th>
                  <th className="slide-th slide-th-right">{t('volDelta')}</th>
                  <th className="slide-th slide-th-right">{t('convDelta')}</th>
                  <th className="slide-th slide-th-right">{t('priceDelta')}</th>
                  <th className="slide-th slide-th-right">{t('residual')}</th>
                  <th className="slide-th slide-th-right">{t('actualDelta')}</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((row, i) => (
                  <ChannelRow key={row.channel} row={row} index={i} t={t} />
                ))}
              </tbody>
            </table>
          </div>

          {/* 图例说明 */}
          <div className="flex-shrink-0 flex gap-4 text-xs text-muted-token px-1">
            <span>
              <span className="inline-block w-2 h-2 rounded-sm bg-accent-surface mr-1" />
              {t('legendLasp')}
            </span>
            <span>
              <span className="inline-block w-2 h-2 rounded-sm bg-warning-surface mr-1" />
              {t('legendLmdi')}
            </span>
          </div>
        </div>
      )}
    </SlideShell>
  );
}
