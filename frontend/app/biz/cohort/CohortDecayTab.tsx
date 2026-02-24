"use client";

import { useState } from "react";
import { CohortDecayCurve } from "@/components/biz/CohortDecayCurve";
import { CohortCoefficientChart } from "@/components/biz/CohortCoefficientChart";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { swrFetcher } from "@/lib/api";
import useSWR from "swr";
import type { DecayResponse } from "@/lib/types/cohort";
import { METRIC_OPTIONS } from "@/lib/types/cohort";




export default function CohortDecayTab() {
  const [selectedMetric, setSelectedMetric] = useState("reach_rate");
  const { data, isLoading, error } = useSWR<DecayResponse>(
    `/api/analysis/cohort-decay?metric=${selectedMetric}`,
    swrFetcher
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {METRIC_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSelectedMetric(opt.key)}
            className={`px-3 py-1 text-xs rounded-full border transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
              selectedMetric === opt.key
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-slate-200 text-slate-600 hover:border-indigo-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {isLoading && (
        <div className="space-y-3 py-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-72 w-full" />
        </div>
      )}
      {error && (
        <p className="text-sm text-red-500 py-8 text-center">数据加载失败，请先运行分析</p>
      )}
      {data && !isLoading && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">
              {data.metric_label} — Cohort 月龄衰减曲线
            </h3>
            <DataSourceBadge source={data.data_source} />
          </div>
          <CohortDecayCurve
            cohortGroups={data.by_cohort_month}
            summaryDecay={data.summary_decay}
            metric={data.metric}
            metricLabel={data.metric_label}
            showPercentage={data.metric !== "referral_coefficient"}
          />
        </Card>
      )}

      {/* C4 带新系数黄金窗口分析（独立数据源） */}
      <Card>
        <CohortCoefficientChart />
      </Card>
    </div>
  );
}
