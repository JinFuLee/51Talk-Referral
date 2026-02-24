"use client";

import { useTranslation } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { FunnelEfficiencyPanel } from "@/components/charts/FunnelEfficiencyPanel";
import { SectionEfficiencyQuadrant } from "@/components/charts/SectionEfficiencyQuadrant";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { OPS_PAGE } from "@/lib/layout";

export default function FunnelDetailPage() {
  const { t } = useTranslation();
  return (
    <div className={OPS_PAGE}>
      <PageHeader title={t("ops.funnel-detail.title")} subtitle={t("ops.funnel-detail.subtitle")} />

      <ErrorBoundary>
        <Card title={t("ops.funnel-detail.card.f1")}>
          <FunnelEfficiencyPanel />
        </Card>

        <Card title={t("ops.funnel-detail.card.f2")}>
          <SectionEfficiencyQuadrant />
        </Card>
      </ErrorBoundary>
    </div>
  );
}
