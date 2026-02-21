"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface HeatmapCell {
  cc_name: string;
  date: string;
  calls: number;
  connects: number;
  effective: number;
  effective_rate: number;
}

interface CCOutreachHeatmapProps {
  dates: string[];
  cc_names: string[];
  data: HeatmapCell[];
}

type Dimension = "calls" | "connects" | "effective" | "effective_rate";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getHeatColor(value: number, max: number): string {
  if (value === 0 || max === 0) return "bg-slate-50 text-slate-300";
  const ratio = Math.min(value / max, 1);
  if (ratio < 0.2) return "bg-slate-100 text-slate-500";
  if (ratio < 0.4) return "bg-primary/10 text-primary";
  if (ratio < 0.6) return "bg-primary/30 text-primary";
  if (ratio < 0.8) return "bg-primary/60 text-white";
  return "bg-primary text-white";
}

function formatDate(dateStr: string): string {
  // "2026-02-05" → "02-05"
  const parts = dateStr.split("-");
  if (parts.length >= 3) return `${parts[1]}-${parts[2]}`;
  return dateStr;
}

const DIM_LABELS: Record<Dimension, string> = {
  calls: "拨打量",
  connects: "接通量",
  effective: "有效通话",
  effective_rate: "有效率",
};

function formatValue(dim: Dimension, val: number): string {
  if (dim === "effective_rate") return `${(val * 100).toFixed(0)}%`;
  return String(val);
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CCOutreachHeatmap({ dates, cc_names, data }: CCOutreachHeatmapProps) {
  const [dim, setDim] = useState<Dimension>("calls");
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    cell: HeatmapCell | null;
  }>({ visible: false, x: 0, y: 0, cell: null });

  // Build lookup: (cc, date) → cell
  const cellMap = new Map<string, HeatmapCell>();
  for (const cell of data) {
    cellMap.set(`${cell.cc_name}||${cell.date}`, cell);
  }

  // Calculate max value for color scale
  const max = Math.max(
    1,
    ...data.map((c) => {
      if (dim === "effective_rate") return c.effective_rate;
      return c[dim];
    })
  );

  // Row totals (per CC across all dates)
  const rowTotals = new Map<string, number>();
  for (const cc of cc_names) {
    let total = 0;
    for (const d of dates) {
      const cell = cellMap.get(`${cc}||${d}`);
      if (cell) {
        if (dim === "effective_rate") {
          total += cell.effective;
        } else {
          total += cell[dim];
        }
      }
    }
    rowTotals.set(cc, total);
  }

  // Column totals (per date across all CCs) — only for count dims
  const colTotals = new Map<string, number>();
  if (dim !== "effective_rate") {
    for (const d of dates) {
      let total = 0;
      for (const cc of cc_names) {
        const cell = cellMap.get(`${cc}||${d}`);
        if (cell) total += cell[dim];
      }
      colTotals.set(d, total);
    }
  }

  const handleMouseEnter = (e: React.MouseEvent, cell: HeatmapCell | null) => {
    if (!cell) return;
    setTooltip({ visible: true, x: e.clientX, y: e.clientY, cell });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (tooltip.visible) {
      setTooltip((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
    }
  };
  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  if (!dates.length || !cc_names.length) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        暂无外呼数据
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Dimension selector */}
      <div className="flex gap-2 mb-3">
        {(Object.keys(DIM_LABELS) as Dimension[]).map((d) => (
          <button
            key={d}
            onClick={() => setDim(d)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              dim === d
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white text-slate-600 border-slate-200 hover:border-primary/50"
            }`}
          >
            {DIM_LABELS[d]}
          </button>
        ))}
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto rounded border border-slate-100">
        <table className="text-xs border-collapse min-w-max">
          <thead>
            <tr>
              {/* CC name header */}
              <th className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 px-3 py-2 text-left font-medium text-slate-600 min-w-[90px]">
                CC
              </th>
              {dates.map((d) => (
                <th
                  key={d}
                  className="border-b border-slate-200 px-1.5 py-2 text-center font-medium text-slate-500 min-w-[38px]"
                >
                  {formatDate(d)}
                </th>
              ))}
              {/* Row total */}
              <th className="border-b border-l border-slate-200 px-2 py-2 text-center font-medium text-slate-600 min-w-[48px]">
                合计
              </th>
            </tr>
          </thead>
          <tbody>
            {cc_names.map((cc, rowIdx) => (
              <tr key={cc} className={rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                {/* CC name (sticky) */}
                <td className="sticky left-0 z-10 bg-inherit border-r border-slate-200 px-3 py-1.5 font-medium text-slate-700 whitespace-nowrap">
                  {cc}
                </td>
                {dates.map((d) => {
                  const cell = cellMap.get(`${cc}||${d}`) || null;
                  const val = cell
                    ? dim === "effective_rate"
                      ? cell.effective_rate
                      : cell[dim]
                    : 0;
                  const colorClass = getHeatColor(val, max);
                  return (
                    <td
                      key={d}
                      className={`border-slate-100 border px-1 py-1 text-center cursor-default transition-opacity ${colorClass}`}
                      onMouseEnter={(e) => handleMouseEnter(e, cell)}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                    >
                      {cell ? formatValue(dim, val) : ""}
                    </td>
                  );
                })}
                {/* Row total */}
                <td className="border-l border-slate-200 px-2 py-1 text-center font-semibold text-slate-700">
                  {dim === "effective_rate"
                    ? ""
                    : (rowTotals.get(cc) || 0).toLocaleString()}
                </td>
              </tr>
            ))}
            {/* Column totals row */}
            {dim !== "effective_rate" && (
              <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold">
                <td className="sticky left-0 z-10 bg-slate-100 border-r border-slate-200 px-3 py-1.5 text-slate-700">
                  合计
                </td>
                {dates.map((d) => (
                  <td
                    key={d}
                    className="border border-slate-200 px-1 py-1 text-center text-slate-700"
                  >
                    {(colTotals.get(d) || 0).toLocaleString()}
                  </td>
                ))}
                <td className="border-l border-slate-200 px-2 py-1 text-center text-slate-700">
                  {data
                    .reduce((s, c) => s + (dim === "calls" ? c.calls : dim === "connects" ? c.connects : c.effective), 0)
                    .toLocaleString()}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.cell && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-800 text-white text-xs rounded-lg shadow-xl px-3 py-2 space-y-1"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="font-semibold">{tooltip.cell.cc_name}</div>
          <div className="text-slate-300">{tooltip.cell.date}</div>
          <div className="border-t border-slate-600 pt-1 mt-1 space-y-0.5">
            <div>拨打: {tooltip.cell.calls}</div>
            <div>接通: {tooltip.cell.connects}</div>
            <div>有效: {tooltip.cell.effective}</div>
            <div>有效率: {(tooltip.cell.effective_rate * 100).toFixed(1)}%</div>
          </div>
        </div>
      )}
    </div>
  );
}
