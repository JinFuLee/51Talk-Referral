"use client";

import { formatRevenue } from "@/lib/utils";

interface ROICardProps {
  data: Record<string, unknown>;
}

export function ROICard({ data }: ROICardProps) {
  const cost = typeof data.total_cost === "number" ? data.total_cost : 0;
  const revenue = typeof data.total_revenue === "number" ? data.total_revenue : 0;
  const roi = typeof data.roi_ratio === "number" ? data.roi_ratio : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">总成本</p>
          <p className="text-lg font-bold text-slate-800">{formatRevenue(cost)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">总收入</p>
          <p className="text-lg font-bold text-slate-800">{formatRevenue(revenue)}</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${roi >= 1 ? "bg-success/10" : "bg-destructive/10"}`}>
          <p className="text-xs text-slate-500 mb-1">ROI</p>
          <p className={`text-lg font-bold ${roi >= 1 ? "text-success" : "text-destructive"}`}>
            {(roi * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
