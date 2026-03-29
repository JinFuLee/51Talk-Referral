'use client';

import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ChannelFunnel, SlideProps } from '@/lib/presentation/types';

export function LeadAttributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const { data, isLoading, error, mutate } = useFilteredSWR<ChannelFunnel[]>('/api/channel');
  const channels = data ?? [];

  // 一句话结论：总注册 & 付费
  const insight = (() => {
    if (!channels.length) return undefined;
    const totalReg = channels.reduce((s, c) => s + (c.registrations ?? 0), 0);
    const totalPaid = channels.reduce((s, c) => s + (c.payments ?? 0), 0);
    // 付费最多的渠道
    const topPaid = channels.reduce((a, b) => ((a.payments ?? 0) > (b.payments ?? 0) ? a : b));
    return `合计 ${totalReg.toLocaleString()} 注册，${totalPaid.toLocaleString()} 付费；付费最多：${topPaid.channel} ${(topPaid.payments ?? 0).toLocaleString()} 人`;
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="各渠道学员漏斗"
      subtitle="CC窄 / SS窄 / LP窄 / 宽口 × 注册 → 预约 → 出席 → 付费"
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
          <p className="text-base font-medium">暂无渠道漏斗数据</p>
          <p className="text-sm">请上传本月 Excel 数据源后自动刷新</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left">渠道</th>
                <th className="slide-th slide-th-left">注册数</th>
                <th className="slide-th slide-th-left">预约数</th>
                <th className="slide-th slide-th-left">出席数</th>
                <th className="slide-th slide-th-left">付费数</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => (
                <tr key={c.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="px-2 py-1 text-xs font-semibold text-[var(--text-primary)]">
                    {c.channel}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {(c.registrations ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {(c.appointments ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {(c.attendance ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                    {(c.payments ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="slide-tfoot-row">
                <td className="px-2 py-1 text-xs">合计</td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.registrations ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.appointments ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.attendance ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.payments ?? 0), 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
