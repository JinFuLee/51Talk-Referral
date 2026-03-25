'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ScenarioResult } from '@/lib/types/funnel';
import type { SlideProps } from '@/lib/presentation/types';

export function ScenarioAnalysisSlide({ slideNumber, totalSlides }: SlideProps) {
  const { data, isLoading, error, mutate } = useSWR<ScenarioResult>('/api/funnel/scenario', swrFetcher);

  // 一句话结论
  const insight = (() => {
    if (!data) return undefined;
    const revUp =
      data.impact_revenue > 0 ? `业绩可提升 +$${data.impact_revenue.toLocaleString()}` : null;
    const paidUp = data.impact_payments > 0 ? `付费 +${data.impact_payments}` : null;
    const parts = [paidUp, revUp].filter(Boolean);
    return parts.length
      ? `优化场景：${parts.join('，')}（转化率 ${formatRate(data.current_rate)} → ${formatRate(data.scenario_rate)}）`
      : undefined;
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="漏斗场景推演"
      subtitle="提升各环节转化率的预期影响"
      section="漏斗分析"
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
            <button onClick={() => mutate()} className="mt-1 px-4 py-1.5 rounded-lg text-sm border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors">重试</button>
          </div>
        </div>
      ) : !data ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-[var(--text-muted)]">
          <p className="text-base font-medium">暂无场景推演数据</p>
          <p className="text-sm">请上传本月 Excel 数据源后自动刷新</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-[var(--text-muted)] mb-1">当前转化率</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {formatRate(data.current_rate)}
              </p>
            </div>
            <div className="bg-action-accent-surface rounded-lg p-4">
              <p className="text-xs text-[var(--text-muted)] mb-1">场景转化率</p>
              <p className="text-2xl font-bold text-action-accent">
                {formatRate(data.scenario_rate)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-[var(--text-muted)] mb-1">影响注册数</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                +{data.impact_registrations.toLocaleString()}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-[var(--text-muted)] mb-1">影响付费数</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                +{data.impact_payments.toLocaleString()}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-[var(--text-muted)] mb-1">影响业绩</p>
              <p className="text-lg font-bold text-green-600">
                +${data.impact_revenue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </SlideShell>
  );
}
