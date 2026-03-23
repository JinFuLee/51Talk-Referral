'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { SlideShell } from '@/components/presentation/SlideShell';
import { Spinner } from '@/components/ui/Spinner';
import type { ChannelFunnel, SlideProps } from '@/lib/presentation/types';

export function LeadAttributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const { data, isLoading, error } = useSWR<ChannelFunnel[]>('/api/channel', swrFetcher);
  const channels = data ?? [];

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="各渠道学员漏斗"
      subtitle="CC窄 / SS窄 / LP窄 / 宽口 × 注册 → 预约 → 出席 → 付费"
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
          <p className="text-lg font-medium">暂无渠道漏斗数据</p>
          <p className="text-sm">
            请确认 /api/channel 已返回 registrations / appointments / attendances / paid_count 字段
          </p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr
                className="text-xs font-medium"
                style={{ backgroundColor: '#28282a', color: 'white' }}
              >
                <th
                  style={{
                    color: '#ffffff',
                    textAlign: 'left',
                    padding: '4px 6px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  渠道
                </th>
                <th
                  style={{
                    color: '#ffffff',
                    textAlign: 'left',
                    padding: '4px 6px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  注册数
                </th>
                <th
                  style={{
                    color: '#ffffff',
                    textAlign: 'left',
                    padding: '4px 6px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  预约数
                </th>
                <th
                  style={{
                    color: '#ffffff',
                    textAlign: 'left',
                    padding: '4px 6px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  出席数
                </th>
                <th
                  style={{
                    color: '#ffffff',
                    textAlign: 'left',
                    padding: '4px 6px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  付费数
                </th>
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
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {c.registrations.toLocaleString()}
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
              <tr className="border-t-2 border-slate-200 bg-slate-100 font-bold text-[var(--text-primary)]">
                <td className="px-2 py-1 text-xs">合计</td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + c.registrations, 0).toLocaleString()}
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
