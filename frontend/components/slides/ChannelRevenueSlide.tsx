'use client';

import { useTranslations } from 'next-intl';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ChannelAttribution, SlideProps } from '@/lib/presentation/types';
import { CHART_PALETTE } from '@/lib/chart-palette';
const COLORS = CHART_PALETTE.series;

export function ChannelRevenueSlide({ slideNumber, totalSlides }: SlideProps) {
  const t = useTranslations('ChannelRevenueSlide');

  const { data, isLoading, error, mutate } = useFilteredSWR<ChannelAttribution[]>(
    '/api/channel/attribution'
  );
  const channels = data ?? [];
  const totalAmount = channels.reduce((s, c) => s + (c.revenue ?? 0), 0);

  const pieData = channels.map((c) => ({
    name: c.channel,
    value: c.revenue,
  }));

  // 一句话结论
  const insight = (() => {
    if (!channels.length) return undefined;
    const top = channels.reduce((a, b) => (a.revenue > b.revenue ? a : b));
    const topShare = Math.round(top.share * 100);
    return t('insight', { topChannel: top.channel, topShare, total: formatRevenue(totalAmount) });
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title={t('title')}
      subtitle={t('subtitle')}
      section={t('section')}
      knowledgeChapter="chapter-1"
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
        <div className="flex gap-8 h-full items-center">
          {/* Pie Chart */}
          <div className="flex-shrink-0 w-72 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  animationDuration={600}
                  animationEasing="ease-out"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatRevenue(value), t('tooltip_label')]}
                  contentStyle={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md, 10px)',
                    boxShadow: 'var(--shadow-medium)',
                    fontSize: '12px',
                  }}
                  cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
                />
                <Legend wrapperStyle={{ paddingTop: 12 }} iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left">{t('col_channel')}</th>
                  <th className="slide-th slide-th-left">{t('col_per_capita')}</th>
                  <th className="slide-th slide-th-left">{t('col_total')}</th>
                  <th className="slide-th slide-th-left">{t('col_share')}</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c, i) => (
                  <tr key={c.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="px-2 py-1 text-xs font-semibold text-primary-token flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                      {c.channel}
                    </td>
                    <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-action-accent font-semibold">
                      {formatRevenue(c.per_capita ?? 0)}
                    </td>
                    <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-medium text-primary-token">
                      {formatRevenue(c.revenue)}
                    </td>
                    <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-muted-token">
                      {formatRate(c.share)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="slide-tfoot-row">
                  <td className="px-2 py-1 text-xs">{t('col_grand_total')}</td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-muted-token">
                    —
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-medium text-primary-token">
                    {formatRevenue(totalAmount)}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-muted-token">
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </SlideShell>
  );
}
