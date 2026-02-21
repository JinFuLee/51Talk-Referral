"use client";

import { useState } from "react";

export interface HeatmapCell {
  metric: string;
  metricLabel: string;
  month: number;
  value: number | null;
}

export interface CohortRetentionHeatmapProps {
  metrics: string[];
  metricLabels: string[];
  months: number[];
  /** matrix[metricIdx][monthIdx] = value */
  matrix: (number | null)[][];
}

const METRIC_COLORS: Record<string, { from: string; to: string }> = {
  reach_rate:            { from: "#bfdbfe", to: "#1d4ed8" },
  participation_rate:    { from: "#bbf7d0", to: "#15803d" },
  checkin_rate:          { from: "#fef08a", to: "#a16207" },
  referral_coefficient:  { from: "#fed7aa", to: "#c2410c" },
  conversion_ratio:      { from: "#e9d5ff", to: "#7e22ce" },
};

function lerpColor(from: string, to: string, t: number): string {
  const hex = (s: string) => parseInt(s.slice(1), 16);
  const r = (v: number) => (hex(from) >> 16) & 0xff;
  const g = (v: number) => (hex(from) >> 8) & 0xff;
  const b = (v: number) => hex(from) & 0xff;

  const f = hex(from);
  const t2 = hex(to);
  const fr = (f >> 16) & 0xff;
  const fg = (f >> 8) & 0xff;
  const fb = f & 0xff;
  const tr = (t2 >> 16) & 0xff;
  const tg = (t2 >> 8) & 0xff;
  const tb = t2 & 0xff;

  const nr = Math.round(fr + (tr - fr) * t);
  const ng = Math.round(fg + (tg - fg) * t);
  const nb = Math.round(fb + (tb - fb) * t);
  return `rgb(${nr},${ng},${nb})`;
}

function getCellBg(metric: string, value: number | null, maxVal: number): string {
  if (value === null) return "#f1f5f9";
  const colors = METRIC_COLORS[metric] || { from: "#e2e8f0", to: "#1e293b" };
  const t = maxVal > 0 ? Math.min(value / maxVal, 1) : 0;
  return lerpColor(colors.from, colors.to, t);
}

function getCellText(metric: string, value: number | null): string {
  if (value === null) return "—";
  if (metric === "referral_coefficient") return value.toFixed(2);
  return `${(value * 100).toFixed(1)}%`;
}

function getTextColor(metric: string, value: number | null, maxVal: number): string {
  if (value === null) return "#94a3b8";
  const t = maxVal > 0 ? value / maxVal : 0;
  return t > 0.55 ? "#fff" : "#1e293b";
}

export function CohortRetentionHeatmap({
  metrics,
  metricLabels,
  months,
  matrix,
}: CohortRetentionHeatmapProps) {
  const [hovered, setHovered] = useState<{ mi: number; mj: number } | null>(null);

  // Compute per-metric max values for normalization
  const maxVals = matrix.map((row) => {
    const vals = row.filter((v): v is number => v !== null);
    return vals.length ? Math.max(...vals) : 1;
  });

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs w-full min-w-[520px]">
        <thead>
          <tr>
            <th className="text-left px-3 py-2 font-medium text-slate-500 w-32">指标 / 月龄</th>
            {months.map((m) => (
              <th key={m} className="px-1 py-2 text-center font-medium text-slate-500 min-w-[44px]">
                M{m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric, mi) => (
            <tr key={metric}>
              <td className="px-3 py-1.5 font-medium text-slate-700 whitespace-nowrap">
                {metricLabels[mi] || metric}
              </td>
              {months.map((m, mj) => {
                const value = matrix[mi]?.[mj] ?? null;
                const bg = getCellBg(metric, value, maxVals[mi]);
                const textColor = getTextColor(metric, value, maxVals[mi]);
                const isHovered = hovered?.mi === mi && hovered?.mj === mj;

                return (
                  <td
                    key={m}
                    className="px-1 py-1.5 text-center cursor-default transition-all duration-100"
                    style={{
                      backgroundColor: bg,
                      color: textColor,
                      outline: isHovered ? "2px solid #6366f1" : undefined,
                      fontWeight: isHovered ? 600 : 400,
                    }}
                    onMouseEnter={() => setHovered({ mi, mj })}
                    onMouseLeave={() => setHovered(null)}
                    title={
                      value !== null
                        ? `${metricLabels[mi]} · M${m}: ${getCellText(metric, value)}`
                        : "无数据"
                    }
                  >
                    {getCellText(metric, value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 px-3">
        {metrics.map((metric, mi) => {
          const colors = METRIC_COLORS[metric] || { from: "#e2e8f0", to: "#1e293b" };
          return (
            <div key={metric} className="flex items-center gap-1.5 text-xs text-slate-500">
              <div
                className="w-16 h-2 rounded-sm"
                style={{
                  background: `linear-gradient(to right, ${colors.from}, ${colors.to})`,
                }}
              />
              <span>{metricLabels[mi]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
