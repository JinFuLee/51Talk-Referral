"use client";

import type { ChannelStat } from "@/lib/types";

interface ChannelComparisonTableProps {
  channels: ChannelStat[];
}

const channelLabel: Record<string, string> = {
  narrow: "窄口",
  wide: "宽口",
  CC_narrow: "CC 窄口",
  SS_narrow: "SS 窄口",
  LP_narrow: "LP 窄口",
};

export function ChannelComparisonTable({ channels }: ChannelComparisonTableProps) {
  if (channels.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
        暂无口径对比数据
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {["口径", "注册", "付费", "转化率", "收入"].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {channels.map((ch, i) => (
            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 font-medium text-slate-800">
                {channelLabel[ch.channel] ?? ch.label ?? ch.channel}
              </td>
              <td className="px-3 py-2 text-slate-600">{ch.registrations.toLocaleString()}</td>
              <td className="px-3 py-2 text-slate-600">{ch.payments.toLocaleString()}</td>
              <td className="px-3 py-2 text-slate-600">{(ch.conversion_rate * 100).toFixed(1)}%</td>
              <td className="px-3 py-2 text-slate-600">
                {ch.revenue !== undefined ? `¥${ch.revenue.toLocaleString()}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
