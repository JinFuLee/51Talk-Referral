"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { formatRevenue, formatRate } from "@/lib/utils";
import { SlideShell } from "@/components/presentation/SlideShell";
import { Spinner } from "@/components/ui/Spinner";

interface ChannelData {
  channel: string;
  target_amount_usd: number;
  actual_amount_usd: number;
  gap_usd: number;
  achievement_rate: number;
}

interface ChannelResponse {
  channels: ChannelData[];
}

export function RevenueDecompositionSlide({
  slideNumber,
  totalSlides,
}: {
  slideNumber: number;
  totalSlides: number;
}) {
  const { data, isLoading } = useSWR<ChannelResponse>(
    "/api/channel",
    swrFetcher
  );
  const channels = data?.channels ?? [];

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="渠道业绩拆解"
      subtitle="各渠道目标 / 实际 / 差距 / 达成率"
      section="渠道分析"
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner size="lg" />
        </div>
      ) : channels.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-[var(--text-muted)]">
          <p className="text-lg font-medium">暂无渠道业绩数据</p>
          <p className="text-sm">请确认 /api/channel 已返回数据</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[var(--n-800)] text-white text-xs font-medium">
                <th className="text-left px-2 py-1.5">渠道</th>
                <th className="text-right px-2 py-1.5">目标金额</th>
                <th className="text-right px-2 py-1.5">实际金额</th>
                <th className="text-right px-2 py-1.5">差距</th>
                <th className="text-right px-2 py-1.5">达成率</th>
                <th className="px-2 py-1.5">进度</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => {
                const isGood = c.gap_usd >= 0;
                const pct = Math.min(100, c.achievement_rate * 100);
                return (
                  <tr
                    key={c.channel}
                    className={i % 2 === 0 ? "bg-[var(--bg-surface)]" : "bg-slate-50/50"}
                  >
                    <td className="px-2 py-1 text-xs font-semibold text-[var(--text-primary)]">
                      {c.channel}
                    </td>
                    <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {formatRevenue(c.target_amount_usd)}
                    </td>
                    <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-medium text-[var(--text-primary)]">
                      {formatRevenue(c.actual_amount_usd)}
                    </td>
                    <td
                      className={`px-2 py-1 text-xs text-right font-mono tabular-nums font-bold ${
                        isGood ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {isGood ? "+" : ""}
                      {formatRevenue(c.gap_usd)}
                    </td>
                    <td
                      className={`px-2 py-1 text-xs text-right font-mono tabular-nums font-semibold ${
                        c.achievement_rate >= 1
                          ? "text-green-600"
                          : c.achievement_rate >= 0.8
                          ? "text-yellow-600"
                          : "text-red-500"
                      }`}
                    >
                      {formatRate(c.achievement_rate)}
                    </td>
                    <td className="px-2 py-1 w-32">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            c.achievement_rate >= 1
                              ? "bg-green-500"
                              : c.achievement_rate >= 0.8
                              ? "bg-yellow-400"
                              : "bg-red-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
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
