"use client";

import { useState } from "react";
import { useTrend, usePrediction, useTranslation } from "@/lib/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";
import { formatRevenue } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { PredictionBandChart } from "@/components/charts/PredictionBandChart";
import { CheckinImpactCard } from "@/components/biz/CheckinImpactCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import type { TrendData, PredictionData } from "@/lib/types";

type CompareType = "mom" | "wow" | "yoy";

const METRIC_TABS = [
  { key: "registrations", label: "注册" },
  { key: "payments", label: "付费" },
  { key: "revenue", label: "收入" },
];

const COMPARE_TABS: { key: CompareType; label: string }[] = [
  { key: "mom", label: "月环比" },
  { key: "wow", label: "周环比" },
  { key: "yoy", label: "月同比" },
];

const DIRECTION_CONFIG = {
  rising:   { icon: "↑", color: "bg-emerald-100 text-emerald-700", text: "上升趋势" },
  falling:  { icon: "↓", color: "bg-rose-100 text-rose-700",    text: "下降趋势" },
  volatile: { icon: "~", color: "bg-amber-100 text-amber-700",  text: "波动" },
} as const;

function TrendBadge({ direction }: { direction?: string }) {
  if (!direction || direction === "insufficient") return null;
  const c = DIRECTION_CONFIG[direction as keyof typeof DIRECTION_CONFIG];
  if (!c) return null;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.color}`}>
      {c.icon} {c.text}
    </span>
  );
}

export default function BizTrendPage() {
  const { t } = useTranslation();
  const [compareType, setCompareType] = useState<CompareType>("mom");
  const [metricTab, setMetricTab] = useState("payments");

  const { data: trendResp, isLoading: tLoading } = useTrend(compareType);
  const { data: predResp, isLoading: pLoading } = usePrediction();

  if (tLoading || pLoading) {
    return (
      <div className={BIZ_PAGE}>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
        <Skeleton className="h-36" />
      </div>
    );
  }

  const trend = trendResp as TrendData | undefined;
  const prediction = predResp as PredictionData | undefined;

  const eomReg = prediction?.eom_registrations ?? 0;
  const eomPay = prediction?.eom_payments ?? 0;
  const eomRev = prediction?.eom_revenue ?? 0;
  const model = prediction?.model_used ?? "EWM";
  const conf = prediction?.confidence ?? 0;

  return (
    <div className={BIZ_PAGE}>
      <PageHeader
        title={t("biz.trend.title")}
        subtitle={
          trend?.peak && trend?.valley
            ? `${t("biz.trend.subtitle")} · ${t("biz.trend.label.peak")}: ${trend.peak.value.toLocaleString()} (${trend.peak.date}) | ${t("biz.trend.label.valley")}: ${trend.valley.value.toLocaleString()} (${trend.valley.date})`
            : t("biz.trend.subtitle")
        }
        badge={trend?.direction && trend.direction !== "insufficient" ? (trend.direction === "rising" ? "↑ 上升趋势" : trend.direction === "falling" ? "↓ 下降趋势" : "~ 波动") : undefined}
      >
        {/* Compare type toggle */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {COMPARE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCompareType(tab.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                compareType === tab.key
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </PageHeader>

      <ErrorBoundary>
        {/* Monthly trend */}
        <Card title={`📈 ${t("biz.trend.card.monthly")}`}>
          {/* Metric tabs */}
          <div className="flex gap-2 mb-4">
            {METRIC_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setMetricTab(tab.key)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  metricTab === tab.key
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {compareType === "wow" && (!trend || (trend.series ?? []).length < 2) ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              {t("biz.trend.label.noWoW")}
            </div>
          ) : (
            <TrendLineChart
              data={trend}
              xKey="date"
              yKey={metricTab}
              lineKeys={[metricTab]}
              peak={trend?.peak}
              valley={trend?.valley}
            />
          )}
        </Card>

        {/* Prediction + Checkin impact side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title={`🔮 ${t("biz.trend.card.prediction")}`}>
            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="text-xs text-slate-500">{t("biz.trend.label.predReg")}</p>
                <p className="text-2xl font-bold text-indigo-700">{eomReg.toLocaleString()}</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="text-xs text-slate-500">{t("biz.trend.label.predPay")}</p>
                <p className="text-2xl font-bold text-indigo-700">{eomPay.toLocaleString()}</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="text-xs text-slate-500">{t("biz.trend.label.confidence")}</p>
                <p className="text-2xl font-bold text-indigo-700">{(conf * 100).toFixed(0)}%</p>
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mb-2 px-1">
              <span>{t("biz.trend.label.model")}：{model}</span>
              <span>{t("biz.trend.label.predRevenue")}：{formatRevenue(eomRev)}</span>
            </div>
            <PredictionBandChart />
          </Card>

          <Card title={`✅ ${t("biz.trend.card.checkinCausal")}`}>
            <CheckinImpactCard />
          </Card>
        </div>

        {/* Model info */}
        <Card title={`🧠 ${t("biz.trend.card.modelInfo")}`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            {[
              { name: "线性回归", used: model === "LINEAR", desc: "适合稳定增长" },
              { name: "EWM 指数加权", used: model === "EWM" || !model, desc: "适合近期波动" },
              { name: "季节性分解", used: model === "SEASONAL", desc: "适合周期规律" },
            ].map((m) => (
              <div
                key={m.name}
                className={`rounded-xl border-2 p-4 ${
                  m.used
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-100 bg-slate-50"
                }`}
              >
                {m.used && (
                  <div className="text-xs font-semibold text-indigo-600 mb-1">{t("biz.trend.label.currentModel")}</div>
                )}
                <p className="font-semibold text-slate-700 text-sm">{m.name}</p>
                <p className="text-xs text-slate-400 mt-1">{m.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </ErrorBoundary>
    </div>
  );
}
