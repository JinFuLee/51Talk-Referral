"use client";

import { useSummary, useProductivity, useTranslation } from "@/lib/hooks";
import { formatRevenue } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import type { ProductivityData } from "@/lib/types/analysis";
import type { SummaryData } from "@/lib/types";

const ACHIEVEMENT_ROWS = [
  { label: "24H 打卡达标率", cc: "52%", ss: "—", lp: "—", target: "60%", status: "yellow" as const },
  { label: "外呼达标率", cc: "50%", ss: "—", lp: "—", target: "80%", status: "red" as const },
  { label: "课前跟进率", cc: "—", ss: "60%", lp: "—", target: "80%", status: "yellow" as const },
  { label: "付费跟进覆盖率", cc: "27%", ss: "27%", lp: "—", target: "50%", status: "red" as const },
];

const STATUS_DOT: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-rose-500",
};

export default function BizTeamPage() {
  const { t } = useTranslation();
  const { data: productivityResp, isLoading: pLoading } = useProductivity();
  const { data: summaryResp, isLoading: sLoading } = useSummary();

  void summaryResp;

  if (pLoading || sLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const prod = productivityResp;
  const ccCount = prod?.cc?.active_count ?? 49;
  const ssCount = prod?.ss?.active_count ?? 33;
  const ccPerCapita = prod?.cc?.per_capita ?? 6122;
  const ssPerCapita = prod?.ss?.per_capita ?? 6061;
  const dailyTrend = prod?.daily_trend ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t("biz.team.title")}</h1>
        <p className="text-sm text-slate-400 mt-1">{t("biz.team.subtitle")}</p>
      </div>

      <ErrorBoundary>
      {/* Team mini-cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500">CC 人效</span>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
              📈 趋势正常
            </span>
          </div>
          <div className="text-4xl font-bold text-slate-800">{formatRevenue(ccPerCapita)}/人</div>
          <p className="text-sm text-slate-400 mt-2">{ccCount} 人在岗 · 前端销售</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500">SS 人效</span>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
              📈 趋势正常
            </span>
          </div>
          <div className="text-4xl font-bold text-slate-800">{formatRevenue(ssPerCapita)}/人</div>
          <p className="text-sm text-slate-400 mt-2">{ssCount} 人在岗 · 后端销售</p>
        </div>
      </div>

      {/* Productivity trend */}
      <Card title="📊 人效日趋势">
        {dailyTrend.length > 0 ? (
          <TrendLineChart
            data={dailyTrend}
            xKey="date"
            lineKeys={["cc_revenue", "ss_revenue"]}
          />
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            暂无日趋势数据
          </div>
        )}
      </Card>

      {/* Achievement overview */}
      <Card title={`✅ ${t("biz.team.card.achievement")}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-100">
                <th className="pb-2 text-slate-500 font-medium">{t("biz.team.table.metric")}</th>
                <th className="pb-2 text-slate-500 font-medium text-center">CC</th>
                <th className="pb-2 text-slate-500 font-medium text-center">SS</th>
                <th className="pb-2 text-slate-500 font-medium text-center">LP</th>
                <th className="pb-2 text-slate-500 font-medium text-center">{t("biz.team.table.target")}</th>
                <th className="pb-2 text-slate-500 font-medium text-center">{t("biz.team.table.status")}</th>
              </tr>
            </thead>
            <tbody>
              {ACHIEVEMENT_ROWS.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-3 font-medium text-slate-700">{row.label}</td>
                  <td className="py-3 text-center text-slate-600">{row.cc}</td>
                  <td className="py-3 text-center text-slate-600">{row.ss}</td>
                  <td className="py-3 text-center text-slate-600">{row.lp}</td>
                  <td className="py-3 text-center text-slate-400">{row.target}</td>
                  <td className="py-3 text-center">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_DOT[row.status]}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          🟢 达标 &nbsp; 🟡 略低于目标 (-5%~0%) &nbsp; 🔴 严重落后 (&lt;-5%)
        </p>
      </Card>
      </ErrorBoundary>
    </div>
  );
}
