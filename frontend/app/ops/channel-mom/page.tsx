"use client";

import { useTranslation } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { ChannelMoMTrend } from "@/components/charts/ChannelMoMTrend";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function ChannelMoMPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t("ops.channel-mom.title")}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{t("ops.channel-mom.subtitle")}</p>
      </div>

      <ErrorBoundary>
        <Card title={t("ops.channel-mom.card.trend")}>
          <ChannelMoMTrend />
        </Card>
      </ErrorBoundary>
    </div>
  );
}
