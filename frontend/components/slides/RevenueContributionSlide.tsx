'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { Spinner } from '@/components/ui/Spinner';

interface ChannelAttribution {
  channel: string;
  revenue: number;
  share: number;
  per_capita: number;
}

export function RevenueContributionSlide({
  slideNumber,
  totalSlides,
}: {
  slideNumber: number;
  totalSlides: number;
}) {
  const { data, isLoading, error } = useSWR<ChannelAttribution[]>(
    '/api/channel/attribution',
    swrFetcher
  );
  const channels = data ?? [];
  const totalAmount = channels.reduce((s, c) => s + c.revenue, 0);

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="渠道业绩贡献"
      subtitle="各渠道注册数 / 付费金额 / 占比"
      section="渠道分析"
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
      ) : channels.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-[var(--text-muted)]">
          <p className="text-lg font-medium">暂无渠道归因数据</p>
          <p className="text-sm">请确认 /api/channel/attribution 已返回数据</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[var(--n-800)] text-white text-xs font-medium">
                <th className="text-left px-2 py-1.5">渠道</th>
                <th className="text-right px-2 py-1.5">付费金额</th>
                <th className="text-right px-2 py-1.5">金额占比</th>
                <th className="text-right px-2 py-1.5">人均金额</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => (
                <tr
                  key={c.channel}
                  className={i % 2 === 0 ? 'bg-[var(--bg-surface)]' : 'bg-slate-50/50'}
                >
                  <td className="px-2 py-1 text-xs font-semibold text-[var(--text-primary)]">
                    {c.channel}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-medium text-[var(--text-primary)]">
                    {formatRevenue(c.revenue)}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
                    {formatRate(c.share)}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-blue-700 font-semibold">
                    {formatRevenue(c.per_capita)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-100 font-bold text-[var(--text-primary)]">
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
