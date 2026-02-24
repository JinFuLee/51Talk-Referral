"use client";

import { useState } from "react";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { useTranslation } from "@/lib/hooks";
import { CohortDecayCurve } from "@/components/biz/CohortDecayCurve";
import { CohortCoefficientChart } from "@/components/biz/CohortCoefficientChart";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";

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
  const { t } = useTranslation();
  const [metric, setMetric] = useState<MetricKey>("reach_rate");
  const [groupBy, setGroupBy] = useState<"month" | "team">("month");

  const { data, isLoading, error } = useSWR<DecayRawResponse>(
    `/api/analysis/cohort-decay-raw?metric=${metric}&group_by=${groupBy}`,
    swrFetcher
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
              {mode === "month" ? t("biz.cohort-decay.label.byMonth") : t("biz.cohort-decay.label.byTeam")}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading && (
        <Skeleton className="h-48 w-full" />
      )}
      {!isLoading && error && (
        <p className="text-sm text-red-500 py-8 text-center">
          {t("biz.cohort-decay.label.loadError")}
        </p>
      )}
      {!isLoading && !error && data && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">
              {data.metric_label} — {t("biz.cohort-decay.label.decayCurve")}
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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("decay");

  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t("biz.cohort-decay.title")} subtitle={t("biz.cohort-decay.subtitle")} />

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
