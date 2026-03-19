"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { formatRevenue } from "@/lib/utils";
import { SlideShell } from "@/components/presentation/SlideShell";
import { Spinner } from "@/components/ui/Spinner";

interface ChannelAttribution {
  channel: string;
  registrations: number;
  paid_count: number;
  paid_amount_usd: number;
}

interface AttributionData {
  channels: ChannelAttribution[];
}

export function NetAttributionSlide({
  slideNumber,
  totalSlides,
}: {
  slideNumber: number;
  totalSlides: number;
}) {
  const { data, isLoading } = useSWR<AttributionData>(
    "/api/channel/attribution",
    swrFetcher
  );
  const channels = data?.channels ?? [];

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="净业绩拆解"
      subtitle="各渠道人均业绩 / 注册均价"
      section="渠道分析"
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner size="lg" />
        </div>
      ) : channels.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-slate-400">
          <p className="text-lg font-medium">暂无净业绩归因数据</p>
          <p className="text-sm">请确认 /api/channel/attribution 已返回数据</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">渠道</th>
                <th className="text-right px-4 py-3 font-semibold">注册数</th>
                <th className="text-right px-4 py-3 font-semibold">付费人数</th>
                <th className="text-right px-4 py-3 font-semibold">总业绩</th>
                <th className="text-right px-4 py-3 font-semibold">人均业绩</th>
                <th className="text-right px-4 py-3 font-semibold">注册均价</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => {
                const perPaid =
                  c.paid_count > 0 ? c.paid_amount_usd / c.paid_count : 0;
                const perReg =
                  c.registrations > 0
                    ? c.paid_amount_usd / c.registrations
                    : 0;
                return (
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
                      {c.paid_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatRevenue(c.paid_amount_usd)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-700">
                      {formatRevenue(perPaid)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatRevenue(perReg)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-4 px-4 text-xs text-slate-400">
            人均业绩 = 总业绩 ÷ 付费人数 &nbsp;|&nbsp; 注册均价 = 总业绩 ÷
            注册数（含未付费）
          </p>
        </div>
      )}
    </SlideShell>
  );
}
