"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatRevenue } from "@/lib/utils";

export interface PackageMixItem {
  product_type: string;
  count: number;
  revenue_usd: number;
  percentage: number;
}

interface PackageMixChartProps {
  items: PackageMixItem[];
}

const COLORS = [
  "hsl(var(--chart-2))", // blue
  "hsl(var(--success))", // emerald
  "hsl(var(--chart-amber))", // amber
  "hsl(var(--chart-4))", // violet
  "hsl(var(--destructive))", // red
  "hsl(var(--chart-1))", // cyan
  "hsl(var(--chart-orange))", // orange
  "hsl(var(--chart-lime))", // lime
  "hsl(var(--chart-pink))", // pink
  "hsl(var(--chart-4))", // indigo
];

interface TooltipPayloadItem {
  payload: PackageMixItem;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-xl shadow-flash p-3 text-xs max-w-xs">
      <p className="font-semibold text-slate-700 mb-1">{item.product_type}</p>
      <p className="text-slate-600">
        收入: <span className="font-medium text-blue-600">{formatRevenue(item.revenue_usd)}</span>
      </p>
      <p className="text-slate-600">
        占比: <span className="font-medium text-slate-700">{item.percentage.toFixed(1)}%</span>
      </p>
    </div>
  );
}

interface LegendPayloadItem {
  value: string;
  color: string;
  payload?: PackageMixItem;
}

interface CustomLegendProps {
  payload?: LegendPayloadItem[];
}

function CustomLegend({ payload }: CustomLegendProps) {
  if (!payload?.length) return null;
  return (
    <ul className="flex flex-col gap-1.5 text-xs text-slate-600 mt-2">
      {payload.map((entry) => {
        const item = entry.payload as PackageMixItem | undefined;
        return (
          <li key={String(entry.value)} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 min-w-0">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="truncate">{entry.value}</span>
            </span>
            <span className="text-slate-400 flex-shrink-0">
              {item ? `${item.percentage.toFixed(1)}%` : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function PackageMixChart({ items }: PackageMixChartProps) {
  const totalUsd = useMemo(() => (items ?? []).reduce((s, i) => s + i.revenue_usd, 0), [items]);

  const legendPayload = useMemo(
    () =>
      (items ?? []).map((item, idx) => ({
        value: item.product_type,
        color: COLORS[idx % COLORS.length],
        payload: item,
      })),
    [items]
  );

  if (!items.length) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-slate-400">
        暂无套餐结构数据
      </div>
    );
  }

  return (
    <div>
      {/* Summary row */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xl font-bold text-slate-800">{formatRevenue(totalUsd)}</span>
        <span className="text-xs text-slate-400">套餐总收入 · {items.length} 种</span>
      </div>

      <div className="flex gap-4">
        {/* Pie chart */}
        <div style={{ width: 160, height: 160, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={items}
                dataKey="revenue_usd"
                nameKey="product_type"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={70}
                paddingAngle={2}
              >
                {items.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 min-w-0">
          <CustomLegend payload={legendPayload} />
        </div>
      </div>

      {/* Table summary */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="grid grid-cols-3 gap-x-2 text-xs text-slate-400 font-medium mb-1.5 px-1">
          <span>套餐类型</span>
          <span className="text-right">收入</span>
          <span className="text-right">占比</span>
        </div>
        <div className="space-y-1">
          {items.slice(0, 6).map((item, idx) => (
            <div key={item.product_type} className="grid grid-cols-3 gap-x-2 text-xs px-1 py-0.5 rounded hover:bg-slate-50">
              <span className="flex items-center gap-1.5 truncate text-slate-600">
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                {item.product_type}
              </span>
              <span className="text-right font-medium text-slate-700">
                {formatRevenue(item.revenue_usd)}
              </span>
              <span className="text-right text-slate-500">{item.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
