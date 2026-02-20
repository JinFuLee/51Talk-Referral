"use client";

import { useSummary, useRiskAlerts, useAnomalies, useDataSources } from "@/lib/hooks";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { RiskAlertList } from "@/components/dashboard/RiskAlertList";
import { AnomalyBadge } from "@/components/dashboard/AnomalyBadge";
import { DataSourceGrid } from "@/components/datasources/DataSourceGrid";
import { RunAnalysisButton } from "@/components/dashboard/RunAnalysisButton";
import { Spinner } from "@/components/ui/Spinner";

export default function DashboardPage() {
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useSummary();
  const { data: alerts } = useRiskAlerts();
  const { data: anomalies } = useAnomalies();
  const { data: datasources } = useDataSources();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">运营分析看板</h1>
          <p className="text-sm text-slate-500 mt-0.5">51Talk 泰国转介绍运营 · T-1 数据</p>
        </div>
        <RunAnalysisButton />
      </div>

      {/* Summary KPI Cards */}
      {summaryLoading ? (
        <div className="flex items-center justify-center h-40">
          <Spinner />
        </div>
      ) : summaryError ? (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-600 text-sm">
          {summaryError?.message ?? "加载失败，请先运行分析"}
        </div>
      ) : summaryData ? (
        <SummaryCards
          summary={summaryData.summary as Record<string, unknown>}
          timeProgress={summaryData.time_progress}
          meta={summaryData.meta as Record<string, unknown>}
        />
      ) : (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-700 text-sm">
          暂无分析数据 — 请点击右上角"运行分析"
        </div>
      )}

      {/* Risk + Anomaly row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RiskAlertList alerts={alerts ?? []} />
        <AnomalyBadge anomalies={anomalies ?? []} />
      </div>

      {/* Data Source Status */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">数据源状态</h2>
        <DataSourceGrid sources={datasources ?? []} />
      </div>
    </div>
  );
}
