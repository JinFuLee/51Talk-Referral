'use client';

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
    if (!below.length) return `全部 ${chartData.length} 个转化率均超目标，漏斗效率健康`;
    const worst = below.reduce((a, b) => (a.gap < b.gap ? a : b));
    const worstGap = Math.abs(worst.gap * 100).toFixed(1);
    return `${below.length} 个环节低于目标；最弱：${worst.name} ${worst.actual}%，差 ${worstGap}pp${above.length ? `；${above.length} 个超目标` : ''}`;
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="转化率 × 月达成"
      subtitle="各环节实际转化率 vs 目标"
      section="漏斗分析"
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
            <p className="text-base font-semibold text-red-600">数据加载失败</p>
            <p className="text-sm text-[var(--text-muted)]">请检查后端服务是否正常运行</p>
            <button
              onClick={() => mutate()}
              className="mt-1 px-4 py-1.5 rounded-lg text-sm border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-[var(--text-muted)]">暂无漏斗数据，请上传本月 Excel 数据源</p>
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
              name="实际转化率"
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
