"use client";

import { useImpactChain, useTranslation } from "@/lib/hooks";
import { formatRevenue } from "@/lib/utils";
import { ImpactWaterfallChart } from "@/components/biz/ImpactWaterfallChart";
import { WhatIfSimulator } from "@/components/biz/WhatIfSimulator";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function ImpactChainPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useImpactChain();

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {error ? `${t("biz.impact.label.loadError")}: ${error.message}` : t("biz.impact.label.noData")}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t("biz.impact.title")}</h1>
        <p className="text-sm text-slate-400 mt-1">{t("biz.impact.subtitle")}</p>
      </div>

      <ErrorBoundary>
        {/* Summary row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4">
            <p className="text-xs text-red-400 font-medium">{t("biz.impact.label.totalLoss")}</p>
            <p className="text-xl font-bold text-red-700 mt-1">
              {formatRevenue(data.total_lost_revenue_usd)}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4">
            <p className="text-xs text-amber-500 font-medium">{t("biz.impact.label.topLever")}</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{data.top_lever_label}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-4">
            <p className="text-xs text-slate-400 font-medium">{t("biz.impact.label.metricCount")}</p>
            <p className="text-xl font-bold text-slate-700 mt-1">{data.chains.length} 项</p>
          </div>
        </div>

        {/* Waterfall chart */}
        <Card
          title={t("biz.impact.card.waterfall")}
          actions={
            <span className="text-xs text-slate-400">
              {t("biz.impact.label.totalLoss")}: {formatRevenue(data.total_lost_revenue_usd)} · {t("biz.impact.label.topLever")}: {data.top_lever_label}
            </span>
          }
        >
          <ImpactWaterfallChart data={data} />
        </Card>

        {/* What-if simulator */}
        <Card title={t("biz.impact.card.whatif")}>
          <p className="text-xs text-slate-500 mb-4">{t("biz.impact.label.whatifDesc")}</p>
          <WhatIfSimulator chains={data.chains} />
        </Card>
      </ErrorBoundary>
    </div>
  );
}
