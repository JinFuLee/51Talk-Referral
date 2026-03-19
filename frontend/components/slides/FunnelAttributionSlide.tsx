"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { formatRate } from "@/lib/utils";
import { SlideShell } from "@/components/presentation/SlideShell";
import { Spinner } from "@/components/ui/Spinner";

interface ChannelConversion {
  channel: string;
  appointment_rate: number;
  appointment_rate_target: number;
  attendance_rate: number;
  attendance_rate_target: number;
  paid_rate: number;
  paid_rate_target: number;
}

interface ChannelResponse {
  channels: ChannelConversion[];
}

function GapCell({
  actual,
  target,
}: {
  actual: number;
  target: number;
}) {
  const gap = actual - target;
  const color =
    gap >= 0
      ? "text-green-600 bg-green-50"
      : gap >= -0.05
      ? "text-yellow-600 bg-yellow-50"
      : "text-red-600 bg-red-50";
  return (
    <td className="px-4 py-3 text-right">
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${color}`}>
        {gap >= 0 ? "+" : ""}{formatRate(gap)}
      </span>
    </td>
  );
}

export function FunnelAttributionSlide({
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
      title="过程转化率拆解"
      subtitle="各渠道 × 预约率 / 出席率 / 付费率 vs 目标差距"
      section="渠道分析"
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner size="lg" />
        </div>
      ) : channels.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-slate-400">
          <p className="text-lg font-medium">暂无渠道转化率数据</p>
          <p className="text-sm">请确认 /api/channel 已返回转化率字段</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold" rowSpan={2}>渠道</th>
                <th className="text-center px-4 py-2 font-semibold border-b border-slate-200" colSpan={2}>预约率</th>
                <th className="text-center px-4 py-2 font-semibold border-b border-slate-200" colSpan={2}>出席率</th>
                <th className="text-center px-4 py-2 font-semibold border-b border-slate-200" colSpan={2}>付费率</th>
              </tr>
              <tr className="bg-slate-50 text-slate-400 text-xs">
                <th className="text-right px-4 py-2 font-medium">实际</th>
                <th className="text-right px-4 py-2 font-medium">差距</th>
                <th className="text-right px-4 py-2 font-medium">实际</th>
                <th className="text-right px-4 py-2 font-medium">差距</th>
                <th className="text-right px-4 py-2 font-medium">实际</th>
                <th className="text-right px-4 py-2 font-medium">差距</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => (
                <tr
                  key={c.channel}
                  className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                >
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {c.channel}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatRate(c.appointment_rate)}
                  </td>
                  <GapCell
                    actual={c.appointment_rate}
                    target={c.appointment_rate_target ?? 0}
                  />
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatRate(c.attendance_rate)}
                  </td>
                  <GapCell
                    actual={c.attendance_rate}
                    target={c.attendance_rate_target ?? 0}
                  />
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatRate(c.paid_rate)}
                  </td>
                  <GapCell
                    actual={c.paid_rate}
                    target={c.paid_rate_target ?? 0}
                  />
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 px-4 text-xs text-slate-400">
            🟢 超目标 &nbsp;|&nbsp; 🟡 落后 0~5% &nbsp;|&nbsp; 🔴 严重落后 &gt;5%
          </p>
        </div>
      )}
    </SlideShell>
  );
}
