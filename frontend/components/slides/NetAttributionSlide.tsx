'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { Spinner } from '@/components/ui/Spinner';
import type { ChannelAttribution, SlideProps } from '@/lib/presentation/types';

export function NetAttributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const { data, isLoading, error } = useSWR<ChannelAttribution[]>(
    '/api/channel/attribution',
    swrFetcher
  );
  const channels = data ?? [];

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="净业绩拆解"
      subtitle="各渠道人均业绩 / 注册均价"
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
          <p className="text-lg font-medium">暂无净业绩归因数据</p>
          <p className="text-sm">请确认 /api/channel/attribution 已返回数据</p>
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
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-semibold text-navy-500">
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
