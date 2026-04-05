'use client';

import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ChannelFunnel, SlideProps } from '@/lib/presentation/types';

export function LeadAttributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const t = useTranslations('LeadAttributionSlide');

  const { data, isLoading, error, mutate } = useFilteredSWR<ChannelFunnel[]>('/api/channel');
  const channels = data ?? [];

  // 一句话结论：总注册 & 付费
  const insight = (() => {
    if (!channels.length) return undefined;
    const totalReg = channels.reduce((s, c) => s + (c.registrations ?? 0), 0);
    const totalPaid = channels.reduce((s, c) => s + (c.payments ?? 0), 0);
    const topPaid = channels.reduce((a, b) => ((a.payments ?? 0) > (b.payments ?? 0) ? a : b));
    return t('insight', { totalReg: totalReg.toLocaleString(), totalPaid: totalPaid.toLocaleString(), topChannel: topPaid.channel, topPaid: (topPaid.payments ?? 0).toLocaleString() });
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
                <th className="slide-th slide-th-left">{t('col_reg')}</th>
                <th className="slide-th slide-th-left">{t('col_appt')}</th>
                <th className="slide-th slide-th-left">{t('col_attend')}</th>
                <th className="slide-th slide-th-left">{t('col_paid')}</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => (
                <tr key={c.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="px-2 py-1 text-xs font-semibold text-primary-token">
                    {c.channel}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-secondary-token">
                    {(c.registrations ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-secondary-token">
                    {(c.appointments ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-secondary-token">
                    {(c.attendance ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-semibold text-primary-token">
                    {(c.payments ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="slide-tfoot-row">
                <td className="px-2 py-1 text-xs">{t('total')}</td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.registrations ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.appointments ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.attendance ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.payments ?? 0), 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
