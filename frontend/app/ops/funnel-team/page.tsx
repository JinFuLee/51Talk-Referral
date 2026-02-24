"use client";

import { useTranslation } from "@/lib/hooks";
import { TeamFunnelComparison } from "@/components/ops/TeamFunnelComparison";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { OPS_PAGE } from "@/lib/layout";

export default function FunnelTeamPage() {
  const { t } = useTranslation();
  return (
    <div className={OPS_PAGE}>
      <PageHeader title={t("ops.funnel-team.title")} subtitle={t("ops.funnel-team.subtitle")} />

      <ErrorBoundary>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <TeamFunnelComparison />
        </div>
      </ErrorBoundary>
    </div>
  );
}
