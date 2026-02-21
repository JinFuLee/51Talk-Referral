"use client";

import { useState } from "react";
import { useFunnel, useChannelComparison, useROI, usePrediction, useAttribution, useTranslation } from "@/lib/hooks";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { ChannelBarChart } from "@/components/charts/ChannelBarChart";
import { ROICard } from "@/components/analysis/ROICard";
import { PredictionCard } from "@/components/analysis/PredictionCard";
import { AttributionPieChart } from "@/components/charts/AttributionPieChart";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function AnalysisPage() {
  const { t } = useTranslation();
  const { data: funnel, isLoading: funnelLoading } = useFunnel();
  const { data: channel } = useChannelComparison();
  const { data: roi } = useROI();
  const { data: prediction } = usePrediction();
  const { data: attribution } = useAttribution();

  void useState; // satisfy import

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{t("analysis.title")}</h1>

      <ErrorBoundary>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Funnel */}
          <Card title={t("analysis.card.funnel")}>
            {funnelLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : funnel ? (
              <FunnelChart data={funnel as Record<string, unknown>} />
            ) : (
              <EmptyState />
            )}
          </Card>

          {/* Channel comparison */}
          <Card title={t("analysis.card.channel")}>
            {channel ? (
              <ChannelBarChart data={channel as Record<string, unknown>} />
            ) : (
              <EmptyState />
            )}
          </Card>

          {/* Attribution */}
          <Card title={t("analysis.card.attribution")}>
            {attribution ? (
              <AttributionPieChart data={attribution as Record<string, unknown>} />
            ) : (
              <EmptyState />
            )}
          </Card>

          {/* ROI */}
          <Card title={t("analysis.card.roi")}>
            {roi ? <ROICard data={roi as Record<string, unknown>} /> : <EmptyState />}
          </Card>
        </div>

        {/* Prediction */}
        <Card title={t("analysis.card.prediction")}>
          {prediction ? (
            <PredictionCard data={prediction as Record<string, unknown>} />
          ) : (
            <EmptyState />
          )}
        </Card>
      </ErrorBoundary>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
      暂无数据
    </div>
  );
}
