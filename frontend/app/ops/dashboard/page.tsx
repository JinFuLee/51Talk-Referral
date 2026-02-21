"use client";

import { useSummary, useAnomalies, useRiskAlerts, useProductivity, useTranslation } from "@/lib/hooks";
import { KPICard } from "@/components/charts/KPICard";
import { RiskAlertList } from "@/components/dashboard/RiskAlertList";
import { AnomalyBadge } from "@/components/dashboard/AnomalyBadge";
import { RunAnalysisButton } from "@/components/dashboard/RunAnalysisButton";
import { AnomalyBanner } from "@/components/ops/AnomalyBanner";
import { GoalGapCard } from "@/components/ops/GoalGapCard";
import { TimeProgressBar } from "@/components/ops/TimeProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import type { SummaryMetric } from "@/lib/types";

export default function OpsDashboardPage() {
  const { t } = useTranslation();
  const { data: summaryData, isLoading: loadingSummary } = useSummary();
  const { data: anomalies = [] } = useAnomalies();
  const { data: alerts = [] } = useRiskAlerts();
  const { data: productivityRaw } = useProductivity();

  const summary = summaryData as Record<string, SummaryMetric> | undefined;
  const productivity = productivityRaw as Record<string, Record<string, number>> | undefined;

  function getMetric(key: string): SummaryMetric {
    return summary?.[key] ?? { actual: 0, target: 0, progress: 0, status: "red" };
  }

  const reg = getMetric("registrations");
  const pay = getMetric("payments");
  const rev = getMetric("revenue");
  const leads = getMetric("leads");
  const timeProgress = (summaryData as Record<string, unknown> | undefined)?.time_progress as number ?? 0;

  function remainingDailyAvg(metric: SummaryMetric): number | undefined {
    if (!timeProgress || timeProgress >= 1) return undefined;
    const remainingDays = Math.max(1, Math.round((1 - timeProgress) * 30));
    const gap = Math.max(metric.target - metric.actual, 0);
    return Math.round(gap / remainingDays);
  }

  function efficiencyLiftPct(metric: SummaryMetric): number | undefined {
    if (!timeProgress || timeProgress <= 0) return undefined;
    const expected = metric.target * timeProgress;
    if (!expected) return undefined;
    return parseFloat((((expected - metric.actual) / expected) * 100).toFixed(1));
  }

  const kpis = [
    {
      title: t("ops.dashboard.kpi.registrations"), ...reg, unit: "人",
      remaining_daily_avg: (summaryData as Record<string, unknown> | undefined)?.reg_remaining_daily_avg as number | undefined ?? remainingDailyAvg(reg),
      efficiency_lift_pct: (summaryData as Record<string, unknown> | undefined)?.reg_efficiency_lift_pct as number | undefined ?? efficiencyLiftPct(reg),
    },
    {
      title: t("ops.dashboard.kpi.payments"), ...pay, unit: "人",
      remaining_daily_avg: (summaryData as Record<string, unknown> | undefined)?.pay_remaining_daily_avg as number | undefined ?? remainingDailyAvg(pay),
      efficiency_lift_pct: (summaryData as Record<string, unknown> | undefined)?.pay_efficiency_lift_pct as number | undefined ?? efficiencyLiftPct(pay),
    },
    { title: t("ops.dashboard.kpi.revenue"), ...rev, unit: "$" },
    { title: "Leads", ...leads, unit: "" },
  ];

  if (loadingSummary) {
    return (
      <div className="max-w-none space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-24" />
      </div>
    );
  }

  const hasAlertsOrAnomalies = alerts.length > 0 || anomalies.length > 0;

  const sections = [
    {
      id: "kpis",
      priority: 100,
      content: (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <KPICard
              key={kpi.title}
              title={kpi.title}
              actual={kpi.actual}
              target={kpi.target}
              unit={kpi.unit}
              status={kpi.status}
              progress={kpi.progress}
              remaining_daily_avg={"remaining_daily_avg" in kpi ? kpi.remaining_daily_avg : undefined}
              efficiency_lift_pct={"efficiency_lift_pct" in kpi ? kpi.efficiency_lift_pct : undefined}
            />
          ))}
        </div>
      )
    },
    {
      id: "risks",
      priority: hasAlertsOrAnomalies ? 90 : 10,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RiskAlertList alerts={alerts} />
          <AnomalyBadge anomalies={anomalies} />
        </div>
      )
    },
    {
      id: "progress",
      priority: 50,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TimeProgressBar progress={timeProgress} />
          <GoalGapCard title="注册" actual={reg.actual} target={reg.target} unit="人" />
          <GoalGapCard title="付费" actual={pay.actual} target={pay.target} unit="人" />
        </div>
      )
    },
    {
      id: "productivity",
      priority: 30,
      content: productivity ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">{t("ops.dashboard.label.perCapita")}</p>
          <div className="grid grid-cols-3 gap-4">
            {(["cc", "ss", "lp"] as const).map((role) => {
              const r = productivity?.[role];
              if (!r) return null;
              return (
                <div key={role} className="text-center">
                  <p className="text-xs text-slate-500 uppercase mb-1">{role.toUpperCase()}</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${Math.round(r.per_capita ?? r.per_capita_usd ?? 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400">{t("ops.dashboard.label.perCapitaUnit")}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null,
    },
  ].filter((s) => s.content != null);

  const orderedSections = [...sections].sort((a, b) => b.priority - a.priority);

  return (
    <div className="max-w-none space-y-4">
      <div className="flex items-center justify-between shadow-sm pb-2 mb-2 border-b border-transparent">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {t("ops.dashboard.title")}
            {hasAlertsOrAnomalies && (
              <span className="text-xs bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full flex items-center ml-2">
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-1 animate-pulse"></span>
                {t("ops.dashboard.label.aiLayout")}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{t("ops.dashboard.subtitle")}</p>
        </div>
        <RunAnalysisButton />
      </div>

      <AnomalyBanner anomalies={anomalies} />

      <ErrorBoundary>
        {orderedSections.map((section) => (
          <div key={section.id} className="transition-all duration-500 animate-in fade-in slide-in-from-bottom-2">
            {section.content}
          </div>
        ))}
      </ErrorBoundary>
    </div>
  );
}
