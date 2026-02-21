"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

interface ChannelMetric {
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
  metrics: ChannelMetric[];
}

interface ChannelMomAPIResponse {
  records: Record<string, unknown>[];
  months: string[];
  by_channel: ChannelEntry[];
  summary: { month: string; total_registrations: number }[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const METRIC_OPTIONS = [
  { key: "registrations", label: "注册数" },
  { key: "reg_paid_rate", label: "注册付费率", isRate: true },
  { key: "unit_price_usd", label: "客单价 (USD)", prefix: "$" },
  { key: "appt_rate", label: "预约率", isRate: true },
  { key: "appt_attend_rate", label: "预约出席率", isRate: true },
  { key: "attend_paid_rate", label: "出席付费率", isRate: true },
  { key: "mom_reg_pct", label: "注册环比 (%)", suffix: "%" },
] as const;

type MetricKey = (typeof METRIC_OPTIONS)[number]["key"];

const LINE_COLORS = [
  "hsl(var(--chart-2))",
  "hsl(var(--success))",
  "#f59e0b",
  "hsl(var(--destructive))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-1))",
  "#ec4899",
  "#84cc16",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

function formatMonth(yyyyMM: string): string {
  if (!yyyyMM || yyyyMM.length < 6) return yyyyMM;
  const y = yyyyMM.slice(0, 4);
  const m = yyyyMM.slice(4, 6);
  return `${y.slice(2)}/${parseInt(m)}`;
}

function buildChartData(
  byChannel: ChannelEntry[],
  months: string[],
  metricKey: MetricKey
): Record<string, string | number | null>[] {
  return months.map((month) => {
    const row: Record<string, string | number | null> = {
      month: formatMonth(month),
    };
    for (const ch of byChannel) {
      const m = ch.metrics.find((mm) => mm.month === month);
      row[ch.channel] = m ? (m[metricKey as keyof ChannelMetric] as number | null) : null;
    }
    return row;
  });
}

function formatValue(
  val: number | null,
  opt: (typeof METRIC_OPTIONS)[number]
): string {
  if (val === null || val === undefined) return "—";
  const isRate = "isRate" in opt && opt.isRate;
  const prefix = "prefix" in opt ? opt.prefix : "";
  const suffix = "suffix" in opt ? opt.suffix : "";
  if (isRate) return `${(val * 100).toFixed(1)}%`;
  if (prefix) return `${prefix}${val.toFixed(0)}`;
  if (suffix) return `${val.toFixed(1)}${suffix}`;
  return val.toFixed(0);
}

// ── Component ────────────────────────────────────────────────────────────────

export function ChannelMoMTrend() {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("registrations");

  const { data, error, isLoading } = useSWR<ChannelMomAPIResponse>(
    "/api/analysis/channel-mom",
    fetcher
  );

  const selectedOpt =
    METRIC_OPTIONS.find((o) => o.key === selectedMetric) ?? METRIC_OPTIONS[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400">
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
        数据加载失败：{String(error?.message ?? error)}
      </div>
    );
  }

  const byChannel = data?.by_channel ?? [];
  const months = data?.months ?? [];
  const chartData = buildChartData(byChannel, months, selectedMetric);
  const hasData = byChannel.length > 0 && months.length > 0;

  return (
    <div className="space-y-4">
      {/* Metric selector */}
      <div className="flex flex-wrap gap-2">
        {METRIC_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSelectedMetric(opt.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedMetric === opt.key
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {hasData ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 24, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => formatValue(v, selectedOpt)}
            />
            <Tooltip
              formatter={(val, name) => [
                formatValue(val as number | null, selectedOpt),
                String(name),
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {byChannel.map((ch, i) => (
              <Line
                key={ch.channel}
                type="monotone"
                dataKey={ch.channel}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-48 text-sm text-slate-400">
          暂无渠道数据，请先运行分析
        </div>
      )}

      {/* Footer note */}
      {hasData && (
        <p className="text-xs text-slate-400">
          {byChannel.length} 个渠道 · {months.length} 个月份 ·
          当前指标：{selectedOpt.label}
        </p>
      )}
    </div>
  );
}
