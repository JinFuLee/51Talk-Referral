"use client";

import { useFunnel, useChannelComparison, useTranslation } from "@/lib/hooks";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { ChannelBarChart } from "@/components/charts/ChannelBarChart";
import { ChannelComparisonTable } from "@/components/ops/ChannelComparisonTable";
import { StudentJourneyFlow } from "@/components/ops/StudentJourneyFlow";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import type { FunnelData, ChannelComparisonData, ChannelStat } from "@/lib/types";

export default function OpsFunnelPage() {
  const { t } = useTranslation();
  const { data: funnelRaw, isLoading: loadingFunnel } = useFunnel();
  const { data: channelRaw, isLoading: loadingChannel } = useChannelComparison();

  const funnel = funnelRaw as FunnelData | undefined;
  const channelData = channelRaw as ChannelComparisonData | undefined;
  const channels: ChannelStat[] = channelData?.channels ?? [];

  const narrow = funnel?.narrow ?? funnel?.total;
  const funnelStages = narrow
    ? [
        { name: "有效学员", value: narrow.valid_students ?? 0 },
        { name: "触达学员", value: Math.round((narrow.valid_students ?? 0) * narrow.contact_rate) },
        { name: "参与学员", value: Math.round((narrow.valid_students ?? 0) * narrow.participation_rate) },
        { name: "注册人数", value: narrow.registrations ?? 0 },
        { name: "付费人数", value: narrow.payments ?? 0 },
      ]
    : [];

  const journeySteps = funnelStages.map((s, i) => ({
    label: s.name,
    value: s.value,
    dropRate:
      i > 0 && funnelStages[i - 1].value > 0
        ? ((funnelStages[i - 1].value - s.value) / funnelStages[i - 1].value) * 100
        : undefined,
  }));

  if (loadingFunnel || loadingChannel) {
    return (
      <div className="max-w-none space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="max-w-none space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{t("ops.funnel.title")}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{t("ops.funnel.subtitle")}</p>
        </div>
      </div>

      <GlossaryBanner terms={[
        { term: "窄口", definition: "员工链接绑定(高质量)" },
        { term: "宽口", definition: "学员链接绑定(低质量)" },
        { term: "有效学员", definition: "次卡>0且在有效期内" },
        { term: "触达率", definition: "有效通话(≥120s)学员/有效学员" },
        { term: "参与率", definition: "带来≥1注册的学员/有效学员" },
      ]} />

      <ErrorBoundary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title={t("ops.funnel.card.narrow")}>
            <FunnelChart stages={funnelStages} />
          </Card>
          <Card title={t("ops.funnel.card.channelCompare")}>
            <ChannelBarChart data={channelRaw as Record<string, unknown> ?? {}} />
          </Card>
        </div>

        <Card title={t("ops.funnel.card.journey")}>
          <StudentJourneyFlow steps={journeySteps} />
        </Card>

        <Card title={t("ops.funnel.card.detail")}>
          <div className="overflow-x-auto">
            <ChannelComparisonTable channels={channels} />
          </div>
        </Card>
      </ErrorBoundary>
    </div>
  );
}
