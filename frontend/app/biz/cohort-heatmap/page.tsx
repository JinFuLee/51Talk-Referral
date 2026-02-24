"use client";

import { useTranslation } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { CohortRetentionHeatmap } from "@/components/charts/CohortRetentionHeatmap";
import { NorthStarGauge } from "@/components/charts/NorthStarGauge";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";

export default function CohortHeatmapPage() {
  const { t } = useTranslation();
  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t("biz.cohort-heatmap.title")} subtitle={t("biz.cohort-heatmap.subtitle")} />

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
