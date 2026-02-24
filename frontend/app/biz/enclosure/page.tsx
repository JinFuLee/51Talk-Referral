"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";
import { Card } from "@/components/ui/Card";
import { EnclosureHeatmap } from "@/components/charts/EnclosureHeatmap";
import { EnclosureHealthDashboard } from "@/components/charts/EnclosureHealthDashboard";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { useEnclosure, useEnclosureCompare, useEnclosureCombined, useTranslation } from "@/lib/hooks";
import { clsx } from "clsx";
import type { EnclosureSegment } from "@/lib/types/analysis";
import { EnclosureCompareChart } from "@/components/biz/EnclosureCompareChart";
import { EnclosureCombinedOverview } from "@/components/biz/EnclosureCombinedOverview";
import { EnclosureCompareChart as EnclosureCompareChartFull } from "@/components/charts/EnclosureCompareChart";
import { EnclosureCombinedOverview as EnclosureCombinedOverviewFull } from "@/components/charts/EnclosureCombinedOverview";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import type { EnclosureComparePoint } from "@/components/biz/EnclosureCompareChart";
import type { EnclosureCombinedSegment, EnclosureCombinedTotal } from "@/components/biz/EnclosureCombinedOverview";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { key: "strategy", label: "围场策略" },
  { key: "detail", label: "围场详情" },
  { key: "health", label: "围场健康" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ── Strategy tab content (from original enclosure/page.tsx) ───────────────────

const STRATEGY_TIPS = [
  {
    icon: "🟢",
    text: "0-30 围场 ROI 最高 (1.5)，建议投入 35% 资源",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
  {
    icon: "🟢",
    text: "31-60 围场 ROI 1.2，维持当前投入水平",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
  {
    icon: "🟡",
    text: "61-90 围场转化率下降，精选高质量学员跟进",
    color: "bg-amber-50 border-amber-200 text-amber-700",
  },
  {
    icon: "🔴",
    text: "181+ 围场 ROI 仅 0.3，大幅降低优先级",
    color: "bg-rose-50 border-rose-200 text-rose-700",
  },
];

function StrategyTab() {
  const { t } = useTranslation();
  const { data, isLoading } = useEnclosure();
  const { data: compareData, isLoading: compareLoading } = useEnclosureCompare();
  const { data: combinedData, isLoading: combinedLoading } = useEnclosureCombined();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-56" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const segments: EnclosureSegment[] = data?.by_enclosure ?? [];
  const allocation: Record<string, number> = data?.resource_allocation?.optimal ?? {};

  const coverageData = (segments.length > 0 ? segments : [
    { segment: "0-30", followup_rate: 0.80 },
    { segment: "31-60", followup_rate: 0.60 },
    { segment: "61-90", followup_rate: 0.45 },
    { segment: "91-180", followup_rate: 0.30 },
    { segment: "181+", followup_rate: 0.15 },
  ] as EnclosureSegment[]).map((s) => ({
    segment: s.segment,
    跟进覆盖率: ((s.followup_rate ?? 0) * 100).toFixed(0),
  }));

  const comparePoints: EnclosureComparePoint[] = compareData?.comparison ?? [];
  const combinedSegments: EnclosureCombinedSegment[] = combinedData?.segments ?? [];
  const combinedTotal: EnclosureCombinedTotal = combinedData?.total ?? {};

  return (
    <div className="space-y-6">
      <ErrorBoundary>
        <div className="mt-4 mb-4 flex items-center gap-4">
          <h2 className="text-lg font-semibold text-slate-800 shrink-0 tracking-tight">概览层 <span className="text-sm text-slate-400 font-normal">/ Overview</span></h2>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title={t("biz.enclosure.card.heatmap")}>
            <p className="text-xs text-slate-400 mb-4">{t("biz.enclosure.label.heatmapDesc")}</p>
            <EnclosureHeatmap segments={segments} allocation={allocation} />
          </Card>

          <Card title="围场跟进覆盖率">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={coverageData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="segment" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [`${v}%`, "跟进覆盖率"]}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="跟进覆盖率" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="mt-6 mb-4 flex items-center gap-4">
          <h2 className="text-lg font-semibold text-slate-800 shrink-0 tracking-tight">策略层 <span className="text-sm text-slate-400 font-normal">/ Strategy</span></h2>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        <Card title={t("biz.enclosure.card.strategy")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STRATEGY_TIPS.map((tip) => (
              <div
                key={tip.text}
                className={`flex items-start gap-3 rounded-xl border px-5 py-4 text-sm transition-all hover:shadow-sm ${tip.color}`}
              >
                <span className="text-lg shrink-0 mt-0.5">{tip.icon}</span>
                <span className="font-medium leading-relaxed">{tip.text}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-6 mb-4 flex items-center gap-4">
          <h2 className="text-lg font-semibold text-slate-800 shrink-0 tracking-tight">明细层 <span className="text-sm text-slate-400 font-normal">/ Details</span></h2>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        <div className="space-y-6">
          {segments.length > 0 && (
            <Card title={t("biz.enclosure.card.detail")}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-slate-500 font-medium whitespace-nowrap">{t("biz.enclosure.table.segment")}</th>
                      <th className="px-4 py-3 text-slate-500 font-medium text-right whitespace-nowrap">{t("biz.enclosure.table.students")}</th>
                      <th className="px-4 py-3 text-slate-500 font-medium text-right whitespace-nowrap">{t("biz.enclosure.table.convRate")}</th>
                      <th className="px-4 py-3 text-slate-500 font-medium text-right whitespace-nowrap">{t("biz.enclosure.table.followupRate")}</th>
                      <th className="px-4 py-3 text-slate-500 font-medium text-right whitespace-nowrap">ROI</th>
                      <th className="px-4 py-3 text-slate-500 font-medium">{t("biz.enclosure.table.recommendation")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map((s) => (
                      <tr key={s.segment} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700">{s.segment} 天</td>
                        <td className="px-4 py-3 text-right text-slate-600">{(s.students ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{((s.conversion_rate ?? 0) * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-right text-slate-600">{((s.followup_rate ?? 0) * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          <span
                            className={
                              (s.roi_index ?? 0) >= 1.2
                                ? "text-emerald-600"
                                : (s.roi_index ?? 0) >= 0.8
                                ? "text-amber-600"
                                : "text-rose-600"
                            }
                          >
                            {(s.roi_index ?? 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{s.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title={`${t("biz.enclosure.card.compare")} (D2×D3)`}>
              <p className="text-xs text-slate-400 mb-4">{t("biz.enclosure.label.compareDesc")}</p>
              {compareLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : comparePoints.length > 0 ? (
                <EnclosureCompareChart comparison={comparePoints} />
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">{t("biz.enclosure.label.noData")}</p>
              )}
            </Card>

            <Card title={`${t("biz.enclosure.card.combined")} (D4)`}>
              <p className="text-xs text-slate-400 mb-4">{t("biz.enclosure.label.combinedDesc")}</p>
              {combinedLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : combinedSegments.length > 0 ? (
                <EnclosureCombinedOverview
                  segments={combinedSegments}
                  total={combinedTotal}
                />
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">{t("biz.enclosure.label.noData")}</p>
              )}
            </Card>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
}

function DetailTab() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
            <p className="font-semibold text-slate-700 mb-1">围场定义</p>
            <p className="text-slate-500">
              用户<span className="font-medium">付费当日</span>起算天数分段：
              0-30 / 31-60 / 61-90 / 91-180 / 181+
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
            <p className="font-semibold text-blue-700 mb-1">D2×D3 对比视角</p>
            <p className="text-blue-600">
              同一围场内：市场渠道 vs 转介绍渠道转化率/参与率/学员数对比
            </p>
          </div>
          <div className="bg-emerald-50 rounded-lg px-4 py-3 border border-emerald-100">
            <p className="font-semibold text-emerald-700 mb-1">D4 合并视角</p>
            <p className="text-emerald-600">
              全渠道合并，展示每围场的活跃学员、付费、参与率、动员率综合表现
            </p>
          </div>
        </div>
      </Card>

      <GlossaryBanner terms={[
        { term: "围场", definition: "用户付费当日起算天数分段(0-30/31-60/61-90/91-180/181+)" },
        { term: "窄口", definition: "员工链接绑定UserB（高质量）" },
        { term: "宽口", definition: "学员链接绑定UserB（低质量）" },
        { term: "D2", definition: "市场渠道围场数据" },
        { term: "D3", definition: "转介绍渠道围场数据" },
        { term: "D4", definition: "全渠道合并围场数据" },
      ]} />

      <ErrorBoundary>
        <EnclosureCompareChartFull />
        <EnclosureCombinedOverviewFull />
      </ErrorBoundary>
    </div>
  );
}

function HealthTab() {
  return (
    <div className="space-y-6">
      <ErrorBoundary>
        <EnclosureHealthDashboard />
      </ErrorBoundary>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BizEnclosurePage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("strategy");

  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t("biz.enclosure.title")} subtitle={t("biz.enclosure.subtitle")} />

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

      {activeTab === "strategy" && <StrategyTab />}
      {activeTab === "detail" && <DetailTab />}
      {activeTab === "health" && <HealthTab />}
    </div>
  );
}
