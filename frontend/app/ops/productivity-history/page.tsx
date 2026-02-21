"use client";

import { useTranslation } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { ProductivityHistoryChart } from "@/components/charts/ProductivityHistoryChart";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function ProductivityHistoryPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t("ops.productivity-history.title")}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{t("ops.productivity-history.subtitle")}</p>
      </div>
      <ErrorBoundary>
        <Card title={t("ops.productivity-history.card.chart")}>
          <ProductivityHistoryChart />
        </Card>
      </ErrorBoundary>
    </div>
  );
}
