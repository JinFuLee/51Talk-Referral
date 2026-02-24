"use client";

import { useState } from "react";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import CoefficientScatterChart from "./coefficient/CoefficientScatterChart";
import CoefficientSummaryCards from "./coefficient/CoefficientSummaryCards";
import CoefficientLegend from "./coefficient/CoefficientLegend";

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

export function CohortCoefficientChart() {
  const [viewMode, setViewMode] = useState<"month" | "team">("month");

  const { data: coefData, isLoading: coefLoading, error: coefError } =
    useSWR<CoefficientResponse>(`/api/analysis/cohort-coefficient`, swrFetcher);

  const { data: rawData, isLoading: rawLoading, error: rawError } =
    useSWR<RawDecayResponse>(
      viewMode === "team"
        ? `/api/analysis/cohort-decay-raw?metric=referral_coefficient&group_by=team`
        : null,
      swrFetcher
    );

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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">C4 带新系数黄金窗口分析</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            X轴 = 月龄 (M1-M12)，每条线 = 一个入组月份，金色竖线 = 峰值月龄
          </p>
        </div>
        <DataSourceBadge source={dataSource} />
      </div>

      <div className="flex gap-1">
        {(["month", "team"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1 text-xs rounded-full border transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
              viewMode === mode
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-slate-200 text-slate-600 hover:border-indigo-400"
            }`}
          >
            {mode === "month" ? "按入组月" : "按小组"}
          </button>
        ))}
      </div>

      <CoefficientLegend
        lines={lines}
        visibleCohorts={visibleCohorts}
        viewMode={viewMode}
        goldenMonth={goldenMonth}
        goldenValue={goldenValue}
        onToggle={toggleCohort}
      />

      {isLoading && (
        <div className="flex items-center justify-center h-48 text-sm text-slate-400">
          加载中...
        </div>
      )}
      {!isLoading && error && (
        <div className="flex items-center justify-center h-48 text-sm text-red-400">
          数据加载失败，请先运行分析 POST /api/analysis/run
        </div>
      )}
      {!isLoading && !error && (
        <CoefficientScatterChart
          chartData={chartData}
          lines={lines}
          visibleCohorts={visibleCohorts}
          goldenMonth={goldenMonth}
        />
      )}

      {!isLoading && !error && lines.length > 0 && (
        <CoefficientSummaryCards
          lines={lines}
          goldenMonth={goldenMonth}
          goldenValue={goldenValue}
          viewMode={viewMode}
        />
      )}
    </div>
  );
}
