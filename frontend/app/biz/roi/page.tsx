"use client";

import { useROI } from "@/lib/hooks";
import { formatRevenue, formatUSD } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { CohortDecayChart } from "@/components/charts/CohortDecayChart";
import { Spinner } from "@/components/ui/Spinner";
import type { ROIData } from "@/lib/types";

interface ROIMetricBlock {
  label: string;
  roi: number;
  cost: number;
  currency: string;
}

const COST_BREAKDOWN = [
  { type: "次卡奖励", detail: "带新成功送1节次卡", count: 150, unit_price: 120, total: 18000 },
  { type: "现金奖励", detail: "付费后现金返还", count: 80, unit_price: 300, total: 24000 },
  { type: "活动奖励", detail: "打卡积分兑换", count: 200, unit_price: 50, total: 10000 },
  { type: "SS 人力成本", detail: "SS 团队跟进", count: 33, unit_price: 1800, total: 59400 },
];

export default function BizROIPage() {
  const { data: roiResp, isLoading } = useROI();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const roi = roiResp as ROIData | undefined;
  const totalCost = roi?.total_cost ?? 111400;
  const totalRevenue = roi?.total_revenue ?? 500000;
  const roiRatio = roi?.roi_ratio ?? 0.45;

  // Simulate sub-type ROI breakdown
  const roiBlocks: ROIMetricBlock[] = [
    { label: "次卡 ROI", roi: 0.50, cost: totalCost * 0.45, currency: "USD" },
    { label: "现金 ROI", roi: 0.40, cost: totalCost * 0.55, currency: "USD" },
    { label: "综合 ROI", roi: roiRatio, cost: totalCost, currency: "USD" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ROI 分析</h1>
        <p className="text-sm text-slate-400 mt-1">2026年2月 · 投资回报率全景</p>
      </div>

      {/* ROI overview */}
      <Card title="ROI 全景">
        <div className="grid grid-cols-3 gap-6">
          {roiBlocks.map((b) => (
            <div
              key={b.label}
              className={`rounded-2xl border-2 p-6 text-center ${
                b.roi >= 0.5
                  ? "border-emerald-200 bg-emerald-50"
                  : b.roi >= 0.35
                  ? "border-amber-200 bg-amber-50"
                  : "border-rose-200 bg-rose-50"
              }`}
            >
              <p className="text-sm font-medium text-slate-500 mb-3">{b.label}</p>
              <p
                className={`text-4xl font-bold mb-2 ${
                  b.roi >= 0.5
                    ? "text-emerald-700"
                    : b.roi >= 0.35
                    ? "text-amber-700"
                    : "text-rose-700"
                }`}
              >
                {b.roi.toFixed(2)}
              </p>
              <p className="text-sm text-slate-400">成本 {formatRevenue(b.cost)}</p>
              <p className="text-xs mt-1 font-medium">
                {b.roi >= 0.5 ? "🟢 良好" : b.roi >= 0.35 ? "🟡 偏低" : "🔴 需改善"}
              </p>
            </div>
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
      <Card title="📉 Cohort 衰减曲线">
        <p className="text-xs text-slate-400 mb-4">
          触达率半衰期约 4 月，参与率半衰期约 2 月 — 前 2 月投入 ROI 最高
        </p>
        <CohortDecayChart />
      </Card>

      {/* Cost breakdown */}
      <Card title="💰 成本明细">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-100">
              <th className="pb-2 text-slate-500 font-medium">奖励类型</th>
              <th className="pb-2 text-slate-500 font-medium">激励详情</th>
              <th className="pb-2 text-slate-500 font-medium text-right">数量</th>
              <th className="pb-2 text-slate-500 font-medium text-right">单价</th>
              <th className="pb-2 text-slate-500 font-medium text-right">总成本</th>
            </tr>
          </thead>
          <tbody>
            {COST_BREAKDOWN.map((row, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="py-3 font-medium text-slate-700">{row.type}</td>
                <td className="py-3 text-slate-400">{row.detail}</td>
                <td className="py-3 text-right">{row.count}</td>
                <td className="py-3 text-right">{formatUSD(row.unit_price)}</td>
                <td className="py-3 text-right font-semibold text-slate-700">
                  {formatRevenue(row.total)}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold">
              <td className="py-3 text-slate-700" colSpan={4}>合计</td>
              <td className="py-3 text-right text-indigo-700">
                {formatRevenue(COST_BREAKDOWN.reduce((s, r) => s + r.total, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
