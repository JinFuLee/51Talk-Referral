"use client";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import useSWR from "swr";
import type { HeatmapResponse } from "@/lib/types/cohort";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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

export default function CohortOverviewCards() {
  const { data, isLoading, error } = useSWR<HeatmapResponse>(
    `/api/analysis/cohort-heatmap`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 py-2">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-5 w-20 ml-auto" />
      </div>
    );
  }
  if (error || !data) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-slate-500">
        指标维度: {data.metric_labels.join(" · ")}
      </div>
      <DataSourceBadge source={data.data_source} />
    </div>
  );
}
