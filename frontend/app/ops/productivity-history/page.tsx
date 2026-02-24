"use client";

import { useTranslation } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { ProductivityHistoryChart } from "@/components/charts/ProductivityHistoryChart";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { OPS_PAGE } from "@/lib/layout";

export default function ProductivityHistoryPage() {
  const { t } = useTranslation();
  return (
    <div className={OPS_PAGE}>
      <PageHeader title={t("ops.productivity-history.title")} subtitle={t("ops.productivity-history.subtitle")} />
      <ErrorBoundary>
        <Card title={t("ops.productivity-history.card.chart")}>
          <ProductivityHistoryChart />
        </Card>
      </ErrorBoundary>
    </div>
  );
}
