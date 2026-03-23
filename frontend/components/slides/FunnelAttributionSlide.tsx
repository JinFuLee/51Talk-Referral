'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate } from '@/lib/utils';
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

export function FunnelAttributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const { data, isLoading, error } = useSWR<ChannelRow[]>('/api/channel', swrFetcher);
  const channels = data ?? [];

  // 从真实数据计算转化率
  const rows = channels.map((c) => {
    const reg = c.registrations ?? 0;
    const appt = c.appointments ?? 0;
    const attend = c.attendance ?? 0;
    const paid = c.payments ?? 0;
    return {
      channel: c.channel,
      appt_rate: reg > 0 ? appt / reg : 0,
      attend_rate: appt > 0 ? attend / appt : 0,
      paid_rate: attend > 0 ? paid / attend : 0,
    };
  });

  function RateBadge({ value }: { value: number }) {
    const color =
      value >= 0.5
        ? 'text-green-700 bg-green-50'
        : value >= 0.3
          ? 'text-yellow-700 bg-yellow-50'
          : value > 0
            ? 'text-red-700 bg-red-50'
            : 'text-slate-400 bg-slate-50';
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${color}`}>
        {value > 0 ? formatRate(value) : '-'}
      </span>
    );
  }

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="过程转化率拆解"
      subtitle="各渠道 × 预约率 / 出席率 / 付费率（从实际数据计算）"
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
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-[var(--text-muted)]">暂无渠道数据</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr
                className="text-white text-xs font-medium"
                style={{ backgroundColor: 'var(--n-800)' }}
              >
                <th className="text-left px-3 py-2">渠道</th>
                <th className="text-right px-3 py-2">注册数</th>
                <th className="text-right px-3 py-2">预约率</th>
                <th className="text-right px-3 py-2">出席率</th>
                <th className="text-right px-3 py-2">付费率</th>
                <th className="text-right px-3 py-2">付费数</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const c = channels[i];
                return (
                  <tr
                    key={r.channel}
                    className={i % 2 === 0 ? 'bg-[var(--bg-surface)]' : 'bg-slate-50/50'}
                  >
                    <td className="px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]">
                      {r.channel}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums">
                      {(c.registrations ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right">
                      <RateBadge value={r.appt_rate} />
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right">
                      <RateBadge value={r.attend_rate} />
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right">
                      <RateBadge value={r.paid_rate} />
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums font-semibold">
                      {(c.payments ?? 0).toLocaleString()}
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
