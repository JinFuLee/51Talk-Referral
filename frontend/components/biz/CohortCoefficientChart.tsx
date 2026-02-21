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
  ReferenceLine,
} from "recharts";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface CoefficientPoint {
  month: number;
  value: number;
}

interface CoefficientLine {
  cohort: string;
  series: CoefficientPoint[];
}

interface CoefficientResponse {
  by_month: Record<string, number | string>[];
  lines: CoefficientLine[];
  golden_window_month: number | null;
  golden_window_value: number;
  data_source: string;
}

interface RawDecayResponse {
  series: Record<string, number | string>[];
  metric: string;
  metric_label: string;
  group_by: string;
  summary_decay: { month: number; value: number | null }[];
  data_source: string;
}

// ── Palette ───────────────────────────────────────────────────────────────────

const PALETTE = [
  "hsl(var(--chart-4))", "hsl(var(--success))", "#f59e0b", "#f43f5e",
  "hsl(var(--chart-2))", "hsl(var(--chart-4))", "#ec4899", "hsl(var(--chart-1))",
  "#84cc16", "#f97316",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildChartData(
  lines: CoefficientLine[],
  visibleCohorts: Set<string>
): Record<string, number | string>[] {
  const monthSet = new Set<number>();
  lines.forEach((l) => l.series.forEach((p) => monthSet.add(p.month)));
  const months = Array.from(monthSet).sort((a, b) => a - b);

  return months.map((m) => {
    const row: Record<string, number | string> = { month: `M${m}` };
    lines.forEach((l) => {
      if (visibleCohorts.has(l.cohort)) {
        const pt = l.series.find((p) => p.month === m);
        if (pt !== undefined) row[l.cohort] = pt.value;
      }
    });
    return row;
  });
}

// Convert raw by_month series rows into CoefficientLine[]
function parseByMonth(byMonth: Record<string, number | string>[]): CoefficientLine[] {
  return byMonth.map((row) => {
    const cohort = String(row["月份"] ?? row["cohort_month"] ?? "");
    const series: CoefficientPoint[] = [];
    for (let i = 1; i <= 12; i++) {
      const val = row[`m${i}`];
      if (val !== undefined && val !== null) {
        series.push({ month: i, value: Number(val) });
      }
    }
    return { cohort, series };
  });
}

// ── Loading / Error states ────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-48 text-sm text-slate-400">
      加载中...
    </div>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-sm text-red-400">
      {msg}
    </div>
  );
}

function DataSourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const isDemo = source === "demo";
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        isDemo
          ? "bg-amber-50 text-amber-600 border border-amber-200"
          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
      }`}
    >
      {isDemo ? "演示数据" : "真实数据"}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CohortCoefficientChart() {
  const [viewMode, setViewMode] = useState<"month" | "team">("month");

  const { data: coefData, isLoading: coefLoading, error: coefError } =
    useSWR<CoefficientResponse>(`/api/analysis/cohort-coefficient`, fetcher);

  const { data: rawData, isLoading: rawLoading, error: rawError } =
    useSWR<RawDecayResponse>(
      viewMode === "team"
        ? `/api/analysis/cohort-decay-raw?metric=referral_coefficient&group_by=team`
        : null,
      fetcher
    );

  // Resolve lines based on view mode
  const lines: CoefficientLine[] = (() => {
    if (viewMode === "team") {
      if (!rawData?.series) return [];
      return parseByMonth(rawData.series);
    }
    if (coefData?.lines && coefData.lines.length > 0) return coefData.lines;
    if (coefData?.by_month) return parseByMonth(coefData.by_month);
    return [];
  })();

  const [visibleCohorts, setVisibleCohorts] = useState<Set<string>>(
    new Set(lines.slice(0, 5).map((l) => l.cohort))
  );

  // Sync visible cohorts when lines change (after mode switch)
  const lineKeys = lines.map((l) => l.cohort).join(",");
  const [lastLineKeys, setLastLineKeys] = useState(lineKeys);
  if (lineKeys !== lastLineKeys) {
    setLastLineKeys(lineKeys);
    setVisibleCohorts(new Set(lines.slice(0, 5).map((l) => l.cohort)));
  }

  const toggleCohort = (cohort: string) => {
    setVisibleCohorts((prev) => {
      const next = new Set(prev);
      if (next.has(cohort)) next.delete(cohort);
      else next.add(cohort);
      return next;
    });
  };

  const goldenMonth = coefData?.golden_window_month ?? null;
  const goldenValue = coefData?.golden_window_value ?? 0;
  const dataSource = viewMode === "team" ? rawData?.data_source : coefData?.data_source;

  const chartData = buildChartData(lines, visibleCohorts);

  const isLoading = coefLoading || (viewMode === "team" && rawLoading);
  const error = coefError || (viewMode === "team" ? rawError : null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            C4 带新系数黄金窗口分析
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            X轴 = 月龄 (M1-M12)，每条线 = 一个入组月份，金色竖线 = 峰值月龄
          </p>
        </div>
        <DataSourceBadge source={dataSource} />
      </div>

      {/* View mode toggle */}
      <div className="flex gap-1">
        {(["month", "team"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1 text-xs rounded-full border transition-all ${
              viewMode === mode
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-slate-200 text-slate-600 hover:border-indigo-400"
            }`}
          >
            {mode === "month" ? "按入组月" : "按小组"}
          </button>
        ))}
      </div>

      {/* Golden window callout */}
      {goldenMonth !== null && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
          <span className="text-amber-500 font-bold text-sm">黄金窗口</span>
          <span className="text-amber-800 text-sm font-semibold">
            M{goldenMonth}
          </span>
          <span className="text-amber-600 text-xs">
            均值带新系数 {goldenValue.toFixed(2)} — 建议在此月龄集中运营资源
          </span>
        </div>
      )}

      {/* Cohort toggles */}
      {lines.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500 font-medium">
            {viewMode === "month" ? "入组月:" : "小组:"}
          </span>
          {lines.map((l, idx) => {
            const active = visibleCohorts.has(l.cohort);
            const color = PALETTE[idx % PALETTE.length];
            return (
              <button
                key={l.cohort}
                onClick={() => toggleCohort(l.cohort)}
                className={`px-2 py-0.5 rounded text-xs border transition-all ${
                  active ? "opacity-100" : "opacity-40"
                }`}
                style={{
                  borderColor: color,
                  color: active ? color : "hsl(var(--muted-foreground))",
                  backgroundColor: active ? `${color}18` : "transparent",
                }}
              >
                {l.cohort}
              </button>
            );
          })}
        </div>
      )}

      {/* Chart */}
      {isLoading && <LoadingState />}
      {!isLoading && error && (
        <ErrorState msg="数据加载失败，请先运行分析 POST /api/analysis/run" />
      )}
      {!isLoading && !error && chartData.length === 0 && (
        <ErrorState msg="暂无数据" />
      )}
      {!isLoading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => v.toFixed(2)}
            />
            <Tooltip
              formatter={(v: number, name: string) => [v.toFixed(3), name]}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {goldenMonth !== null && (
              <ReferenceLine
                x={`M${goldenMonth}`}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 2"
                label={{
                  value: `黄金M${goldenMonth}`,
                  fill: "#d97706",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}
            {lines.map((l, idx) =>
              visibleCohorts.has(l.cohort) ? (
                <Line
                  key={l.cohort}
                  type="monotone"
                  dataKey={l.cohort}
                  name={l.cohort}
                  stroke={PALETTE[idx % PALETTE.length]}
                  strokeWidth={1.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Summary table */}
      {!isLoading && !error && lines.length > 0 && (
        <div className="overflow-x-auto">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-2 py-1.5 text-slate-500 font-medium">
                  {viewMode === "month" ? "入组月" : "小组"}
                </th>
                {Array.from({ length: 12 }, (_, i) => (
                  <th
                    key={i}
                    className={`px-2 py-1.5 text-center font-medium ${
                      goldenMonth === i + 1
                        ? "text-amber-600 bg-amber-50"
                        : "text-slate-500"
                    }`}
                  >
                    M{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr
                  key={l.cohort}
                  className={`border-b border-slate-50 hover:bg-slate-50 ${
                    !visibleCohorts.has(l.cohort) ? "opacity-40" : ""
                  }`}
                >
                  <td className="px-2 py-1.5 font-medium text-slate-700">{l.cohort}</td>
                  {Array.from({ length: 12 }, (_, i) => {
                    const pt = l.series.find((p) => p.month === i + 1);
                    return (
                      <td
                        key={i}
                        className={`px-2 py-1.5 text-center ${
                          goldenMonth === i + 1
                            ? "bg-amber-50 font-semibold text-amber-700"
                            : "text-slate-600"
                        }`}
                      >
                        {pt !== undefined ? pt.value.toFixed(2) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
