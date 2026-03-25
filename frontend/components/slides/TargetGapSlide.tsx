'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
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
  const { data, isLoading, error, mutate } = useSWR<FunnelResponse>('/api/funnel', swrFetcher);
  const stages = data?.stages ?? [];

  // 生成一句话结论
  const insight = (() => {
    if (!stages.length) return undefined;
    // 找达成率最低的有目标环节
    const withTarget = stages.filter((s) => (s.target ?? 0) > 0 && s.achievement_rate !== null);
    if (!withTarget.length) return undefined;
    const worst = withTarget.reduce((a, b) =>
      (a.achievement_rate ?? 0) < (b.achievement_rate ?? 0) ? a : b
    );
    const best = withTarget.reduce((a, b) =>
      (a.achievement_rate ?? 0) > (b.achievement_rate ?? 0) ? a : b
    );
    const worstRate = Math.round((worst.achievement_rate ?? 0) * 100);
    const bestRate = Math.round((best.achievement_rate ?? 0) * 100);
    if (worst.name === best.name) {
      return `${worst.name} 达成率 ${worstRate}%${worstRate >= 100 ? '，超额完成' : worstRate >= 80 ? '，接近达标' : '，需重点关注'}`;
    }
    return `最弱环节：${worst.name} ${worstRate}%${worstRate < 80 ? ' ⚠' : ''}，最强：${best.name} ${bestRate}%`;
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="目标差距总览"
      subtitle="各环节目标 vs 实际达成"
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
      ) : stages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-[var(--text-muted)]">暂无漏斗数据，请上传本月 Excel 数据源</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 h-full content-center">
          {stages.map((s) => {
            const actual = s.actual ?? 0;
            const target = s.target ?? 0;
            const gap = s.gap ?? 0;
            const rate = s.achievement_rate ?? 0;
            const isAtRisk = target > 0 && rate < 0.8;
            return (
              <div
                key={s.name}
                className={`flex flex-col gap-2 rounded-[var(--radius-xl)] p-6 ${
                  isAtRisk ? 'bg-red-50 border-2 border-red-300' : 'bg-slate-50'
                }`}
              >
                <p className="text-sm font-medium text-[var(--text-secondary)]">{s.name}</p>
                <div
                  className={`text-3xl font-bold ${
                    isAtRisk ? 'text-red-600' : 'text-[var(--text-primary)]'
                  }`}
                  style={isAtRisk ? undefined : { color: 'var(--brand-p1, var(--text-primary))' }}
                >
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
                      className={`text-sm font-semibold ${rate >= 1 ? 'text-green-600' : rate >= 0.8 ? 'text-yellow-600' : 'text-red-500'}`}
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
