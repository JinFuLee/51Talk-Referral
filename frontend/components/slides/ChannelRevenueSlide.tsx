"use client";

import useSWR from "swr";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { swrFetcher } from "@/lib/api";
import { formatRevenue, formatRate } from "@/lib/utils";
import { SlideShell } from "@/components/presentation/SlideShell";
import { Spinner } from "@/components/ui/Spinner";

interface ChannelAttribution {
  channel: string;
  registrations: number;
  paid_amount_usd: number;
  per_capita_usd: number;
}

interface AttributionData {
  channels: ChannelAttribution[];
}

const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e"];

export function ChannelRevenueSlide({
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
  const totalAmount = channels.reduce((s, c) => s + c.paid_amount_usd, 0);

  const pieData = channels.map((c) => ({
    name: c.channel,
    value: c.paid_amount_usd,
  }));

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="渠道金额贡献图"
      subtitle="各渠道人均金额 / 总金额 / 占比"
      section="渠道分析"
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner size="lg" />
        </div>
      ) : channels.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-[var(--text-muted)]">
          <p className="text-lg font-medium">暂无渠道金额数据</p>
          <p className="text-sm">请确认 /api/channel/attribution 已返回数据</p>
        </div>
      ) : (
        <div className="flex gap-8 h-full items-center">
          {/* Pie Chart */}
          <div className="flex-shrink-0 w-72 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    formatRevenue(value),
                    "金额",
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[var(--text-secondary)] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">渠道</th>
                  <th className="text-right px-4 py-3 font-semibold">人均金额</th>
                  <th className="text-right px-4 py-3 font-semibold">总金额</th>
                  <th className="text-right px-4 py-3 font-semibold">占比</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c, i) => {
                  const pct =
                    totalAmount > 0 ? c.paid_amount_usd / totalAmount : 0;
                  return (
                    <tr
                      key={c.channel}
                      className={i % 2 === 0 ? "bg-[var(--bg-surface)]" : "bg-slate-50/50"}
                    >
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        />
                        {c.channel}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-700 font-semibold">
                        {formatRevenue(c.per_capita_usd ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                        {formatRevenue(c.paid_amount_usd)}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text-muted)]">
                        {formatRate(pct)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-100 font-bold text-[var(--text-primary)]">
                  <td className="px-4 py-3">合计</td>
                  <td className="px-4 py-3 text-right text-[var(--text-muted)]">—</td>
                  <td className="px-4 py-3 text-right">
                    {formatRevenue(totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--text-muted)]">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </SlideShell>
  );
}
