"use client";

import { useState } from "react";
import { useFunnel, useChannelComparison, useTranslation } from "@/lib/hooks";
import { clsx } from "clsx";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { ChannelBarChart } from "@/components/charts/ChannelBarChart";
import { ChannelComparisonTable } from "@/components/ops/ChannelComparisonTable";
import { StudentJourneyFlow } from "@/components/ops/StudentJourneyFlow";
import { TeamFunnelComparison } from "@/components/ops/TeamFunnelComparison";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import type { FunnelData, ChannelComparisonData, ChannelStat } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { OPS_PAGE } from "@/lib/layout";

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { key: "overview", label: "转化漏斗" },
  { key: "team", label: "团队漏斗" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ── Sub-tabs ──────────────────────────────────────────────────────────────────

function OverviewTab() {
  const { t } = useTranslation();
  const { data: funnelRaw, isLoading: loadingFunnel } = useFunnel();
  const { data: channelRaw, isLoading: loadingChannel } = useChannelComparison();

  const funnel = funnelRaw as FunnelData | undefined;
  const channelData = channelRaw as ChannelComparisonData | undefined;
  const channels: ChannelStat[] = channelData?.channels ?? [];

  const narrow = funnel?.cc_narrow ?? funnel?.total;
  const funnelStages = narrow
    ? [
        { name: "有效学员", value: narrow.valid_students ?? 0 },
        { name: "触达学员", value: Math.round((narrow.valid_students ?? 0) * (narrow.rates?.contact_rate ?? 0)) },
        { name: "参与学员", value: Math.round((narrow.valid_students ?? 0) * (narrow.rates?.participation_rate ?? 0)) },
        { name: "注册人数", value: narrow.register ?? narrow.registrations ?? 0 },
        { name: "付费人数", value: narrow.paid ?? narrow.payments ?? 0 },
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
      <div className="space-y-4">
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
    <div className="space-y-4">
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
            <ChannelBarChart data={channelData ?? { channels: [] }} />
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

function TeamTab() {
  return (
    <div className="space-y-4">
      <ErrorBoundary>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <TeamFunnelComparison />
        </div>
      </ErrorBoundary>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OpsFunnelPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <div className={OPS_PAGE}>
      <PageHeader title={t("ops.funnel.title")} subtitle={t("ops.funnel.subtitle")} />

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              "px-3 py-1.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "team" && <TeamTab />}
    </div>
  );
}
