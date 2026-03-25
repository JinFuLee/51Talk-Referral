'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { Spinner } from '@/components/ui/Spinner';
import type { ScenarioResult } from '@/lib/types/funnel';
import type { SlideProps } from '@/lib/presentation/types';

export function ScenarioAnalysisSlide({ slideNumber, totalSlides }: SlideProps) {
  const { data, isLoading, error } = useSWR<ScenarioResult>('/api/funnel/scenario', swrFetcher);

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="漏斗场景推演"
      subtitle="提升各环节转化率的预期影响"
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
      ) : !data ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-[var(--text-muted)]">
          <p className="text-lg font-medium">暂无场景推演数据</p>
          <p className="text-sm">请确认 /api/funnel/scenario?stage= 已返回数据</p>
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
            <div className="bg-navy-50 rounded-lg p-4">
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
