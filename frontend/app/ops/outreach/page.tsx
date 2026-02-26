"use client";

import { useState } from "react";
import { useFollowup, useOutreachHeatmap, useTranslation } from "@/lib/hooks";
import { clsx } from "clsx";
import { formatRate } from "@/lib/utils";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { OutreachHeatmap } from "@/components/charts/OutreachHeatmap";
import { CCOutreachTable } from "@/components/ops/CCOutreachTable";
import { CCOutreachHeatmap } from "@/components/ops/CCOutreachHeatmap";
import { StatMiniCard } from "@/components/ui/StatMiniCard";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { OutreachGapAnalysis } from "@/components/charts/OutreachGapAnalysis";
import { PageHeader } from "@/components/layout/PageHeader";
import { OPS_PAGE } from "@/lib/layout";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HeatmapCell {
  cc_name: string;
  date: string;
  calls: number;
  connects: number;
  effective: number;
  effective_rate: number;
}

interface HeatmapSummary {
  total_calls: number;
  avg_daily: number;
  top_cc: string;
}

interface HeatmapData {
  dates: string[];
  cc_names: string[];
  data: HeatmapCell[];
  summary: HeatmapSummary;
}

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { key: "monitor", label: "外呼监控" },
  { key: "heatmap", label: "热力图" },
  { key: "gap", label: "外呼缺口" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ── Sub-tabs ──────────────────────────────────────────────────────────────────

function MonitorTab() {
  const { t } = useTranslation();
  const { data: outreachRaw, isLoading, error: isError } = useFollowup();

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

  // Suppress unused variable warnings
  void totalConnects;
  void totalEffective;

  if (isLoading) {
    return (
      <div className="space-y-4">
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

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        数据加载失败，请刷新重试
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GlossaryBanner terms={[
        { term: "有效接通", definition: "通话≥120秒" },
        { term: "均时", definition: "平均通话时长" },
        { term: "接通率", definition: "接通呼叫/总拨打量" },
      ]} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatMiniCard label={t("ops.outreach.card.totalCalls")} value={totalCalls.toLocaleString()} accent="blue" />
        <StatMiniCard label={t("ops.outreach.card.contactRate")} value={formatRate(contactRate)} accent="green" />
        <StatMiniCard label={t("ops.outreach.card.effectiveRate")} value={formatRate(effectiveRate)} accent="yellow" />
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

function HeatmapTab() {
  const { t } = useTranslation();
  const { data: rawHeatmap, isLoading, error } = useOutreachHeatmap();
  const heatmap = rawHeatmap as HeatmapData | undefined;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        {t("ops.outreach-heatmap.label.loadFailed")} {String(error?.message ?? error)}
      </div>
    );
  }

  const summary = heatmap?.summary ?? { total_calls: 0, avg_daily: 0, top_cc: "" };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">{t("ops.outreach-heatmap.card.monthly")}</div>
          <div className="mt-1 text-2xl font-bold text-blue-700">
            {summary.total_calls.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">{t("ops.outreach-heatmap.card.daily")}</div>
          <div className="mt-1 text-2xl font-bold text-blue-600">
            {summary.avg_daily.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">{t("ops.outreach-heatmap.card.topCC")}</div>
          <div className="mt-1 text-2xl font-bold text-indigo-700 truncate">
            {summary.top_cc || "—"}
          </div>
        </div>
      </div>

      <ErrorBoundary>
        <Card title={t("ops.outreach-heatmap.card.heatmap")}>
          <CCOutreachHeatmap
            dates={heatmap?.dates ?? []}
            cc_names={heatmap?.cc_names ?? []}
            data={heatmap?.data ?? []}
          />
        </Card>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{t("ops.outreach-heatmap.label.colorLegend")}</span>
          <span className="rounded px-2 py-0.5 bg-slate-50 border border-slate-200">0</span>
          <span className="rounded px-2 py-0.5 bg-slate-100">低</span>
          <span className="rounded px-2 py-0.5 bg-blue-100 text-blue-700">中低</span>
          <span className="rounded px-2 py-0.5 bg-blue-300 text-white">中</span>
          <span className="rounded px-2 py-0.5 bg-blue-500 text-white">中高</span>
          <span className="rounded px-2 py-0.5 bg-blue-700 text-white">高</span>
        </div>
      </ErrorBoundary>
    </div>
  );
}

function GapTab() {
  return (
    <div className="space-y-4">
      <GlossaryBanner terms={[
        { term: "有效接通", definition: "通话≥120秒" },
        { term: "覆盖缺口", definition: "目标覆盖率 - 实际覆盖率" },
        { term: "CC", definition: "前端销售" },
        { term: "有效学员", definition: "次卡>0且在有效期内" },
      ]} />
      <ErrorBoundary>
        <OutreachGapAnalysis />
      </ErrorBoundary>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OpsOutreachPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("monitor");

  return (
    <div className={OPS_PAGE}>
      <PageHeader title={t("ops.outreach.title")} subtitle={t("ops.outreach.subtitle")} />

      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
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

      {activeTab === "monitor" && <MonitorTab />}
      {activeTab === "heatmap" && <HeatmapTab />}
      {activeTab === "gap" && <GapTab />}
    </div>
  );
}
