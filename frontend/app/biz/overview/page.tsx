"use client";

import { useSummary, usePrediction, useRiskAlerts } from "@/lib/hooks";
import { formatRevenue } from "@/lib/utils";
import { BigMetricCard } from "@/components/biz/BigMetricCard";
import { ActionList } from "@/components/biz/ActionList";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import type { SummaryData, PredictionData, RiskAlert } from "@/lib/types";

const DEFAULT_ACTIONS = [
  { text: "24H 打卡率仅 31%，需推动 CC 执行", target: "目标 60%", priority: "high" as const },
  { text: "0-30 围场转化率最高 (25%)，建议加大资源投入", priority: "medium" as const },
  { text: "课前外呼→出席 lift 2.2x，强化课前触达", priority: "medium" as const },
];

export default function BizOverviewPage() {
  const { data: summaryResp, isLoading: sLoading } = useSummary();
  const { data: predictionResp, isLoading: pLoading } = usePrediction();
  const { data: alerts } = useRiskAlerts();

  if (sLoading || pLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const summary = (summaryResp as { summary?: SummaryData } | undefined)?.summary;
  const prediction = predictionResp as PredictionData | undefined;
  const riskAlerts = (alerts ?? []) as RiskAlert[];

  // Extract summary metrics with fallbacks
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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">泰国转介绍业务总览</h1>
        <p className="text-sm text-slate-400 mt-1">
          2026年2月 · 数据截至 T-1 · 业务视图
        </p>
      </div>

      {/* 4 Big Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <BigMetricCard
          icon="📝"
          title="本月注册"
          value={regActual.toLocaleString()}
          subtitle={`目标 ${regTarget.toLocaleString()} · 缺口 ${Math.max(regTarget - regActual, 0).toLocaleString()}`}
          progress={regProgress}
          progressLabel="完成进度"
          status={regStatus}
          statusLabel={regStatus === "green" ? "达标" : regStatus === "yellow" ? "略低于目标" : "严重落后"}
        />

        <BigMetricCard
          icon="💰"
          title="本月付费"
          value={payActual.toLocaleString()}
          subtitle={`目标 ${payTarget.toLocaleString()} 单`}
          progress={payProgress}
          progressLabel="完成进度"
          status={payStatus}
          statusLabel={payStatus === "green" ? "达标" : payStatus === "yellow" ? "略低于目标" : "严重落后"}
        />

        <BigMetricCard
          icon="💵"
          title="本月收入"
          value={formatRevenue(revenueActual)}
          subtitle={`目标 ${formatRevenue(revenueTarget)}`}
          progress={revenueProgress}
          progressLabel="收入进度"
          status={revenueStatus}
          statusLabel={revenueStatus === "green" ? "达标" : revenueStatus === "yellow" ? "略低于目标" : "严重落后"}
        />

        <BigMetricCard
          icon="🔮"
          title="月底预测"
          value={formatRevenue(eomRevenue)}
          subtitle={`付费预计 ${eomPayments} 单 · 模型 ${model} · 置信度 ${(confidence * 100).toFixed(0)}%`}
          status={eomPayments >= payTarget ? "green" : eomPayments >= payTarget * 0.9 ? "yellow" : "red"}
          statusLabel={eomPayments >= payTarget ? "有望达标" : "接近目标"}
        />
      </div>

      {/* Risk alerts */}
      {riskAlerts.length > 0 && (
        <Card title="主要风险">
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

      {/* Key actions */}
      <Card title="⚡ 本周关键行动">
        <ActionList items={DEFAULT_ACTIONS} />
      </Card>
    </div>
  );
}
