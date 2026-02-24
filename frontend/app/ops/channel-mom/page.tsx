"use client";

import { useTranslation } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { ChannelMoMTrend } from "@/components/charts/ChannelMoMTrend";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { OPS_PAGE } from "@/lib/layout";

export default function ChannelMoMPage() {
  const { t } = useTranslation();
  return (
    <div className={OPS_PAGE}>
      <PageHeader title={t("ops.channel-mom.title")} subtitle={t("ops.channel-mom.subtitle")} />

      <ErrorBoundary>
        <Card title={t("ops.channel-mom.card.trend")}>
          <ChannelMoMTrend />
        </Card>
      </ErrorBoundary>
    </div>
  );
}
