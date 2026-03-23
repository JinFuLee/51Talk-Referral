'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { Spinner } from '@/components/ui/Spinner';
import type { SlideProps } from '@/lib/presentation/types';

interface FunnelStage {
  name: string;
  target: number | null;
  actual: number | null;
  gap: number | null;
  achievement_rate: number | null;
  conversion_rate: number | null;
}

interface FunnelResponse {
  stages: FunnelStage[];
}

const TH: React.CSSProperties = { color: 'white' };

export function FunnelAttributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const { data, isLoading, error } = useSWR<FunnelResponse>('/api/funnel', swrFetcher);
  const stages = data?.stages ?? [];

  // 相邻环节计算转化率
  const rows = stages.map((s, i) => {
    const prev = i > 0 ? (stages[i - 1].actual ?? 0) : 0;
    const curr = s.actual ?? 0;
    const stepRate = prev > 0 ? curr / prev : null;
    return { ...s, stepRate };
  });

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="全漏斗转化链"
      subtitle="注册 → 预约 → 出席 → 付费，逐环节达成 & 转化率"
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
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-[var(--text-muted)]">暂无漏斗数据</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#28282a' }}>
                <th className="text-left px-3 py-2.5 text-xs font-medium" style={TH}>
                  环节
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium" style={TH}>
                  实际
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium" style={TH}>
                  目标
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium" style={TH}>
                  差距
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium" style={TH}>
                  达成率
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium" style={TH}>
                  环节转化率
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const actual = r.actual ?? 0;
                const target = r.target ?? 0;
                const gap = r.gap ?? 0;
                const rate = r.achievement_rate ?? 0;
                const isGood = gap >= 0;
                return (
                  <tr key={r.name} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                      {r.name}
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-mono tabular-nums font-bold text-[var(--text-primary)]">
                      {actual.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {target > 0 ? target.toLocaleString() : '-'}
                    </td>
                    <td
                      className={`px-3 py-2 text-sm text-right font-mono tabular-nums font-bold ${isGood ? 'text-green-600' : 'text-red-500'}`}
                    >
                      {target > 0 ? `${isGood ? '+' : ''}${gap.toLocaleString()}` : '-'}
                    </td>
                    <td
                      className={`px-3 py-2 text-sm text-right font-semibold ${rate >= 1 ? 'text-green-600' : rate >= 0.8 ? 'text-yellow-600' : rate > 0 ? 'text-red-500' : 'text-[var(--text-muted)]'}`}
                    >
                      {rate > 0 ? formatRate(rate) : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-right">
                      {r.stepRate != null ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            r.stepRate >= 0.8
                              ? 'text-green-700 bg-green-50'
                              : r.stepRate >= 0.5
                                ? 'text-yellow-700 bg-yellow-50'
                                : 'text-red-700 bg-red-50'
                          }`}
                        >
                          {formatRate(r.stepRate)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
