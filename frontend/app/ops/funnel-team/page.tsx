"use client";

import { useTranslation } from "@/lib/hooks";
import { TeamFunnelComparison } from "@/components/ops/TeamFunnelComparison";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function FunnelTeamPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t("ops.funnel-team.title")}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{t("ops.funnel-team.subtitle")}</p>
      </div>

      <ErrorBoundary>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <TeamFunnelComparison />
        </div>
      </ErrorBoundary>
    </div>
  );
}
