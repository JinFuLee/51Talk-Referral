'use client';

import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ChannelAttribution, SlideProps } from '@/lib/presentation/types';

export function NetAttributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const { data, isLoading, error, mutate } = useFilteredSWR<ChannelAttribution[]>(
    '/api/channel/attribution'
  );
  const channels = data ?? [];

  // 一句话结论：人均业绩最高渠道
  const insight = (() => {
    if (!channels.length) return undefined;
    const withCap = channels.filter((c) => (c.per_capita ?? 0) > 0);
    if (!withCap.length) return undefined;
    const top = withCap.reduce((a, b) => ((a.per_capita ?? 0) > (b.per_capita ?? 0) ? a : b));
    const low = withCap.reduce((a, b) => ((a.per_capita ?? 0) < (b.per_capita ?? 0) ? a : b));
    return `人均最高：${top.channel} ${formatRevenue(top.per_capita ?? 0)}，人均最低：${low.channel} ${formatRevenue(low.per_capita ?? 0)}`;
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="净业绩拆解"
      subtitle="各渠道人均业绩 / 注册均价"
      section="渠道分析"
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
      ) : channels.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-[var(--text-muted)]">
          <p className="text-base font-medium">暂无净业绩归因数据</p>
          <p className="text-sm">请上传本月 Excel 数据源后自动刷新</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left">渠道</th>
                <th className="slide-th slide-th-left">总业绩</th>
                <th className="slide-th slide-th-left">金额占比</th>
                <th className="slide-th slide-th-left">人均业绩</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => (
                <tr key={c.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="px-2 py-1 text-xs font-semibold text-[var(--text-primary)]">
                    {c.channel}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-medium text-[var(--text-primary)]">
                    {formatRevenue(c.revenue)}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
                    {formatRate(c.share)}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-semibold text-action-accent">
                    {formatRevenue(c.per_capita)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 px-4 text-xs text-[var(--text-muted)]">
            人均业绩 = 总业绩 ÷ 付费人数（由后端计算）
          </p>
        </div>
      )}
    </SlideShell>
  );
}
