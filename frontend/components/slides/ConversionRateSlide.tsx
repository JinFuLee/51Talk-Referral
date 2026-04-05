'use client';

import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { FunnelResult } from '@/lib/types/funnel';
import type { SlideProps } from '@/lib/presentation/types';

export function ConversionRateSlide({ slideNumber, totalSlides }: SlideProps) {
  const t = useTranslations('ConversionRateSlide');

  const { data, isLoading, error, mutate } = useFilteredSWR<FunnelResult>('/api/funnel');
  const stages = data?.stages ?? [];

  // 只取名称含"率"的 stage（注册预约率/预约出席率/出席付费率）
  // actual = 实际转化率（0-1），target = 目标转化率（0-1），gap = actual - target
  const chartData = stages
    .filter((s) => s.name.includes('率'))
    .map((s) => ({
      name: s.name,
      actual: Number(((s.actual ?? 0) * 100).toFixed(1)),
      target: Number(((s.target ?? 0) * 100).toFixed(1)),
      gap: (s.actual ?? 0) - (s.target ?? 0),
    }));

  // 一句话结论
  const insight = (() => {
    if (!chartData.length) return undefined;
    const below = chartData.filter((d) => d.gap < 0);
    const above = chartData.filter((d) => d.gap >= 0);
    if (!below.length) return t('insight_all_above', { n: chartData.length });
    const worst = below.reduce((a, b) => (a.gap < b.gap ? a : b));
    const worstGap = Math.abs(worst.gap * 100).toFixed(1);
    return t('insight_below', { belowN: below.length, worstName: worst.name, worstActual: worst.actual, worstGapStr: worstGap, aboveN: above.length });
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title={t('title')}
      subtitle={t('subtitle')}
      section={t('section')}
      knowledgeChapter="chapter-8"
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
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-token">{t('no_data')}</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 14 }} />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v: number) => `${v}%`}
              contentStyle={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md, 10px)',
                boxShadow: 'var(--shadow-medium)',
                fontSize: '12px',
              }}
              cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
            />
            <Bar
              dataKey="actual"
              name={t('bar_label')}
              radius={[6, 6, 0, 0]}
              animationDuration={600}
              animationEasing="ease-out"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.gap >= 0 ? 'var(--chart-4-hex)' : 'var(--chart-5-hex)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </SlideShell>
  );
}
