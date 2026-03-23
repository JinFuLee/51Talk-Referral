'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { SlideShell } from '@/components/presentation/SlideShell';
import { Spinner } from '@/components/ui/Spinner';
import type { ChannelFactor, SlideProps } from '@/lib/presentation/types';

function GapBadge({ gap }: { gap: number }) {
  const isPositive = gap >= 0;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
        isPositive
          ? 'text-green-700 bg-green-50'
          : gap >= -5
            ? 'text-yellow-700 bg-yellow-50'
            : 'text-red-700 bg-red-50'
      }`}
    >
      {isPositive ? '+' : ''}
      {gap}
    </span>
  );
}

function FactorBadge({ value }: { value: number }) {
  const color =
    value >= 1
      ? 'text-green-700 bg-green-50'
      : value >= 0.9
        ? 'text-yellow-700 bg-yellow-50'
        : 'text-red-700 bg-red-50';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
      {(value * 100).toFixed(1)}%
    </span>
  );
}

export function ThreeFactorSlide({ slideNumber, totalSlides }: SlideProps) {
  const { data, isLoading, error } = useSWR<ChannelFactor[]>(
    '/api/channel/three-factor',
    swrFetcher
  );
  const channels = data ?? [];

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="渠道三因素对标"
      subtitle="各渠道 × 预期 / 实际 / 差距 × 预约因子 / 出席因子 / 付费因子"
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
          <p className="text-lg font-medium">暂无三因素数据</p>
          <p className="text-sm">请确认 /api/channel/three-factor 已返回数据</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr
                className="text-xs font-medium"
                style={{ backgroundColor: '#28282a', color: 'white' }}
              >
                <th className="text-left px-2 py-1.5" style={{ color: 'white' }} rowSpan={2}>
                  渠道
                </th>
                <th
                  className="text-center px-2 py-1.5 border-b border-white/20"
                  style={{ color: 'white' }}
                  colSpan={3}
                >
                  单量
                </th>
                <th
                  className="text-center px-2 py-1.5 border-b border-white/20"
                  style={{ color: 'white' }}
                  colSpan={3}
                >
                  三因素
                </th>
              </tr>
              <tr
                className="text-xs font-medium"
                style={{ backgroundColor: '#28282a', color: 'rgba(255,255,255,0.8)' }}
              >
                <th className="text-right px-2 py-1.5">预期</th>
                <th className="text-right px-2 py-1.5">实际</th>
                <th className="text-right px-2 py-1.5">差距</th>
                <th className="text-right px-2 py-1.5">预约</th>
                <th className="text-right px-2 py-1.5">出席</th>
                <th className="text-right px-2 py-1.5">付费</th>
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
                    {(c.expected_volume ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-medium text-[var(--text-primary)]">
                    {(c.actual_volume ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                    <GapBadge gap={c.gap ?? 0} />
                  </td>
                  <td className="px-2 py-1 text-xs text-right">
                    <FactorBadge value={c.appt_factor ?? 0} />
                  </td>
                  <td className="px-2 py-1 text-xs text-right">
                    <FactorBadge value={c.show_factor ?? 0} />
                  </td>
                  <td className="px-2 py-1 text-xs text-right">
                    <FactorBadge value={c.pay_factor ?? 0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 px-4 text-xs text-[var(--text-muted)]">
            三因素 = 实际达成率 / 目标达成率。≥100% 超目标，&lt;90% 严重落后
          </p>
        </div>
      )}
    </SlideShell>
  );
}
