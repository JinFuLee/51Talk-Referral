"use client";

import { useTranslation } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { RetentionContributionRank } from "@/components/charts/RetentionContributionRank";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function RetentionRankPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t("ops.retention-rank.title")}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{t("ops.retention-rank.subtitle")}</p>
      </div>

      <ErrorBoundary>
        <Card title={t("ops.retention-rank.card.rank")}>
          <RetentionContributionRank />
        </Card>
      </ErrorBoundary>
    </div>
  );
}
