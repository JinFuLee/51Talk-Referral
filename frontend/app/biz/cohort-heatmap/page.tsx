"use client";

import { useTranslation } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { CohortRetentionHeatmap } from "@/components/charts/CohortRetentionHeatmap";
import { NorthStarGauge } from "@/components/charts/NorthStarGauge";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function CohortHeatmapPage() {
  const { t } = useTranslation();
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t("biz.cohort-heatmap.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("biz.cohort-heatmap.subtitle")}</p>
      </div>

      <ErrorBoundary>
        <Card title={t("biz.cohort-heatmap.card.gauge")}>
          <NorthStarGauge />
        </Card>

        <Card title={t("biz.cohort-heatmap.card.heatmap")}>
          <CohortRetentionHeatmap />
        </Card>
      </ErrorBoundary>
    </div>
  );
}
