"use client";

import { useState } from "react";

interface DayCell {
  date: string;   // YYYY-MM-DD
  calls: number;
}

interface OutreachHeatmapProps {
  data: DayCell[];
  maxCalls?: number;
}

/** 5-level progressive color scale — fixed 0.25~0.5 same-color bug */
function getColor(calls: number, maxCalls: number): string {
  if (calls === 0) return "hsl(var(--border))";
  const intensity = Math.min(calls / maxCalls, 1);
  if (intensity < 0.2) return "#dbeafe";  // blue-100
  if (intensity < 0.4) return "#93c5fd";  // blue-300
  if (intensity < 0.6) return "#3b82f6";  // blue-500
  if (intensity < 0.8) return "#1d4ed8";  // blue-700
  return "#1e3a8a";                        // blue-900
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

interface TooltipState {
  cell: DayCell;
  x: number;
  y: number;
}

export function OutreachHeatmap({ data, maxCalls }: OutreachHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        暂无外呼热力图数据
      </div>
    );
  }

  const resolvedMax = maxCalls ?? Math.max(...data.map((d) => d.calls), 1);

  // Build a week-grid: group by week
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = new Date(sorted[0].date);
  const dayOffset = (firstDate.getDay() + 6) % 7; // Mon=0

  const cells: (DayCell | null)[] = [
    ...Array(dayOffset).fill(null),
    ...sorted,
  ];

  const weeks: (DayCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto relative">
      <div className="flex gap-1" onMouseLeave={() => setTooltip(null)}>
        {/* Weekday labels */}
        <div className="flex flex-col gap-1 mr-1">
          <div className="h-4" />
          {WEEKDAYS.map((d) => (
            <div key={d} className="h-4 w-4 flex items-center justify-center text-[10px] text-slate-400">
              {d}
            </div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wi) => {
          const firstCell = week.find((c) => c !== null);
          const monthLabel = firstCell
            ? new Date(firstCell.date).getDate() <= 7
              ? `${new Date(firstCell.date).getMonth() + 1}月`
              : ""
            : "";

          return (
            <div key={wi} className="flex flex-col gap-1">
              <div className="h-4 text-[10px] text-slate-400 whitespace-nowrap">{monthLabel}</div>
              {Array.from({ length: 7 }, (_, di) => {
                const cell = week[di] ?? null;
                return (
                  <div
                    key={di}
                    className="h-4 w-4 rounded-sm cursor-default relative"
                    style={{ backgroundColor: cell ? getColor(cell.calls, resolvedMax) : "hsl(var(--background))" }}
                    onMouseEnter={(e) => {
                      if (cell) {
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setTooltip({ cell, x: rect.left, y: rect.top });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Custom floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-white/95 backdrop-blur-md border border-border/40 rounded-lg shadow-lg px-2 py-1.5 text-xs"
          style={{ left: tooltip.x + 8, top: tooltip.y - 40 }}
        >
          <p className="font-semibold text-slate-700">{tooltip.cell.date}</p>
          <p className="text-slate-500">{tooltip.cell.calls} 通</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-1 mt-2">
        <span className="text-[10px] text-slate-400 mr-1">少</span>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v, i) => (
          <div
            key={i}
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: v === 0 ? "hsl(var(--border))" : getColor(v * resolvedMax, resolvedMax) }}
          />
        ))}
        <span className="text-[10px] text-slate-400 ml-1">多</span>
      </div>
    </div>
  );
}
