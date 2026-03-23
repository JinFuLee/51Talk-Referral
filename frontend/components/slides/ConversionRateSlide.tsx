'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { Spinner } from '@/components/ui/Spinner';
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
  const { data, isLoading, error } = useSWR<FunnelResult>('/api/funnel', swrFetcher);
  const stages = data?.stages ?? [];

  const chartData = stages
    .filter((s) => s.conversion_rate !== undefined)
    .map((s) => ({
      name: s.name,
      actual: Number(((s.conversion_rate ?? 0) * 100).toFixed(1)),
      target: Number(((s.target_rate ?? 0) * 100).toFixed(1)),
      gap: s.rate_gap ?? 0,
    }));

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="转化率 × 月达成"
      subtitle="各环节实际转化率 vs 目标"
      section="漏斗分析"
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-lg font-semibold text-red-600">数据加载失败</p>
            <p className="text-sm text-[var(--text-muted)] mt-2">请检查后端服务是否正常运行</p>
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-[var(--text-muted)]">暂无漏斗数据</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 14 }} />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Bar dataKey="actual" name="实际转化率" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.gap >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </SlideShell>
  );
}
