"use client";

import { useSummary, useAnomalies, useRiskAlerts, useProductivity, useTranslation, useCompareSummary, useKPISparkline } from "@/lib/hooks";
import { KPICard } from "@/components/charts/KPICard";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { glossaryConfig } from "@/lib/glossary-config";
import { kpiDrilldownMap } from "@/lib/drilldown-config";
import { RiskAlertList } from "@/components/dashboard/RiskAlertList";
import { AnomalyBadge } from "@/components/dashboard/AnomalyBadge";
import { RunAnalysisButton } from "@/components/dashboard/RunAnalysisButton";
import { AnomalyBanner } from "@/components/ops/AnomalyBanner";
import { ReportGenerator } from "@/components/biz/ReportGenerator";
import { GoalGapCard } from "@/components/ops/GoalGapCard";
import { TimeProgressBar } from "@/components/ops/TimeProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { useConfigStore } from "@/lib/stores/config-store";
import type { SummaryMetric } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { OPS_PAGE } from "@/lib/layout";

export default function OpsDashboardPage() {
  const { t } = useTranslation();
  const selectionContext = useConfigStore((s) => s.selectionContext);
  const clearSelectionContext = useConfigStore((s) => s.clearSelectionContext);
  const { data: summaryData, isLoading: loadingSummary } = useSummary();
  const { data: anomalies = [] } = useAnomalies();
  const { data: alerts = [] } = useRiskAlerts();
  const { data: productivityRaw } = useProductivity();
  const { data: comparison } = useCompareSummary();
  const { data: sparklineData } = useKPISparkline();

  const summary = summaryData as Record<string, SummaryMetric> | undefined;
  const productivity = productivityRaw as Record<string, Record<string, number>> | undefined;
  const compMetrics = comparison?.available ? comparison.metrics : null;
  const sparkMetrics = sparklineData?.available ? sparklineData.metrics : null;

  // KPI metric key 到 sparkline metric key 的映射
  const SPARK_KEY_MAP: Record<string, string> = {
    registrations: "registration",
    payments: "payment",
    revenue: "revenue",
  };

  function getMetric(key: string): SummaryMetric {
    return summary?.[key] ?? { actual: 0, target: 0, progress: 0, status: "red" };
  }

  const reg = getMetric("registrations");
  const pay = getMetric("payments");
  const rev = getMetric("revenue");
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

  // 从正确层级读取 remaining_daily_avg / efficiency_lift_pct
  // 后端 /api/analysis/summary 通过 **adapted 展开，顶层即含 registrations/payments 对象
  // getMetric() 返回的 SummaryMetric 已包含这两个字段，直接读取，fallback 用本地计算

  function absoluteGap(metric: SummaryMetric): number {
    return metric.absolute_gap ?? (metric.actual - metric.target);
  }

  function timeProgressGap(metric: SummaryMetric): number {
    if (!timeProgress || metric.target === 0) return 0;
    return metric.actual / metric.target - timeProgress;
  }

  const kpis = [
    {
      title: t("ops.dashboard.kpi.registrations"), ...reg, unit: "人",
      remaining_daily_avg: reg.remaining_daily_avg ?? remainingDailyAvg(reg),
      efficiency_lift_pct: reg.efficiency_lift_pct ?? efficiencyLiftPct(reg),
      absolute_gap: absoluteGap(reg),
      gap: timeProgressGap(reg),
      pace_daily_needed: reg.pace_daily_needed,
      current_daily_avg: reg.daily_avg,
      kpiKey: "registrations",
    },
    {
      title: t("ops.dashboard.kpi.payments"), ...pay, unit: "人",
      remaining_daily_avg: pay.remaining_daily_avg ?? remainingDailyAvg(pay),
      efficiency_lift_pct: pay.efficiency_lift_pct ?? efficiencyLiftPct(pay),
      absolute_gap: absoluteGap(pay),
      gap: timeProgressGap(pay),
      pace_daily_needed: pay.pace_daily_needed,
      current_daily_avg: pay.daily_avg,
      kpiKey: "payments",
    },
    {
      title: t("ops.dashboard.kpi.revenue"), ...rev, unit: "$", kpiKey: "revenue",
      absolute_gap: absoluteGap(rev),
      gap: timeProgressGap(rev),
      pace_daily_needed: rev.pace_daily_needed,
      current_daily_avg: rev.daily_avg,
    },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const cm = compMetrics?.[kpi.kpiKey];
            const comparisonProp = cm
              ? {
                  value: cm.compare,
                  changePct: cm.change_pct,
                  label: comparison?.label ?? "",
                }
              : null;
            const sparkKey = SPARK_KEY_MAP[kpi.kpiKey];
            const sparklineDailyData = sparkKey
              ? (sparkMetrics?.[sparkKey]?.daily ?? null)
              : null;
            const drilldown = kpiDrilldownMap[kpi.kpiKey];
            return (
              <KPICard
                key={kpi.title}
                variant="compact"
                title={kpi.title}
                actual={kpi.actual}
                target={kpi.target}
                unit={kpi.unit}
                status={kpi.status}
                progress={kpi.progress}
                absolute_gap={"absolute_gap" in kpi ? kpi.absolute_gap : undefined}
                gap={"gap" in kpi ? kpi.gap : undefined}
                pace_daily_needed={"pace_daily_needed" in kpi ? kpi.pace_daily_needed : undefined}
                current_daily_avg={"current_daily_avg" in kpi ? kpi.current_daily_avg : undefined}
                remaining_daily_avg={"remaining_daily_avg" in kpi ? kpi.remaining_daily_avg : undefined}
                efficiency_lift_pct={"efficiency_lift_pct" in kpi ? kpi.efficiency_lift_pct : undefined}
                mom_prev={summary?.[kpi.kpiKey]?.mom_prev}
                mom_change={summary?.[kpi.kpiKey]?.mom_change}
                mom_change_pct={summary?.[kpi.kpiKey]?.mom_change_pct}
                sparkline={sparklineDailyData}
                comparison={comparisonProp}
                drilldownHref={drilldown?.href}
                drilldownLabel={drilldown?.label}
              />
            );
          })}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <TimeProgressBar progress={timeProgress} />
          <GoalGapCard title="注册" actual={reg.actual} target={reg.target} unit="人" drilldownHref={kpiDrilldownMap.registrations?.href} drilldownLabel={kpiDrilldownMap.registrations?.label} />
          <GoalGapCard title="付费" actual={pay.actual} target={pay.target} unit="人" drilldownHref={kpiDrilldownMap.payments?.href} drilldownLabel={kpiDrilldownMap.payments?.label} />
        </div>
      )
    },
    {
      id: "ai-report",
      priority: 20,
      content: (
        <ReportGenerator />
      ),
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
    <div className={OPS_PAGE}>
      <PageHeader
        title={t("ops.dashboard.title")}
        subtitle={t("ops.dashboard.subtitle")}
        badge={hasAlertsOrAnomalies ? t("ops.dashboard.label.aiLayout") : undefined}
        badgeColor="bg-brand-100 text-brand-600"
      >
        <RunAnalysisButton />
      </PageHeader>

      <GlossaryBanner terms={glossaryConfig.ops_dashboard} />

      {selectionContext?.type === 'cc' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
          <span>当前聚焦：<strong>{selectionContext.value}</strong></span>
          <button
            onClick={clearSelectionContext}
            className="ml-auto text-xs text-blue-500 hover:text-blue-700 underline"
          >
            清除
          </button>
        </div>
      )}

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
