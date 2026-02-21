"use client";

import { useSummary, useRiskAlerts, useAnomalies, useDataSources, useTranslation } from "@/lib/hooks";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { RiskAlertList } from "@/components/dashboard/RiskAlertList";
import { AnomalyBadge } from "@/components/dashboard/AnomalyBadge";
import { DataSourceGrid } from "@/components/datasources/DataSourceGrid";
import { RunAnalysisButton } from "@/components/dashboard/RunAnalysisButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useSummary();
  const { data: alerts } = useRiskAlerts();
  const { data: anomalies } = useAnomalies();
  const { data: datasources } = useDataSources();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t("root.title")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("root.subtitle")}</p>
        </div>
        <RunAnalysisButton />
      </div>

      <ErrorBoundary>
        {/* Summary KPI Cards */}
        {summaryLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : summaryError ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-600 text-sm">
            {summaryError?.message ?? t("common.label.loadFailed")}
          </div>
        ) : summaryData ? (
          <SummaryCards
            summary={summaryData.summary as Record<string, unknown>}
            timeProgress={summaryData.time_progress}
            meta={summaryData.meta as Record<string, unknown>}
          />
        ) : (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-700 text-sm">
            {t("root.label.noAnalysisData")}
          </div>
        )}

        {/* Risk + Anomaly row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RiskAlertList alerts={alerts ?? []} />
          <AnomalyBadge anomalies={anomalies ?? []} />
        </div>

        {/* Data Source Status */}
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-3">{t("root.section.datasources")}</h2>
          <DataSourceGrid sources={datasources ?? []} />
        </div>
      </ErrorBoundary>
    </div>
  );
}
