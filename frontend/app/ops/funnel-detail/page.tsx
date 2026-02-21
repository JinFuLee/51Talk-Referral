"use client";

import { useTranslation } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { FunnelEfficiencyPanel } from "@/components/charts/FunnelEfficiencyPanel";
import { SectionEfficiencyQuadrant } from "@/components/charts/SectionEfficiencyQuadrant";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function FunnelDetailPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t("ops.funnel-detail.title")}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{t("ops.funnel-detail.subtitle")}</p>
      </div>

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
