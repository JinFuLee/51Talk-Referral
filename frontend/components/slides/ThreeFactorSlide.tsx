'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
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
      {formatRate(value)}
    </span>
  );
}

export function ThreeFactorSlide({ slideNumber, totalSlides }: SlideProps) {
  const { data, isLoading, error, mutate } = useSWR<ChannelFactor[]>(
    '/api/channel/three-factor',
    swrFetcher
  );
  const channels = data ?? [];

  // 一句话结论：找三因素最弱渠道
  const insight = (() => {
    if (!channels.length) return undefined;
    // 三因素平均值最低的渠道
    const scored = channels.map((c) => ({
      channel: c.channel,
      avg: ((c.appt_factor ?? 0) + (c.show_factor ?? 0) + (c.pay_factor ?? 0)) / 3,
    }));
    const worst = scored.reduce((a, b) => (a.avg < b.avg ? a : b));
    const best = scored.reduce((a, b) => (a.avg > b.avg ? a : b));
    const worstAvg = (worst.avg * 100).toFixed(0);
    if (worst.channel === best.channel) {
      return `${worst.channel} 三因素平均 ${worstAvg}%`;
    }
    return `三因素最弱：${worst.channel} ${worstAvg}%${worst.avg < 0.9 ? ' ⚠' : ''}，最强：${best.channel} ${(best.avg * 100).toFixed(0)}%`;
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="渠道三因素对标"
      subtitle="各渠道 × 预期 / 实际 / 差距 × 预约因子 / 出席因子 / 付费因子"
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
            <button onClick={() => mutate()} className="mt-1 px-4 py-1.5 rounded-lg text-sm border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors">重试</button>
          </div>
        </div>
      ) : channels.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-[var(--text-muted)]">
          <p className="text-base font-medium">暂无三因素数据</p>
          <p className="text-sm">请上传本月 Excel 数据源后自动刷新</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left" rowSpan={2}>
                  渠道
                </th>
                <th className="slide-th slide-th-center" colSpan={3}>
                  单量
                </th>
                <th className="slide-th slide-th-center" colSpan={3}>
                  三因素
                </th>
              </tr>
              <tr className="slide-thead-row">
                <th className="slide-th-sub slide-th-right">预期</th>
                <th className="slide-th-sub slide-th-right">实际</th>
                <th className="slide-th-sub slide-th-right">差距</th>
                <th className="slide-th-sub slide-th-right">预约</th>
                <th className="slide-th-sub slide-th-right">出席</th>
                <th className="slide-th-sub slide-th-right">付费</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => (
                <tr key={c.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="slide-td font-semibold text-[var(--text-primary)]">{c.channel}</td>
                  <td className="slide-td text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {(c.expected_volume ?? 0).toLocaleString()}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums font-medium text-[var(--text-primary)]">
                    {(c.actual_volume ?? 0).toLocaleString()}
                  </td>
                  <td className="slide-td text-right">
                    <GapBadge gap={c.gap ?? 0} />
                  </td>
                  <td className="slide-td text-right">
                    <FactorBadge value={c.appt_factor ?? 0} />
                  </td>
                  <td className="slide-td text-right">
                    <FactorBadge value={c.show_factor ?? 0} />
                  </td>
                  <td className="slide-td text-right">
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
