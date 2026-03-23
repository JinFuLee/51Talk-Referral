'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { Spinner } from '@/components/ui/Spinner';
import type { SlideProps } from '@/lib/presentation/types';

// 对齐 /api/funnel 真实返回
interface FunnelResponse {
  date: string | null;
  stages: {
    name: string;
    target: number | null;
    actual: number | null;
    gap: number | null;
    achievement_rate: number | null;
    conversion_rate: number | null;
  }[];
  target_revenue: number | null;
  actual_revenue: number | null;
  revenue_gap: number | null;
  revenue_achievement: number | null;
}

export function TargetGapSlide({ slideNumber, totalSlides }: SlideProps) {
  const { data, isLoading, error } = useSWR<FunnelResponse>('/api/funnel', swrFetcher);
  const stages = data?.stages ?? [];

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="目标差距总览"
      subtitle="各环节目标 vs 实际达成"
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
      ) : stages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-[var(--text-muted)]">暂无漏斗数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 h-full content-center">
          {stages.map((s) => {
            const actual = s.actual ?? 0;
            const target = s.target ?? 0;
            const gap = s.gap ?? 0;
            const rate = s.achievement_rate ?? 0;
            return (
              <div
                key={s.name}
                className="flex flex-col gap-2 bg-slate-50 rounded-[var(--radius-xl)] p-6"
              >
                <p className="text-sm font-medium text-[var(--text-secondary)]">{s.name}</p>
                <div className="text-3xl font-bold text-[var(--text-primary)]">
                  {actual.toLocaleString()}
                </div>
                {target > 0 && (
                  <p className="text-sm text-[var(--text-muted)]">目标 {target.toLocaleString()}</p>
                )}
                {target > 0 && (
                  <>
                    <div
                      className={`text-lg font-bold ${gap >= 0 ? 'text-green-600' : 'text-red-500'}`}
                    >
                      {gap >= 0 ? '+' : ''}
                      {gap.toLocaleString()}
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${rate >= 1 ? 'bg-green-500' : rate >= 0.8 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(100, rate * 100)}%` }}
                      />
                    </div>
                    <p
                      className={`text-sm font-semibold ${rate >= 1 ? 'text-green-600' : 'text-red-500'}`}
                    >
                      {formatRate(rate)}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SlideShell>
  );
}
