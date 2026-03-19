"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { SlideShell } from "@/components/presentation/SlideShell";
import { Spinner } from "@/components/ui/Spinner";

interface ChannelFunnel {
  channel: string;
  registrations: number;
  appointments: number;
  attendances: number;
  paid_count: number;
}

interface ChannelResponse {
  channels: ChannelFunnel[];
}

export function LeadAttributionSlide({
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
      title="各渠道学员漏斗"
      subtitle="CC窄 / SS窄 / LP窄 / 宽口 × 注册 → 预约 → 出席 → 付费"
      section="渠道分析"
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner size="lg" />
        </div>
      ) : channels.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-slate-400">
          <p className="text-lg font-medium">暂无渠道漏斗数据</p>
          <p className="text-sm">请确认 /api/channel 已返回 registrations / appointments / attendances / paid_count 字段</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">渠道</th>
                <th className="text-right px-4 py-3 font-semibold">注册数</th>
                <th className="text-right px-4 py-3 font-semibold">预约数</th>
                <th className="text-right px-4 py-3 font-semibold">出席数</th>
                <th className="text-right px-4 py-3 font-semibold">付费数</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => (
                <tr
                  key={c.channel}
                  className={i % 2 === 0 ? "bg-[var(--bg-surface)]" : "bg-slate-50/50"}
                >
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {c.channel}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {c.registrations.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {(c.appointments ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {(c.attendances ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {(c.paid_count ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-100 font-bold text-slate-800">
                <td className="px-4 py-3">合计</td>
                <td className="px-4 py-3 text-right">
                  {channels.reduce((s, c) => s + c.registrations, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {channels.reduce((s, c) => s + (c.appointments ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {channels.reduce((s, c) => s + (c.attendances ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {channels.reduce((s, c) => s + (c.paid_count ?? 0), 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
