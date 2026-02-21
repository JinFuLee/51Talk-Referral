"use client";

import { useFunnel, useChannelComparison } from "@/lib/hooks";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { ChannelBarChart } from "@/components/charts/ChannelBarChart";
import { ChannelComparisonTable } from "@/components/ops/ChannelComparisonTable";
import { StudentJourneyFlow } from "@/components/ops/StudentJourneyFlow";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import type { FunnelData, ChannelComparisonData, ChannelStat } from "@/lib/types";

export default function OpsFunnelPage() {
  const { data: funnelRaw, isLoading: loadingFunnel } = useFunnel();
  const { data: channelRaw, isLoading: loadingChannel } = useChannelComparison();

  const funnel = funnelRaw as FunnelData | undefined;
  const channelData = channelRaw as ChannelComparisonData | undefined;
  const channels: ChannelStat[] = channelData?.channels ?? [];

  // Build funnel stages from narrow channel data
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

  // Journey steps derived from funnel
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
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-none space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">转化漏斗</h1>
          <p className="text-xs text-slate-400 mt-0.5">窄口 vs 宽口 · 学员旅程分析</p>
        </div>
      </div>

      <GlossaryBanner terms={[
        { term: "窄口", definition: "员工链接绑定(高质量)" },
        { term: "宽口", definition: "学员链接绑定(低质量)" },
        { term: "有效学员", definition: "次卡>0且在有效期内" },
        { term: "触达率", definition: "有效通话(≥120s)学员/有效学员" },
        { term: "参与率", definition: "带来≥1注册的学员/有效学员" },
      ]} />

      {/* Funnel + Channel comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="转化漏斗（窄口）">
          <FunnelChart stages={funnelStages} />
        </Card>
        <Card title="口径对比">
          <ChannelBarChart data={channelRaw as Record<string, unknown> ?? {}} />
        </Card>
      </div>

      {/* Student journey */}
      <Card title="学员旅程">
        <StudentJourneyFlow steps={journeySteps} />
      </Card>

      {/* Channel detail table */}
      <Card title="口径明细">
        <ChannelComparisonTable channels={channels} />
      </Card>
    </div>
  );
}
