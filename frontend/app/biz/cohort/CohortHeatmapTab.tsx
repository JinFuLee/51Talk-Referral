"use client";

import { CohortRetentionHeatmap } from "@/components/biz/CohortRetentionHeatmap";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { swrFetcher } from "@/lib/api";
import useSWR from "swr";
import type { HeatmapResponse } from "@/lib/types/cohort";




export default function CohortHeatmapTab() {
  const { data, isLoading, error } = useSWR<HeatmapResponse>(
    `/api/analysis/cohort-heatmap`,
    swrFetcher
  );

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <p className="text-sm text-red-500 py-8 text-center">
        数据加载失败，请先运行分析（POST /api/analysis/run）
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          X轴 = 月龄 (M1-M12)，Y轴 = 指标，色深 = 值高低
        </p>
        <DataSourceBadge source={data.data_source} />
      </div>
      <Card className="overflow-hidden">
        <CohortRetentionHeatmap
          metrics={data.metrics}
          metricLabels={data.metric_labels}
          months={data.months}
          matrix={data.matrix}
        />
      </Card>
      {data.cohort_months.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">入组月别 M1 指标对比</h3>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-3 py-1.5 text-slate-500 font-medium">入组月</th>
                  {data.metrics.map((m, i) => (
                    <th key={m} className="px-3 py-1.5 text-center text-slate-500 font-medium">
                      {data.metric_labels[i]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.cohort_months.map((row) => (
                  <tr key={row.cohort} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-medium text-slate-700">{row.cohort}</td>
                    {data.metrics.map((m) => {
                      const val = row[m];
                      const numVal = typeof val === "number" ? val : null;
                      return (
                        <td key={m} className="px-3 py-1.5 text-center text-slate-600">
                          {numVal != null
                            ? m === "referral_coefficient"
                              ? numVal.toFixed(2)
                              : `${(numVal * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
