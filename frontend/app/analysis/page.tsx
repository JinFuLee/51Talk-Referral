"use client";

import { useState } from "react";
import { useFunnel, useChannelComparison, useROI, usePrediction, useAttribution } from "@/lib/hooks";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { ChannelBarChart } from "@/components/charts/ChannelBarChart";
import { ROICard } from "@/components/analysis/ROICard";
import { PredictionCard } from "@/components/analysis/PredictionCard";
import { AttributionPieChart } from "@/components/charts/AttributionPieChart";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export default function AnalysisPage() {
  const { data: funnel, isLoading: funnelLoading } = useFunnel();
  const { data: channel } = useChannelComparison();
  const { data: roi } = useROI();
  const { data: prediction } = usePrediction();
  const { data: attribution } = useAttribution();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">深度分析</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Funnel */}
        <Card title="转化漏斗">
          {funnelLoading ? (
            <Spinner />
          ) : funnel ? (
            <FunnelChart data={funnel as Record<string, unknown>} />
          ) : (
            <EmptyState />
          )}
        </Card>

        {/* Channel comparison */}
        <Card title="渠道对比（窄口 vs 宽口）">
          {channel ? (
            <ChannelBarChart data={channel as Record<string, unknown>} />
          ) : (
            <EmptyState />
          )}
        </Card>

        {/* Attribution */}
        <Card title="归因分析">
          {attribution ? (
            <AttributionPieChart data={attribution as Record<string, unknown>} />
          ) : (
            <EmptyState />
          )}
        </Card>

        {/* ROI */}
        <Card title="ROI 估算">
          {roi ? <ROICard data={roi as Record<string, unknown>} /> : <EmptyState />}
        </Card>
      </div>

      {/* Prediction */}
      <Card title="月末预测">
        {prediction ? (
          <PredictionCard data={prediction as Record<string, unknown>} />
        ) : (
          <EmptyState />
        )}
      </Card>
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
