"use client";

import { useState } from "react";
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

export interface DecaySeriesItem {
  month: number;
  value: number | null;
  cohort?: string;
}

export interface CohortGroup {
  cohort: string;
  series: DecaySeriesItem[];
}

export interface CohortDecayCurveProps {
  /** Each group is one cohort month's data */
  cohortGroups: CohortGroup[];
  /** Single aggregated summary decay (cross-cohort average) */
  summaryDecay?: { month: number; value: number | null }[];
  metric: string;
  metricLabel: string;
  showPercentage?: boolean;
}

// Palette for cohort lines
const PALETTE = [
  "#6366f1", "#10b981", "#f59e0b", "#f43f5e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

function formatVal(metric: string, v: number): string {
  if (metric === "referral_coefficient") return v.toFixed(2);
  return `${(v * 100).toFixed(1)}%`;
}

// Find inflection point (month with largest negative second derivative)
function findInflection(series: { month: number; value: number | null }[]): number | null {
  const vals = series.map((p) => p.value).filter((v): v is number => v !== null);
  if (vals.length < 3) return null;
  let maxD2 = -Infinity;
  let inflectionIdx = -1;
  for (let i = 1; i < vals.length - 1; i++) {
    const d2 = vals[i - 1] - 2 * vals[i] + vals[i + 1];
    if (d2 > maxD2) {
      maxD2 = d2;
      inflectionIdx = i;
    }
  }
  return inflectionIdx >= 0 ? series[inflectionIdx + 1]?.month ?? null : null;
}

export function CohortDecayCurve({
  cohortGroups,
  summaryDecay,
  metric,
  metricLabel,
  showPercentage = true,
}: CohortDecayCurveProps) {
  const [visibleCohorts, setVisibleCohorts] = useState<Set<string>>(
    new Set(cohortGroups.slice(0, 4).map((g) => g.cohort))
  );
  const [showSummary, setShowSummary] = useState(true);

  const toggleCohort = (cohort: string) => {
    setVisibleCohorts((prev) => {
      const next = new Set(prev);
      if (next.has(cohort)) next.delete(cohort);
      else next.add(cohort);
      return next;
    });
  };

  // Build chart data: each data point keyed by month
  const monthSet = new Set<number>();
  cohortGroups.forEach((g) => g.series.forEach((p) => monthSet.add(p.month)));
  if (summaryDecay) summaryDecay.forEach((p) => monthSet.add(p.month));
  const months = Array.from(monthSet).sort((a, b) => a - b);

  const chartData = months.map((m) => {
    const row: Record<string, number | string | null> = { month: `M${m}` };
    cohortGroups.forEach((g) => {
      if (visibleCohorts.has(g.cohort)) {
        const pt = g.series.find((p) => p.month === m);
        row[g.cohort] = pt?.value ?? null;
      }
    });
    if (showSummary && summaryDecay) {
      const pt = summaryDecay.find((p) => p.month === m);
      row["__avg__"] = pt?.value ?? null;
    }
    return row;
  });

  const inflectionMonth = summaryDecay ? findInflection(summaryDecay) : null;

  const formatter = (v: number) => formatVal(metric, v);

  return (
    <div className="space-y-3">
      {/* Cohort toggles */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-500 font-medium">入组月:</span>
        {cohortGroups.map((g, idx) => {
          const active = visibleCohorts.has(g.cohort);
          const color = PALETTE[idx % PALETTE.length];
          return (
            <button
              key={g.cohort}
              onClick={() => toggleCohort(g.cohort)}
              className={`px-2 py-0.5 rounded text-xs border transition-all ${
                active ? "opacity-100" : "opacity-40"
              }`}
              style={{
                borderColor: color,
                color: active ? color : "#94a3b8",
                backgroundColor: active ? `${color}18` : "transparent",
              }}
            >
              {g.cohort}
            </button>
          );
        })}
        {summaryDecay && (
          <button
            onClick={() => setShowSummary((v) => !v)}
            className={`px-2 py-0.5 rounded text-xs border transition-all ${
              showSummary ? "opacity-100" : "opacity-40"
            } border-slate-400 text-slate-600`}
          >
            均值曲线
          </button>
        )}
      </div>

      {inflectionMonth && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 inline-block">
          衰减拐点: M{inflectionMonth} (曲率最大处，建议在此月前加强干预)
        </p>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis
            tickFormatter={showPercentage && metric !== "referral_coefficient" ? (v) => `${(v * 100).toFixed(0)}%` : undefined}
            tick={{ fontSize: 11 }}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(v: number, name: string) => [
              formatVal(metric, v),
              name === "__avg__" ? "均值" : name,
            ]}
          />
          {inflectionMonth && (
            <ReferenceLine
              x={`M${inflectionMonth}`}
              stroke="#f59e0b"
              strokeDasharray="4 2"
              label={{ value: "拐点", fill: "#f59e0b", fontSize: 11 }}
            />
          )}
          {cohortGroups.map((g, idx) =>
            visibleCohorts.has(g.cohort) ? (
              <Line
                key={g.cohort}
                type="monotone"
                dataKey={g.cohort}
                name={g.cohort}
                stroke={PALETTE[idx % PALETTE.length]}
                strokeWidth={1.5}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
                connectNulls
              />
            ) : null
          )}
          {showSummary && summaryDecay && (
            <Line
              type="monotone"
              dataKey="__avg__"
              name="均值"
              stroke="#94a3b8"
              strokeWidth={2.5}
              strokeDasharray="5 3"
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
