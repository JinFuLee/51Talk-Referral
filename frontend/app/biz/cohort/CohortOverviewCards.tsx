"use client";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { swrFetcher } from "@/lib/api";
import useSWR from "swr";
import type { HeatmapResponse } from "@/lib/types/cohort";



export default function CohortOverviewCards() {
  const { data, isLoading, error } = useSWR<HeatmapResponse>(
    `/api/analysis/cohort-heatmap`,
    swrFetcher
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
