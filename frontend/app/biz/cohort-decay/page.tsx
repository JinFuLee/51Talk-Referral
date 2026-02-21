"use client";

import { useState } from "react";
import useSWR from "swr";
import { CohortDecayCurve } from "@/components/biz/CohortDecayCurve";
import { CohortCoefficientChart } from "@/components/biz/CohortCoefficientChart";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DecayRawResponse {
  series: Record<string, number | string>[];
  metric: string;
  metric_label: string;
  group_by: string;
  summary_decay: { month: number; value: number | null }[];
  data_source: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const METRIC_OPTIONS = [
  { key: "reach_rate", label: "触达率" },
  { key: "participation_rate", label: "参与率" },
  { key: "checkin_rate", label: "打卡率" },
  { key: "referral_coefficient", label: "带新系数" },
  { key: "conversion_ratio", label: "带货比" },
] as const;

type MetricKey = (typeof METRIC_OPTIONS)[number]["key"];

const TABS = [
  { id: "decay", label: "指标衰减曲线" },
  { id: "coefficient", label: "C4 带新系数黄金窗口" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

/**
 * Convert by_month series format [{月份, m1, m2, ..., m12}, ...] into
 * CohortDecayCurve's cohortGroups format.
 */
function parseCohortGroups(
  series: Record<string, number | string>[]
): { cohort: string; series: { month: number; value: number | null }[] }[] {
  return series.map((row) => {
    const cohort = String(row["月份"] ?? row["cohort_month"] ?? "");
    const pts: { month: number; value: number | null }[] = [];
    for (let i = 1; i <= 12; i++) {
      const v = row[`m${i}`];
      pts.push({ month: i, value: v !== undefined ? Number(v) : null });
    }
    return { cohort, series: pts };
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DecayTab() {
  const [metric, setMetric] = useState<MetricKey>("reach_rate");
  const [groupBy, setGroupBy] = useState<"month" | "team">("month");

  const { data, isLoading, error } = useSWR<DecayRawResponse>(
    `/api/analysis/cohort-decay-raw?metric=${metric}&group_by=${groupBy}`,
    fetcher
  );

  const cohortGroups = data ? parseCohortGroups(data.series) : [];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Metric selector */}
        <div className="flex flex-wrap gap-1">
          {METRIC_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setMetric(opt.key)}
              className={`px-3 py-1 text-xs rounded-full border transition-all ${
                metric === opt.key
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-slate-200 text-slate-600 hover:border-indigo-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Group-by toggle */}
        <div className="flex gap-1 ml-auto">
          {(["month", "team"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setGroupBy(mode)}
              className={`px-3 py-1 text-xs rounded-full border transition-all ${
                groupBy === mode
                  ? "bg-slate-700 text-white border-slate-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-400"
              }`}
            >
              {mode === "month" ? "按入组月" : "按小组"}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}
      {!isLoading && error && (
        <p className="text-sm text-red-500 py-8 text-center">
          数据加载失败，请先运行分析（POST /api/analysis/run）
        </p>
      )}
      {!isLoading && !error && data && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">
              {data.metric_label} — Cohort 月龄衰减曲线
            </h3>
            <DataSourceBadge source={data.data_source} />
          </div>
          <CohortDecayCurve
            cohortGroups={cohortGroups}
            summaryDecay={data.summary_decay}
            metric={data.metric}
            metricLabel={data.metric_label}
            showPercentage={data.metric !== "referral_coefficient"}
          />
        </Card>
      )}
    </div>
  );
}

function CoefficientTab() {
  return (
    <Card>
      <CohortCoefficientChart />
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CohortDecayPage() {
  const [activeTab, setActiveTab] = useState<TabId>("decay");

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Cohort 衰减分析</h1>
        <p className="text-sm text-slate-500 mt-1">
          C1-C5 指标月龄衰减曲线 · C4 带新系数黄金窗口识别
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "decay" && <DecayTab />}
      {activeTab === "coefficient" && <CoefficientTab />}
    </div>
  );
}
