'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ChannelAttribution, SlideProps } from '@/lib/presentation/types';

export function RevenueContributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const { data, isLoading, error, mutate } = useSWR<ChannelAttribution[]>(
    '/api/channel/attribution',
    swrFetcher
  );
  const channels = data ?? [];
  const totalAmount = channels.reduce((s, c) => s + c.revenue, 0);

  // 一句话结论：最大贡献渠道
  const insight = (() => {
    if (!channels.length) return undefined;
    const top = channels.reduce((a, b) => (a.revenue > b.revenue ? a : b));
    const topShare = Math.round(top.share * 100);
    return `最大贡献：${top.channel} 占 ${topShare}%（${formatRevenue(top.revenue)}），合计 ${formatRevenue(totalAmount)}`;
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="渠道业绩贡献"
      subtitle="各渠道注册数 / 付费金额 / 占比"
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
          <p className="text-base font-medium">暂无渠道归因数据</p>
          <p className="text-sm">请上传本月 Excel 数据源后自动刷新</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left">渠道</th>
                <th className="slide-th slide-th-left">付费金额</th>
                <th className="slide-th slide-th-left">金额占比</th>
                <th className="slide-th slide-th-left">人均金额</th>
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
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-action-accent font-semibold">
                    {formatRevenue(c.per_capita)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="slide-tfoot-row">
                <td className="px-2 py-1 text-xs">合计</td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                  {formatRevenue(totalAmount)}
                </td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
                  100%
                </td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
                  —
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
