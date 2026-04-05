'use client';

import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ChannelAttribution, SlideProps } from '@/lib/presentation/types';

export function RevenueContributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const t = useTranslations('RevenueContributionSlide');

  const { data, isLoading, error, mutate } = useFilteredSWR<ChannelAttribution[]>(
    '/api/channel/attribution'
  );
  const channels = data ?? [];
  const totalAmount = channels.reduce((s, c) => s + (c.revenue ?? 0), 0);

  // 一句话结论：最大贡献渠道
  const insight = (() => {
    if (!channels.length) return undefined;
    const top = channels.reduce((a, b) => (a.revenue > b.revenue ? a : b));
    const topShare = Math.round(top.share * 100);
    return t('insight', { channel: top.channel, share: topShare, rev: formatRevenue(top.revenue), total: formatRevenue(totalAmount) });
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
      ) : channels.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-muted-token">
          <p className="text-base font-medium">{t('no_data')}</p>
          <p className="text-sm">{t('no_data_hint')}</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left">{t('col_channel')}</th>
                <th className="slide-th slide-th-left">{t('col_revenue')}</th>
                <th className="slide-th slide-th-left">{t('col_share')}</th>
                <th className="slide-th slide-th-left">{t('col_per_capita')}</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => (
                <tr key={c.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="px-2 py-1 text-xs font-semibold text-primary-token">
                    {c.channel}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-medium text-primary-token">
                    {formatRevenue(c.revenue)}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-muted-token">
                    {formatRate(c.share)}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-action-accent font-semibold">
                    {formatRevenue(c.per_capita)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="slide-tfoot-row">
                <td className="px-2 py-1 text-xs">{t('total')}</td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                  {formatRevenue(totalAmount)}
                </td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-muted-token">
                  100%
                </td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-muted-token">
                  —
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
