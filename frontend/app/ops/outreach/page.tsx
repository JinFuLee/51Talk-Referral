"use client";

import { useFollowup, useTranslation } from "@/lib/hooks";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { OutreachHeatmap } from "@/components/charts/OutreachHeatmap";
import { CCOutreachTable } from "@/components/ops/CCOutreachTable";
import { StatMiniCard } from "@/components/ui/StatMiniCard";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function OpsOutreachPage() {
  const { t } = useTranslation();
  const { data: outreachRaw, isLoading } = useFollowup();

  const outreach = outreachRaw as Record<string, unknown> | undefined;

  const totalCalls = (outreach?.total_calls as number) ?? 0;
  const totalConnects = (outreach?.total_connects as number) ?? 0;
  const totalEffective = (outreach?.total_effective as number) ?? 0;
  const contactRate = (outreach?.contact_rate as number) ?? 0;
  const effectiveRate = (outreach?.effective_rate as number) ?? 0;
  const avgDuration = (outreach?.avg_duration_min as number) ?? (outreach?.avg_duration_s as number) ?? 0;

  const dailyTrend = (outreach?.daily_trend as Array<Record<string, unknown>>) ?? [];
  const ccBreakdownRaw = (outreach?.cc_breakdown as Array<Record<string, unknown>>) ?? [];

  const ccBreakdown = ccBreakdownRaw.map((row) => ({
    name: (row.name ?? row.cc_name ?? "—") as string,
    calls: (row.calls ?? row.total_calls ?? 0) as number,
    contact_rate: (row.contact_rate ?? 0) as number,
    effective_rate: (row.effective_rate ?? 0) as number,
    avg_duration_s: (row.avg_duration_s ?? 0) as number,
    achieved: (row.achieved ?? false) as boolean,
  }));

  const heatmapData = dailyTrend.map((d) => ({
    date: d.date as string,
    calls: (d.calls as number) ?? 0,
  }));

  if (isLoading) {
    return (
      <div className="max-w-none space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Suppress unused variable warnings
  void totalConnects;
  void totalEffective;

  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t("ops.outreach.title")}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{t("ops.outreach.subtitle")}</p>
      </div>

      <GlossaryBanner terms={[
        { term: "有效接通", definition: "通话≥120秒" },
        { term: "均时", definition: "平均通话时长" },
        { term: "接通率", definition: "接通呼叫/总拨打量" },
      ]} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatMiniCard label={t("ops.outreach.card.totalCalls")} value={totalCalls.toLocaleString()} accent="blue" />
        <StatMiniCard label={t("ops.outreach.card.contactRate")} value={`${(contactRate * 100).toFixed(1)}%`} accent="green" />
        <StatMiniCard label={t("ops.outreach.card.effectiveRate")} value={`${(effectiveRate * 100).toFixed(1)}%`} accent="yellow" />
        <StatMiniCard label={t("ops.outreach.card.avgDuration")} value={`${avgDuration.toFixed(0)}s`} accent="slate" />
      </div>

      <ErrorBoundary>
        <Card title={t("ops.outreach.card.heatmap")}>
          <OutreachHeatmap data={heatmapData} />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title={t("ops.outreach.card.ccDetail")}>
            <div className="overflow-x-auto">
              <CCOutreachTable data={ccBreakdown} />
            </div>
          </Card>
          <Card title={t("ops.outreach.card.trend")}>
            <TrendLineChart
              data={dailyTrend}
              xKey="date"
              lineKeys={["contacted", "effective_calls"]}
              barKeys={["calls"]}
            />
          </Card>
        </div>
      </ErrorBoundary>
    </div>
  );
}
