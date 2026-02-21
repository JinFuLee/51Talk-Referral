"use client";

import { Card } from "@/components/ui/Card";
import { EnclosureHeatmap } from "@/components/charts/EnclosureHeatmap";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { useEnclosure, useEnclosureCompare, useEnclosureCombined, useTranslation } from "@/lib/hooks";
import type { EnclosureData, EnclosureSegment } from "@/lib/types/analysis";
import { EnclosureCompareChart } from "@/components/biz/EnclosureCompareChart";
import { EnclosureCombinedOverview } from "@/components/biz/EnclosureCombinedOverview";
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

export default function BizEnclosurePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useEnclosure();
  const { data: compareData, isLoading: compareLoading } = useEnclosureCompare();
  const { data: combinedData, isLoading: combinedLoading } = useEnclosureCombined();

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-56" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const segments: EnclosureSegment[] = data?.by_enclosure ?? [];
  const allocation: Record<string, number> = data?.resource_allocation?.optimal ?? {};

  // Chart data for followup coverage
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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t("biz.enclosure.title")}</h1>
        <p className="text-sm text-slate-400 mt-1">{t("biz.enclosure.subtitle")}</p>
      </div>

      <ErrorBoundary>
      {/* Heatmap */}
      <Card title={t("biz.enclosure.card.heatmap")}>
        <p className="text-xs text-slate-400 mb-4">{t("biz.enclosure.label.heatmapDesc")}</p>
        <EnclosureHeatmap segments={segments} allocation={allocation} />
      </Card>

      {/* Followup coverage bar chart */}
      <Card title="围场跟进覆盖率">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={coverageData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="segment" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} domain={[0, 100]} />
            <Tooltip formatter={(v) => [`${v}%`, "跟进覆盖率"]} />
            <Bar dataKey="跟进覆盖率" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Strategy tips */}
      <Card title={t("biz.enclosure.card.strategy")}>
        <ul className="space-y-2">
          {STRATEGY_TIPS.map((tip, i) => (
            <li
              key={i}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tip.color}`}
            >
              <span className="text-base">{tip.icon}</span>
              <span>{tip.text}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Detail table */}
      {segments.length > 0 && (
        <Card title={t("biz.enclosure.card.detail")}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-100">
                  <th className="pb-2 text-slate-500 font-medium">{t("biz.enclosure.table.segment")}</th>
                  <th className="pb-2 text-slate-500 font-medium text-right">{t("biz.enclosure.table.students")}</th>
                  <th className="pb-2 text-slate-500 font-medium text-right">{t("biz.enclosure.table.convRate")}</th>
                  <th className="pb-2 text-slate-500 font-medium text-right">{t("biz.enclosure.table.followupRate")}</th>
                  <th className="pb-2 text-slate-500 font-medium text-right">ROI</th>
                  <th className="pb-2 text-slate-500 font-medium">{t("biz.enclosure.table.recommendation")}</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((s, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 font-medium">{s.segment} 天</td>
                    <td className="py-3 text-right">{(s.students ?? 0).toLocaleString()}</td>
                    <td className="py-3 text-right">{((s.conversion_rate ?? 0) * 100).toFixed(1)}%</td>
                    <td className="py-3 text-right">{((s.followup_rate ?? 0) * 100).toFixed(1)}%</td>
                    <td className="py-3 text-right font-semibold">
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
                    <td className="py-3 text-slate-500">{s.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* D2×D3 围场对比 */}
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

      {/* D4 合并围场总览 */}
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
      </ErrorBoundary>
    </div>
  );
}
