'use client';

import useSWR from 'swr';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { swrFetcher } from '@/lib/api';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { Spinner } from '@/components/ui/Spinner';
import type { ChannelAttribution, SlideProps } from '@/lib/presentation/types';
import { CHART_PALETTE } from '@/lib/chart-palette';

const COLORS = CHART_PALETTE.series;

export function ChannelRevenueSlide({ slideNumber, totalSlides }: SlideProps) {
  const { data, isLoading, error } = useSWR<ChannelAttribution[]>(
    '/api/channel/attribution',
    swrFetcher
  );
  const channels = data ?? [];
  const totalAmount = channels.reduce((s, c) => s + c.revenue, 0);

  const pieData = channels.map((c) => ({
    name: c.channel,
    value: c.revenue,
  }));

  // 一句话结论
  const insight = (() => {
    if (!channels.length) return undefined;
    const top = channels.reduce((a, b) => (a.revenue > b.revenue ? a : b));
    const topShare = Math.round(top.share * 100);
    return `${top.channel} 贡献最大（${topShare}%），总业绩 ${formatRevenue(totalAmount)}`;
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="渠道金额贡献图"
      subtitle="各渠道人均金额 / 总金额 / 占比"
      section="渠道分析"
      insight={insight}
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
          <p className="text-lg font-medium">暂无渠道金额数据</p>
          <p className="text-sm">请确认 /api/channel/attribution 已返回数据</p>
        </div>
      ) : (
        <div className="flex gap-8 h-full items-center">
          {/* Pie Chart */}
          <div className="flex-shrink-0 w-72 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [formatRevenue(value), '金额']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left">渠道</th>
                  <th className="slide-th slide-th-left">人均金额</th>
                  <th className="slide-th slide-th-left">总金额</th>
                  <th className="slide-th slide-th-left">占比</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c, i) => (
                  <tr key={c.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="px-2 py-1 text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                      {c.channel}
                    </td>
                    <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-action-accent font-semibold">
                      {formatRevenue(c.per_capita ?? 0)}
                    </td>
                    <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-medium text-[var(--text-primary)]">
                      {formatRevenue(c.revenue)}
                    </td>
                    <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
                      {formatRate(c.share)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="slide-tfoot-row">
                  <td className="px-2 py-1 text-xs">合计</td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
                    —
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-medium text-[var(--text-primary)]">
                    {formatRevenue(totalAmount)}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </SlideShell>
  );
}
