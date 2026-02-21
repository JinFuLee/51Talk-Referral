"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

interface MonthMetric {
  month: string;
  registrations: number | null;
  reg_share: number | null;
  reg_paid_rate: number | null;
  unit_price_usd: number | null;
  appt_rate: number | null;
  appt_attend_rate: number | null;
  attend_paid_rate: number | null;
  mom_reg_pct: number | null;
}

interface ChannelEntry {
  channel: string;
  metrics: MonthMetric[];
}

export interface ChannelMomData {
  records: Record<string, unknown>[];
  months: string[];
  by_channel: ChannelEntry[];
  summary: { month: string; total_registrations: number }[];
}

type MetricKey = "registrations" | "unit_price_usd" | "reg_paid_rate" | "attend_paid_rate";

interface MetricConfig {
  label: string;
  format: (v: number) => string;
  yLabel: string;
}

const METRIC_CONFIGS: Record<MetricKey, MetricConfig> = {
  registrations: {
    label: "注册数",
    format: (v) => v.toFixed(0),
    yLabel: "注册数",
  },
  unit_price_usd: {
    label: "客单价 (USD)",
    format: (v) => `$${v.toFixed(0)}`,
    yLabel: "客单价 $",
  },
  reg_paid_rate: {
    label: "注册付费率",
    format: (v) => `${(v * 100).toFixed(1)}%`,
    yLabel: "注册付费率 %",
  },
  attend_paid_rate: {
    label: "出席付费率",
    format: (v) => `${(v * 100).toFixed(1)}%`,
    yLabel: "出席付费率 %",
  },
};

const CHANNEL_COLORS = [
  "hsl(var(--chart-4))", // indigo
  "#0ea5e9", // sky
  "hsl(var(--success))", // emerald
  "#f59e0b", // amber
  "#ec4899", // pink
  "hsl(var(--chart-4))", // violet
  "hsl(var(--chart-1))", // teal
  "#f97316", // orange
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatMonth(yyyyMM: string): string {
  if (!yyyyMM || yyyyMM.length < 6) return yyyyMM;
  const y = yyyyMM.slice(0, 4);
  const m = yyyyMM.slice(4, 6);
  return `${y.slice(2)}年${parseInt(m)}月`;
}

function buildChartData(
  byChannel: ChannelEntry[],
  months: string[],
  metric: MetricKey,
): Record<string, unknown>[] {
  return months.map((month) => {
    const row: Record<string, unknown> = { month, monthLabel: formatMonth(month) };
    for (const ch of byChannel) {
      const mData = ch.metrics.find((m) => m.month === month);
      const val = mData ? mData[metric] : null;
      row[ch.channel] = val !== null && val !== undefined ? val : 0;
    }
    return row;
  });
}

// ── Tooltip ────────────────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  metric: MetricKey;
  byChannel: ChannelEntry[];
}

function CustomTooltip({ active, payload, label, metric, byChannel }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const cfg = METRIC_CONFIGS[metric];

  // Get MoM pct for each channel
  const momMap: Record<string, number | null> = {};
  for (const ch of byChannel) {
    const mData = ch.metrics.find((m) => m.month === label);
    if (mData) momMap[ch.channel] = mData.mom_reg_pct ?? null;
  }

  return (
    <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-xl shadow-flash p-3 text-xs max-w-[220px]">
      <p className="font-semibold text-slate-700 mb-2">{formatMonth(label ?? "")}</p>
      {payload
        .filter((p) => p.value > 0)
        .sort((a, b) => b.value - a.value)
        .map((p) => {
          const mom = momMap[p.name];
          return (
            <div key={p.name} className="flex items-center justify-between gap-2 py-0.5">
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: p.color }}
                />
                <span className="text-slate-600 truncate max-w-[100px]">{p.name}</span>
              </span>
              <span className="font-medium text-slate-800 flex-shrink-0">
                {cfg.format(p.value)}
                {mom !== null && metric === "registrations" && (
                  <span
                    className={`ml-1 ${mom >= 0 ? "text-emerald-600" : "text-red-500"}`}
                  >
                    {mom >= 0 ? "+" : ""}
                    {mom.toFixed(1)}%
                  </span>
                )}
              </span>
            </div>
          );
        })}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props {
  data: ChannelMomData;
}

export function ChannelMoMStreamChart({ data }: Props) {
  const [metric, setMetric] = useState<MetricKey>("registrations");

  const { by_channel, months } = data;

  if (!by_channel?.length || !months?.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400">
        暂无 F4 渠道月度数据 — 请先运行分析并确认数据文件已上传
      </div>
    );
  }

  const chartData = buildChartData(by_channel, months, metric);
  const cfg = METRIC_CONFIGS[metric];

  return (
    <div className="space-y-3">
      {/* Metric selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">指标：</span>
        {(Object.keys(METRIC_CONFIGS) as MetricKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setMetric(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              metric === key
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {METRIC_CONFIGS[key].label}
          </button>
        ))}
      </div>

      {/* Stacked area chart */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 480 }}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => cfg.format(v)}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                content={
                  <CustomTooltip metric={metric} byChannel={by_channel} />
                }
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value) => (
                  <span className="text-slate-600">{value}</span>
                )}
              />
              {by_channel.map((ch, i) => (
                <Area
                  key={ch.channel}
                  type="monotone"
                  dataKey={ch.channel}
                  stackId="1"
                  stroke={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
                  fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
                  fillOpacity={0.75}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        数据来源：F4 宣宣_转介绍渠道-月度环比 | 堆叠面积图展示各渠道{cfg.label}贡献
      </p>
    </div>
  );
}
