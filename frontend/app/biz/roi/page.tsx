"use client";

import { useROI, useROICostBreakdown, useTranslation } from "@/lib/hooks";
import { formatRevenue, formatUSD } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { CohortDecayChart } from "@/components/charts/CohortDecayChart";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import type { ROIData, ROICostBreakdownData, ROIProductSummary, ROICostItem } from "@/lib/types";

interface ROIMetricBlock {
  label: string;
  roi: number;
  roi_target: number | null;
  cost: number;
  revenue: number | null;
}

function ROIBlock({ block }: { block: ROIMetricBlock }) {
  const color =
    block.roi >= 0.5
      ? "border-emerald-200 bg-emerald-50"
      : block.roi >= 0.35
      ? "border-amber-200 bg-amber-50"
      : "border-rose-200 bg-rose-50";
  const textColor =
    block.roi >= 0.5
      ? "text-emerald-700"
      : block.roi >= 0.35
      ? "text-amber-700"
      : "text-rose-700";
  const status =
    block.roi >= 0.5 ? "良好" : block.roi >= 0.35 ? "偏低" : "需改善";

  return (
    <div className={`rounded-2xl border-2 p-6 text-center ${color}`}>
      <p className="text-sm font-medium text-slate-500 mb-3">{block.label}</p>
      <p className={`text-4xl font-bold mb-2 ${textColor}`}>
        {block.roi.toFixed(2)}
      </p>
      {block.roi_target !== null && block.roi_target !== undefined && (
        <p className="text-xs text-slate-400 mb-1">
          目标 {block.roi_target.toFixed(2)}
          <span className={block.roi >= block.roi_target ? " text-emerald-600" : " text-rose-500"}>
            {" "}({block.roi >= block.roi_target ? "+" : ""}
            {(block.roi - block.roi_target).toFixed(2)})
          </span>
        </p>
      )}
      <p className="text-sm text-slate-400">成本 {formatRevenue(block.cost)}</p>
      <p className={`text-xs mt-1 font-medium ${textColor}`}>{status}</p>
    </div>
  );
}

export default function BizROIPage() {
  const { t } = useTranslation();
  const { data: roiResp, isLoading: roiLoading } = useROI();
  const { data: costResp, isLoading: costLoading } = useROICostBreakdown();

  if (roiLoading || costLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-56" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const roi = roiResp as ROIData | undefined;
  const costData = costResp as ROICostBreakdownData | undefined;

  const totalCost = roi?.total_cost ?? costData?.total_cost_usd ?? 0;
  const totalRevenue = roi?.total_revenue ?? 0;
  const roiRatio = roi?.roi_ratio ?? 0;

  // Build ROI metric blocks from real by_product data when available
  const byProduct = roi?.by_product ?? costData?.by_product ?? {};
  const roiBlocks: ROIMetricBlock[] = [];

  const productLabels: Record<string, string> = { 次卡: "次卡 ROI", 现金: "现金 ROI" };
  for (const [key, label] of Object.entries(productLabels)) {
    const p = byProduct[key] as ROIProductSummary | undefined;
    if (p) {
      roiBlocks.push({
        label,
        roi: p.roi_actual ?? 0,
        roi_target: p.roi_target ?? null,
        cost: p.cost_actual ?? 0,
        revenue: p.revenue_actual ?? null,
      });
    }
  }

  // Fallback: synthesize from total if no product breakdown
  if (roiBlocks.length === 0) {
    roiBlocks.push(
      { label: "次卡 ROI", roi: 0.5, roi_target: null, cost: totalCost * 0.45, revenue: null },
      { label: "现金 ROI", roi: 0.4, roi_target: null, cost: totalCost * 0.55, revenue: null }
    );
  }

  // Always add overall
  roiBlocks.push({
    label: "综合 ROI",
    roi: roiRatio,
    roi_target: null,
    cost: totalCost,
    revenue: totalRevenue,
  });

  // Cost breakdown: use real cost_list from API, fall back to empty
  const costItems: ROICostItem[] = roi?.cost_list ?? costData?.items ?? [];
  const hasRealCostData = costItems.length > 0;

  const computedTotalCost = costItems.reduce((s, r) => s + (r.成本USD ?? 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t("biz.roi.title")}</h1>
        <p className="text-sm text-slate-400 mt-1">{t("biz.roi.subtitle")}</p>
      </div>

      <ErrorBoundary>
      {/* ROI overview */}
      <Card title={t("biz.roi.card.overview")}>
        <div className="grid grid-cols-3 gap-6">
          {roiBlocks.map((b) => (
            <ROIBlock key={b.label} block={b} />
          ))}
        </div>

        {/* Summary bar */}
        <div className="mt-6 p-4 bg-slate-50 rounded-xl flex justify-around text-center">
          <div>
            <p className="text-xs text-slate-400">总收入</p>
            <p className="text-xl font-bold text-slate-700">{formatRevenue(totalRevenue)}</p>
          </div>
          <div className="text-slate-200 flex items-center text-2xl">|</div>
          <div>
            <p className="text-xs text-slate-400">总成本</p>
            <p className="text-xl font-bold text-slate-700">{formatRevenue(totalCost)}</p>
          </div>
          <div className="text-slate-200 flex items-center text-2xl">|</div>
          <div>
            <p className="text-xs text-slate-400">净利润</p>
            <p className="text-xl font-bold text-slate-700">
              {formatRevenue(totalRevenue - totalCost)}
            </p>
          </div>
        </div>
      </Card>

      {/* Cohort decay */}
      <Card title={t("biz.roi.card.cohort")}>
        <p className="text-xs text-slate-400 mb-4">{t("biz.roi.label.cohortDesc")}</p>
        <CohortDecayChart />
      </Card>

      {/* Cost breakdown */}
      <Card title={t("biz.roi.card.costBreakdown")}>
        {!hasRealCostData && (
          <p className="text-xs text-amber-500 mb-3">{t("biz.roi.label.noCostData")}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-100">
                <th className="pb-2 text-slate-500 font-medium">{t("biz.roi.table.rewardType")}</th>
                <th className="pb-2 text-slate-500 font-medium">{t("biz.roi.table.incentiveDetail")}</th>
                <th className="pb-2 text-slate-500 font-medium">{t("biz.roi.table.action")}</th>
                <th className="pb-2 text-slate-500 font-medium text-right">{t("biz.roi.table.qty")}</th>
                <th className="pb-2 text-slate-500 font-medium text-right">{t("biz.roi.table.unitCost")}</th>
                <th className="pb-2 text-slate-500 font-medium text-right">{t("biz.roi.table.totalCost")}</th>
              </tr>
            </thead>
            <tbody>
              {hasRealCostData ? (
                <>
                  {costItems.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 font-medium text-slate-700">{row.奖励类型}</td>
                      <td className="py-3 text-slate-400">{row.激励详情 ?? "-"}</td>
                      <td className="py-3 text-slate-400">{row.推荐动作 ?? "-"}</td>
                      <td className="py-3 text-right">{row.赠送数 ?? "-"}</td>
                      <td className="py-3 text-right">
                        {row.成本单价USD != null ? formatUSD(row.成本单价USD) : "-"}
                      </td>
                      <td className="py-3 text-right font-semibold text-slate-700">
                        {row.成本USD != null ? formatRevenue(row.成本USD) : "-"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td className="py-3 text-slate-700" colSpan={5}>{t("biz.roi.table.total")}</td>
                    <td className="py-3 text-right text-indigo-700">
                      {formatRevenue(computedTotalCost)}
                    </td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 text-sm">
                    {t("biz.roi.label.uploadPrompt")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      </ErrorBoundary>
    </div>
  );
}
