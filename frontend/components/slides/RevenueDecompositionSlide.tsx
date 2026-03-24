'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate, formatRevenue } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { Spinner } from '@/components/ui/Spinner';
import type { SlideProps } from '@/lib/presentation/types';

// 对齐 /api/channel 真实返回
interface ChannelRow {
  channel: string;
  registrations: number | null;
  appointments: number | null;
  attendance: number | null;
  payments: number | null;
  revenue_usd: number | null;
  share_pct: number | null;
}

export function RevenueDecompositionSlide({ slideNumber, totalSlides }: SlideProps) {
  const { data, isLoading, error } = useSWR<ChannelRow[]>('/api/channel', swrFetcher);
  const channels = data ?? [];

  const totalRevenue = channels.reduce((s, c) => s + (c.revenue_usd ?? 0), 0);

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="渠道业绩拆解"
      subtitle="各渠道注册 → 付费 → 金额 → 占比"
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
        <div className="flex items-center justify-center h-full">
          <p className="text-[var(--text-muted)]">暂无渠道业绩数据</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left">渠道</th>
                <th className="slide-th slide-th-left">注册数</th>
                <th className="slide-th slide-th-left">付费数</th>
                <th className="slide-th slide-th-left">付费金额</th>
                <th className="slide-th slide-th-left">金额占比</th>
                <th className="slide-th slide-th-left">占比</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => {
                const rev = c.revenue_usd ?? 0;
                const share = c.share_pct ?? 0;
                return (
                  <tr key={c.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]">
                      {c.channel}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {(c.registrations ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {(c.payments ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums font-medium text-[var(--text-primary)]">
                      {formatRevenue(rev)}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {formatRate(share)}
                    </td>
                    <td className="px-3 py-1.5 w-28">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${Math.min(100, share * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="slide-tfoot-row">
                <td className="px-3 py-1.5 text-xs">合计</td>
                <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.registrations ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.payments ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums">
                  {formatRevenue(totalRevenue)}
                </td>
                <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums">100%</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
