"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { SlideShell } from "@/components/presentation/SlideShell";
import { Spinner } from "@/components/ui/Spinner";

interface ChannelFactor {
  channel: string;
  expected_orders: number;
  actual_orders: number;
  gap_orders: number;
  appointment_factor: number;
  attendance_factor: number;
  paid_factor: number;
}

interface ThreeFactorResponse {
  channels: ChannelFactor[];
}

function GapBadge({ gap }: { gap: number }) {
  const isPositive = gap >= 0;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
        isPositive
          ? "text-green-700 bg-green-50"
          : gap >= -5
          ? "text-yellow-700 bg-yellow-50"
          : "text-red-700 bg-red-50"
      }`}
    >
      {isPositive ? "+" : ""}
      {gap}
    </span>
  );
}

function FactorBadge({ value }: { value: number }) {
  const color =
    value >= 1
      ? "text-green-700 bg-green-50"
      : value >= 0.9
      ? "text-yellow-700 bg-yellow-50"
      : "text-red-700 bg-red-50";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
      {(value * 100).toFixed(1)}%
    </span>
  );
}

export function ThreeFactorSlide({
  slideNumber,
  totalSlides,
}: {
  slideNumber: number;
  totalSlides: number;
}) {
  const { data, isLoading } = useSWR<ThreeFactorResponse>(
    "/api/channel/three-factor",
    swrFetcher
  );
  const channels = data?.channels ?? [];

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
      ) : channels.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-[var(--text-muted)]">
          <p className="text-lg font-medium">暂无三因素数据</p>
          <p className="text-sm">请确认 /api/channel/three-factor 已返回数据</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[var(--text-secondary)] text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold" rowSpan={2}>
                  渠道
                </th>
                <th
                  className="text-center px-4 py-2 font-semibold border-b border-slate-200"
                  colSpan={3}
                >
                  单量
                </th>
                <th
                  className="text-center px-4 py-2 font-semibold border-b border-slate-200"
                  colSpan={3}
                >
                  三因素
                </th>
              </tr>
              <tr className="bg-slate-50 text-[var(--text-muted)] text-xs">
                <th className="text-right px-4 py-2 font-medium">预期</th>
                <th className="text-right px-4 py-2 font-medium">实际</th>
                <th className="text-right px-4 py-2 font-medium">差距</th>
                <th className="text-right px-4 py-2 font-medium">预约</th>
                <th className="text-right px-4 py-2 font-medium">出席</th>
                <th className="text-right px-4 py-2 font-medium">付费</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => (
                <tr
                  key={c.channel}
                  className={i % 2 === 0 ? "bg-[var(--bg-surface)]" : "bg-slate-50/50"}
                >
                  <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                    {c.channel}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                    {c.expected_orders.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                    {c.actual_orders.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <GapBadge gap={c.gap_orders} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <FactorBadge value={c.appointment_factor ?? 0} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <FactorBadge value={c.attendance_factor ?? 0} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <FactorBadge value={c.paid_factor ?? 0} />
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
