"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { formatRevenue, formatRate } from "@/lib/utils";
import { SlideShell } from "@/components/presentation/SlideShell";
import { Spinner } from "@/components/ui/Spinner";

interface ChannelAttribution {
  channel: string;
  registrations: number;
  paid_amount_usd: number;
  paid_ratio: number;
}

interface AttributionData {
  channels: ChannelAttribution[];
}

export function RevenueContributionSlide({
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
  const totalRegistrations = channels.reduce((s, c) => s + c.registrations, 0);
  const totalAmount = channels.reduce((s, c) => s + c.paid_amount_usd, 0);

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="渠道业绩贡献"
      subtitle="各渠道注册数 / 付费金额 / 占比"
      section="渠道分析"
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner size="lg" />
        </div>
      ) : channels.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-slate-400">
          <p className="text-lg font-medium">暂无渠道归因数据</p>
          <p className="text-sm">请确认 /api/channel/attribution 已返回数据</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">渠道</th>
                <th className="text-right px-4 py-3 font-semibold">注册数</th>
                <th className="text-right px-4 py-3 font-semibold">注册占比</th>
                <th className="text-right px-4 py-3 font-semibold">付费金额</th>
                <th className="text-right px-4 py-3 font-semibold">金额占比</th>
                <th className="text-right px-4 py-3 font-semibold">付费率</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => {
                const regPct =
                  totalRegistrations > 0
                    ? c.registrations / totalRegistrations
                    : 0;
                const amtPct =
                  totalAmount > 0 ? c.paid_amount_usd / totalAmount : 0;
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
                    <td className="px-4 py-3 text-right text-slate-500">
                      {formatRate(regPct)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatRevenue(c.paid_amount_usd)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {formatRate(amtPct)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          c.paid_ratio >= 0.1
                            ? "text-green-600 font-semibold"
                            : c.paid_ratio >= 0.05
                            ? "text-yellow-600 font-semibold"
                            : "text-red-500 font-semibold"
                        }
                      >
                        {formatRate(c.paid_ratio)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-100 font-bold text-slate-800">
                <td className="px-4 py-3">合计</td>
                <td className="px-4 py-3 text-right">
                  {totalRegistrations.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-slate-400">100%</td>
                <td className="px-4 py-3 text-right">
                  {formatRevenue(totalAmount)}
                </td>
                <td className="px-4 py-3 text-right text-slate-400">100%</td>
                <td className="px-4 py-3 text-right text-slate-400">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
