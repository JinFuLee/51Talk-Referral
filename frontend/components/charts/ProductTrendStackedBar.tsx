"use client";

import { memo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatRevenue, formatUSDShort, CHART_FONT_SIZE, CHART_HEIGHT } from "@/lib/utils";

export interface ProductTrendItem {
  product_type: string;
  count: number;
  revenue_usd: number;
  percentage: number;
}

interface ProductTrendStackedBarProps {
  items: ProductTrendItem[];
}

const COLORS = [
  "hsl(var(--chart-4))",
  "hsl(var(--success))",
  "hsl(var(--chart-amber))",
  "hsl(var(--chart-rose))",
  "hsl(var(--chart-sky))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-orange))",
];

interface TooltipEntry {
  payload: ProductTrendItem & { fill: string };
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-xl shadow-flash p-3 text-xs max-w-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={String(entry.name ?? idx)} className="text-slate-600">
          <span style={{ color: entry.payload?.fill ?? COLORS[idx % COLORS.length] }}>■</span>{" "}
          {entry.name}:{" "}
          <span className="font-medium">{formatRevenue(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

function ProductTrendStackedBarInner({ items }: ProductTrendStackedBarProps) {
  if (!items.length) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-slate-400">
        暂无产品收入数据
      </div>
    );
  }

  // Each product_type becomes a bar, laid out side by side on X-axis
  // For stacked layout: pivot to a single data point with each product_type as a key
  const chartData = [
    items.reduce<Record<string, number | string>>(
      (acc, item) => {
        acc[item.product_type] = item.revenue_usd;
        return acc;
      },
      { name: "套餐收入" }
    ),
  ];

  const productTypes = items.map((i) => i.product_type);

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xl font-bold text-slate-800">
          {formatRevenue(items.reduce((s, i) => s + i.revenue_usd, 0))}
        </span>
        <span className="text-xs text-slate-400">
          产品总收入 · {items.length} 种套餐
        </span>
      </div>

      <ResponsiveContainer width="100%" height={CHART_HEIGHT.md} aria-label="套餐收入堆叠柱状图">
        <BarChart
          data={chartData}
          margin={{ top: 16, right: 16, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="name"
            tick={{ fontSize: CHART_FONT_SIZE.md, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false} />
          <YAxis tickFormatter={formatUSDShort}
            tick={{ fontSize: CHART_FONT_SIZE.sm, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: CHART_FONT_SIZE.md }} />
          {productTypes.map((type, idx) => (
            <Bar
              key={type}
              dataKey={type}
              stackId="revenue"
              fill={COLORS[idx % COLORS.length]}
              radius={idx === productTypes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Detail table */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="grid grid-cols-4 gap-x-2 text-xs text-slate-400 font-medium mb-1.5 px-1">
          <span>套餐类型</span>
          <span className="text-right">单量</span>
          <span className="text-right">收入</span>
          <span className="text-right">占比</span>
        </div>
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div
              key={item.product_type}
              className="grid grid-cols-4 gap-x-2 text-xs px-1 py-0.5 rounded hover:bg-slate-50"
            >
              <span className="flex items-center gap-1.5 truncate text-slate-600">
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                {item.product_type}
              </span>
              <span className="text-right text-slate-500">{item.count}</span>
              <span className="text-right font-medium text-slate-700">
                {formatRevenue(item.revenue_usd)}
              </span>
              <span className="text-right text-slate-500">
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const ProductTrendStackedBar = memo(ProductTrendStackedBarInner);
