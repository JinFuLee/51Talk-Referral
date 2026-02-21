"use client";

import { useSummary, usePrediction, useRiskAlerts, useTranslation } from "@/lib/hooks";
import { formatRevenue } from "@/lib/utils";
import { BigMetricCard } from "@/components/biz/BigMetricCard";
import { ActionList } from "@/components/biz/ActionList";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import type { SummaryData, PredictionData, RiskAlert } from "@/lib/types";

export default function BizOverviewPage() {
  const { t } = useTranslation();

  const DEFAULT_ACTIONS = [
    { text: t("biz.overview.action.checkinLow"), target: t("biz.overview.action.checkinTarget"), priority: "high" as const },
    { text: t("biz.overview.action.enclosureHigh"), priority: "medium" as const },
    { text: t("biz.overview.action.preCallLift"), priority: "medium" as const },
  ];
  const { data: summaryResp, isLoading: sLoading } = useSummary();
  const { data: predictionResp, isLoading: pLoading } = usePrediction();
  const { data: alerts } = useRiskAlerts();

  if (sLoading || pLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }

  const summary = (summaryResp as { summary?: SummaryData } | undefined)?.summary;
  const prediction = predictionResp as PredictionData | undefined;
  const riskAlerts = (alerts ?? []) as RiskAlert[];

  const regActual = summary?.registrations?.actual ?? 0;
  const regTarget = summary?.registrations?.target ?? 1;
  const regProgress = summary?.registrations?.progress ?? 0;
  const regStatus = summary?.registrations?.status ?? "yellow";

  const payActual = summary?.payments?.actual ?? 0;
  const payTarget = summary?.payments?.target ?? 1;
  const payProgress = summary?.payments?.progress ?? 0;
  const payStatus = summary?.payments?.status ?? "yellow";

  const revenueActual = summary?.revenue?.actual ?? 0;
  const revenueTarget = summary?.revenue?.target ?? 1;
  const revenueProgress = summary?.revenue?.progress ?? 0;
  const revenueStatus = summary?.revenue?.status ?? "yellow";

  const eomRevenue = prediction?.eom_revenue ?? 0;
  const eomPayments = prediction?.eom_payments ?? 0;
  const confidence = prediction?.confidence ?? 0;
  const model = prediction?.model_used ?? "EWM";

  function statusLabel(status: string): string {
    if (status === "green") return t("biz.overview.label.achieved");
    if (status === "yellow") return t("biz.overview.label.belowTarget");
    return t("biz.overview.label.seriousLag");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t("biz.overview.title")}</h1>
        <p className="text-sm text-slate-400 mt-1">{t("biz.overview.subtitle")}</p>
      </div>

      <ErrorBoundary>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <BigMetricCard
            icon="📝"
            title={t("biz.overview.metric.registration")}
            value={regActual.toLocaleString()}
            subtitle={`${t("biz.overview.label.target")} ${regTarget.toLocaleString()} · ${t("biz.overview.label.gap")} ${Math.max(regTarget - regActual, 0).toLocaleString()}`}
            progress={regProgress}
            progressLabel={t("biz.overview.label.completionProgress")}
            status={regStatus}
            statusLabel={statusLabel(regStatus)}
          />

          <BigMetricCard
            icon="💰"
            title={t("biz.overview.metric.payment")}
            value={payActual.toLocaleString()}
            subtitle={`${t("biz.overview.label.target")} ${payTarget.toLocaleString()} 单`}
            progress={payProgress}
            progressLabel={t("biz.overview.label.completionProgress")}
            status={payStatus}
            statusLabel={statusLabel(payStatus)}
          />

          <BigMetricCard
            icon="💵"
            title={t("biz.overview.metric.revenue")}
            value={formatRevenue(revenueActual)}
            subtitle={`${t("biz.overview.label.target")} ${formatRevenue(revenueTarget)}`}
            progress={revenueProgress}
            progressLabel={t("biz.overview.label.revenueProgress")}
            status={revenueStatus}
            statusLabel={statusLabel(revenueStatus)}
          />

          <BigMetricCard
            icon="🔮"
            title={t("biz.overview.metric.prediction")}
            value={formatRevenue(eomRevenue)}
            subtitle={`付费预计 ${eomPayments} 单 · 模型 ${model} · 置信度 ${(confidence * 100).toFixed(0)}%`}
            status={eomPayments >= payTarget ? "green" : eomPayments >= payTarget * 0.9 ? "yellow" : "red"}
            statusLabel={eomPayments >= payTarget ? t("biz.overview.label.onTrack") : t("biz.overview.label.nearTarget")}
          />
        </div>

        {riskAlerts.length > 0 && (
          <Card title={t("biz.overview.card.risks")}>
            <ul className="space-y-2">
              {riskAlerts.slice(0, 5).map((a, i) => (
                <li
                  key={i}
                  className={`text-sm rounded-xl border px-4 py-2.5 ${
                    a.level === "critical"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : a.level === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-blue-200 bg-blue-50 text-blue-700"
                  }`}
                >
                  <span className="font-semibold mr-2">
                    {a.level === "critical" ? "🔴" : a.level === "warning" ? "🟡" : "🔵"}
                  </span>
                  {a.message}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title={`⚡ ${t("biz.overview.card.keyActions")}`}>
          <ActionList items={DEFAULT_ACTIONS} />
        </Card>
      </ErrorBoundary>
    </div>
  );
}
