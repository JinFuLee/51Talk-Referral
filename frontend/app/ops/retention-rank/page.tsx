"use client";

import { useTranslation } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { RetentionContributionRank } from "@/components/charts/RetentionContributionRank";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { OPS_PAGE } from "@/lib/layout";

export default function RetentionRankPage() {
  const { t } = useTranslation();
  return (
    <div className={OPS_PAGE}>
      <PageHeader title={t("ops.retention-rank.title")} subtitle={t("ops.retention-rank.subtitle")} />

      <ErrorBoundary>
        <Card title={t("ops.retention-rank.card.rank")}>
          <RetentionContributionRank />
        </Card>
      </ErrorBoundary>
    </div>
  );
}
