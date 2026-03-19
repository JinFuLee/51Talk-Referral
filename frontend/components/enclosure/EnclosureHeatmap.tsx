"use client";

import { formatRate } from "@/lib/utils";
import type { EnclosureCCMetrics } from "@/lib/types/enclosure";

interface EnclosureHeatmapProps {
  metrics: EnclosureCCMetrics[];
}

function heatmapBg(value: number, low: number, high: number): string {
  if (value >= high) return "bg-green-100 text-green-800";
  if (value >= low) return "bg-yellow-50 text-yellow-700";
  return "bg-red-50 text-red-700";
}

export function EnclosureHeatmap({ metrics }: EnclosureHeatmapProps) {
  if (metrics.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        暂无围场数据，上传数据文件后自动刷新
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
            <th className="py-2 pr-3 font-medium">围场段</th>
            <th className="py-2 pr-3 font-medium">CC</th>
            <th className="py-2 pr-3 text-right font-medium">有效学员</th>
            <th className="py-2 pr-3 text-center font-medium">参与率</th>
            <th className="py-2 pr-3 text-center font-medium">带货比</th>
            <th className="py-2 pr-3 text-center font-medium">打卡率</th>
            <th className="py-2 pr-3 text-center font-medium">触达率</th>
            <th className="py-2 text-right font-medium">注册数</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((r, i) => (
            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
              <td className="py-2 pr-3 text-slate-500 text-xs">{r.enclosure}</td>
              <td className="py-2 pr-3 font-medium">{r.cc_name}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{r.students.toLocaleString()}</td>
              <td className="py-2 pr-3 text-center">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${heatmapBg(r.participation_rate, 0.1, 0.2)}`}>
                  {formatRate(r.participation_rate)}
                </span>
              </td>
              <td className="py-2 pr-3 text-center">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${heatmapBg(r.cargo_ratio, 0.05, 0.1)}`}>
                  {formatRate(r.cargo_ratio)}
                </span>
              </td>
              <td className="py-2 pr-3 text-center">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${heatmapBg(r.checkin_rate, 0.3, 0.5)}`}>
                  {formatRate(r.checkin_rate)}
                </span>
              </td>
              <td className="py-2 pr-3 text-center">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${heatmapBg(r.cc_reach_rate, 0.3, 0.5)}`}>
                  {formatRate(r.cc_reach_rate)}
                </span>
              </td>
              <td className="py-2 text-right tabular-nums">{r.registrations.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
