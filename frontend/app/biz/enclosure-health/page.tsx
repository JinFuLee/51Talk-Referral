"use client";

import { useTranslation } from "@/lib/hooks";
import { EnclosureHealthDashboard } from "@/components/charts/EnclosureHealthDashboard";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";

export default function EnclosureHealthPage() {
  const { t } = useTranslation();
  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t("biz.enclosure-health.title")} subtitle={t("biz.enclosure-health.subtitle")} />

      <ErrorBoundary>
        <EnclosureHealthDashboard />
      </ErrorBoundary>
    </div>
  );
}
