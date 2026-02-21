"use client";

import { useTranslation } from "@/lib/hooks";
import { EnclosureHealthDashboard } from "@/components/charts/EnclosureHealthDashboard";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function EnclosureHealthPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t("biz.enclosure-health.title")}</h1>
        <p className="text-sm text-slate-400 mt-1">{t("biz.enclosure-health.subtitle")}</p>
      </div>

      <ErrorBoundary>
        <EnclosureHealthDashboard />
      </ErrorBoundary>
    </div>
  );
}
