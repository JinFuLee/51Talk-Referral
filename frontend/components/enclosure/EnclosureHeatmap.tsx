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
      <div className="text-center py-8 text-sm text-[var(--text-muted)]">
        暂无围场数据，上传数据文件后自动刷新
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[var(--n-800)] text-white text-xs font-medium">
            <th className="py-1.5 px-2 border-0 text-left">围场段</th>
            <th className="py-1.5 px-2 border-0 text-left">CC</th>
            <th className="py-1.5 px-2 border-0 text-right">有效学员</th>
            <th className="py-1.5 px-2 border-0 text-center">参与率</th>
            <th className="py-1.5 px-2 border-0 text-center">带货比</th>
            <th className="py-1.5 px-2 border-0 text-center">打卡率</th>
            <th className="py-1.5 px-2 border-0 text-center">CC触达率</th>
            <th className="py-1.5 px-2 border-0 text-center">SS触达率</th>
            <th className="py-1.5 px-2 border-0 text-center">LP触达率</th>
            <th className="py-1.5 px-2 border-0 text-right">注册数</th>
            <th className="py-1.5 px-2 border-0 text-right">付费数</th>
            <th className="py-1.5 px-2 border-0 text-right">业绩(USD)</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((r, i) => (
            <tr key={i} className="even:bg-[var(--bg-subtle)]">
              <td className="py-1 px-2 text-xs text-[var(--text-secondary)]">{r.enclosure}</td>
              <td className="py-1 px-2 text-xs font-medium">{r.cc_name}</td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">{r.students.toLocaleString()}</td>
              <td className="py-1 px-2 text-xs text-center">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${heatmapBg(r.participation_rate, 0.1, 0.2)}`}>
                  {formatRate(r.participation_rate)}
                </span>
              </td>
              <td className="py-1 px-2 text-xs text-center">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${heatmapBg(r.cargo_ratio, 0.05, 0.1)}`}>
                  {formatRate(r.cargo_ratio)}
                </span>
              </td>
              <td className="py-1 px-2 text-xs text-center">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${heatmapBg(r.checkin_rate, 0.3, 0.5)}`}>
                  {formatRate(r.checkin_rate)}
                </span>
              </td>
              <td className="py-1 px-2 text-xs text-center">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${heatmapBg(r.cc_reach_rate, 0.3, 0.5)}`}>
                  {formatRate(r.cc_reach_rate)}
                </span>
              </td>
              <td className="py-1 px-2 text-xs text-center">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${heatmapBg(r.ss_reach_rate ?? 0, 0.3, 0.5)}`}>
                  {formatRate(r.ss_reach_rate ?? 0)}
                </span>
              </td>
              <td className="py-1 px-2 text-xs text-center">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${heatmapBg(r.lp_reach_rate ?? 0, 0.3, 0.5)}`}>
                  {formatRate(r.lp_reach_rate ?? 0)}
                </span>
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">{r.registrations.toLocaleString()}</td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">{(r.payments ?? 0).toLocaleString()}</td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">${(r.revenue_usd ?? 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
