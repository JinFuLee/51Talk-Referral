"use client";

import { useSummary, useAnomalies, useRiskAlerts } from "@/lib/hooks";
import { KPICard } from "@/components/charts/KPICard";
import { RiskAlertList } from "@/components/dashboard/RiskAlertList";
import { AnomalyBadge } from "@/components/dashboard/AnomalyBadge";
import { RunAnalysisButton } from "@/components/dashboard/RunAnalysisButton";
import { AnomalyBanner } from "@/components/ops/AnomalyBanner";
import { GoalGapCard } from "@/components/ops/GoalGapCard";
import { TimeProgressBar } from "@/components/ops/TimeProgressBar";
import { Spinner } from "@/components/ui/Spinner";
import type { SummaryMetric } from "@/lib/types";

export default function OpsDashboardPage() {
  const { data: summaryData, isLoading: loadingSummary } = useSummary();
  const { data: anomalies = [] } = useAnomalies();
  const { data: alerts = [] } = useRiskAlerts();

  const summary = summaryData as Record<string, SummaryMetric> | undefined;

  function getMetric(key: string): SummaryMetric {
    return summary?.[key] ?? { actual: 0, target: 0, progress: 0, status: "red" };
  }

  const reg = getMetric("registrations");
  const pay = getMetric("payments");
  const rev = getMetric("revenue");
  const leads = getMetric("leads");
  const timeProgress = (summaryData as Record<string, unknown> | undefined)?.time_progress as number ?? 0;

  const kpis = [
    { title: "注册人数", ...reg, unit: "人" },
    { title: "付费人数", ...pay, unit: "人" },
    { title: "收入", ...rev, unit: "¥" },
    { title: "Leads", ...leads, unit: "" },
  ];

  if (loadingSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-none space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">运营总览</h1>
          <p className="text-xs text-slate-400 mt-0.5">T-1 数据，30 秒自动刷新</p>
        </div>
        <RunAnalysisButton />
      </div>

      {/* Anomaly banner */}
      <AnomalyBanner anomalies={anomalies} />

      {/* KPI cards 4-wide */}
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
          />
        ))}
      </div>

      {/* Time progress + Goal gaps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TimeProgressBar progress={timeProgress} />
        <GoalGapCard title="注册" actual={reg.actual} target={reg.target} unit="人" />
        <GoalGapCard title="付费" actual={pay.actual} target={pay.target} unit="人" />
      </div>

      {/* Risk + Anomalies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RiskAlertList alerts={alerts} />
        <AnomalyBadge anomalies={anomalies} />
      </div>
    </div>
  );
}
