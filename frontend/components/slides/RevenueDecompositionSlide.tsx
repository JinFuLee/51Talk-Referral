'use client';

import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRate, formatRevenue } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { SlideProps } from '@/lib/presentation/types';

// 对齐 /api/channel 真实返回
interface ChannelRow {
  channel: string;
  registrations: number | null;
  appointments: number | null;
  attendance: number | null;
  payments: number | null;
  revenue_usd: number | null;
  share_pct: number | null;
}

export function RevenueDecompositionSlide({ slideNumber, totalSlides }: SlideProps) {
  const t = useTranslations('RevenueDecompositionSlide');

  const { data, isLoading, error, mutate } = useFilteredSWR<ChannelRow[]>('/api/channel');
  const channels = data ?? [];

  const totalRevenue = channels.reduce((s, c) => s + (c.revenue_usd ?? 0), 0);

  // 一句话结论：总业绩 & 最大渠道
  const insight = (() => {
    if (!channels.length) return undefined;
    const top = channels.reduce((a, b) => ((a.revenue_usd ?? 0) > (b.revenue_usd ?? 0) ? a : b));
    const topShare = top.share_pct !== null ? Math.round(top.share_pct * 100) : null;
    return t('insight', {
      topChannel: top.channel,
      topRevenue: formatRevenue(top.revenue_usd ?? 0),
      topShare: topShare ?? 0,
      total: formatRevenue(totalRevenue),
    });
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
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-token">{t('no_data')}</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left">{t('col_channel')}</th>
                <th className="slide-th slide-th-left">{t('col_registrations')}</th>
                <th className="slide-th slide-th-left">{t('col_payments')}</th>
                <th className="slide-th slide-th-left">{t('col_revenue')}</th>
                <th className="slide-th slide-th-left">{t('col_share_pct')}</th>
                <th className="slide-th slide-th-left">{t('col_share_bar')}</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => {
                const rev = c.revenue_usd ?? 0;
                const share = c.share_pct ?? 0;
                return (
                  <tr key={c.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="px-3 py-1.5 text-xs font-semibold text-primary-token">
                      {c.channel}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums text-secondary-token">
                      {(c.registrations ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums text-secondary-token">
                      {(c.payments ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums font-medium text-primary-token">
                      {formatRevenue(rev)}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums text-secondary-token">
                      {formatRate(share)}
                    </td>
                    <td className="px-3 py-1.5 w-28">
                      <div className="w-full bg-subtle rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${Math.min(100, share * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="slide-tfoot-row">
                <td className="px-3 py-1.5 text-xs">{t('col_total')}</td>
                <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.registrations ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.payments ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums">
                  {formatRevenue(totalRevenue)}
                </td>
                <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums">100%</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
