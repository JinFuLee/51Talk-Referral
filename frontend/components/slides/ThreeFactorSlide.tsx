'use client';

import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ChannelFactor, SlideProps } from '@/lib/presentation/types';

function GapBadge({ gap }: { gap: number }) {
  const isPositive = gap >= 0;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
        isPositive
          ? 'text-success-token bg-success-surface'
          : gap >= -5
            ? 'text-warning-token bg-warning-surface'
            : 'text-danger-token bg-danger-surface'
      }`}
    >
      {isPositive ? '+' : ''}
      {gap}
    </span>
  );
}

function FactorBadge({ value }: { value: number }) {
  const color =
    value >= 1
      ? 'text-success-token bg-success-surface'
      : value >= 0.9
        ? 'text-warning-token bg-warning-surface'
        : 'text-danger-token bg-danger-surface';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
      {formatRate(value)}
    </span>
  );
}

export function ThreeFactorSlide({ slideNumber, totalSlides }: SlideProps) {
  const t = useTranslations('ThreeFactorSlide');

  const { data, isLoading, error, mutate } = useFilteredSWR<ChannelFactor[]>(
    '/api/channel/three-factor'
  );
  const channels = data ?? [];

  // 一句话结论：找三因素最弱渠道
  const insight = (() => {
    if (!channels.length) return undefined;
    const scored = channels.map((c) => ({
      channel: c.channel,
      avg: ((c.appt_factor ?? 0) + (c.show_factor ?? 0) + (c.pay_factor ?? 0)) / 3,
    }));
    const worst = scored.reduce((a, b) => (a.avg < b.avg ? a : b));
    const best = scored.reduce((a, b) => (a.avg > b.avg ? a : b));
    const worstAvg = (worst.avg * 100).toFixed(0);
    if (worst.channel === best.channel) {
      return t('insight_single', { channel: worst.channel, worstAvg });
    }
    return t('insight_multi', {
      worst: worst.channel,
      worstAvg,
      warn: worst.avg < 0.9 ? ' ⚠' : '',
      best: best.channel,
      bestAvg: (best.avg * 100).toFixed(0),
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
        <div className="flex flex-col justify-center items-center h-full gap-3 text-muted-token">
          <p className="text-base font-medium">{t('no_data')}</p>
          <p className="text-sm">{t('no_data_hint')}</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left" rowSpan={2}>
                  {t('col_channel')}
                </th>
                <th className="slide-th slide-th-center" colSpan={3}>
                  {t('col_volume')}
                </th>
                <th className="slide-th slide-th-center" colSpan={3}>
                  {t('col_three_factor')}
                </th>
              </tr>
              <tr className="slide-thead-row">
                <th className="slide-th-sub slide-th-right">{t('col_expected')}</th>
                <th className="slide-th-sub slide-th-right">{t('col_actual')}</th>
                <th className="slide-th-sub slide-th-right">{t('col_gap')}</th>
                <th className="slide-th-sub slide-th-right">{t('col_appt')}</th>
                <th className="slide-th-sub slide-th-right">{t('col_show')}</th>
                <th className="slide-th-sub slide-th-right">{t('col_pay')}</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => (
                <tr key={c.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="slide-td font-semibold text-primary-token">{c.channel}</td>
                  <td className="slide-td text-right font-mono tabular-nums text-secondary-token">
                    {(c.expected_volume ?? 0).toLocaleString()}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums font-medium text-primary-token">
                    {(c.actual_volume ?? 0).toLocaleString()}
                  </td>
                  <td className="slide-td text-right">
                    <GapBadge gap={c.gap ?? 0} />
                  </td>
                  <td className="slide-td text-right">
                    <FactorBadge value={c.appt_factor ?? 0} />
                  </td>
                  <td className="slide-td text-right">
                    <FactorBadge value={c.show_factor ?? 0} />
                  </td>
                  <td className="slide-td text-right">
                    <FactorBadge value={c.pay_factor ?? 0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 px-4 text-xs text-muted-token">{t('footnote')}</p>
        </div>
      )}
    </SlideShell>
  );
}
