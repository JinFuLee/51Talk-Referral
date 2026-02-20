"use client";

interface ROICardProps {
  data: Record<string, unknown>;
}

export function ROICard({ data }: ROICardProps) {
  const cost = typeof data.total_cost === "number" ? data.total_cost : 0;
  const revenue = typeof data.total_revenue === "number" ? data.total_revenue : 0;
  const roi = typeof data.roi_ratio === "number" ? data.roi_ratio : 0;
  const currency = (data.currency as string) ?? "THB";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">总成本</p>
          <p className="text-lg font-bold text-slate-800">{cost.toLocaleString()}</p>
          <p className="text-xs text-slate-400">{currency}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">总收入</p>
          <p className="text-lg font-bold text-slate-800">{revenue.toLocaleString()}</p>
          <p className="text-xs text-slate-400">{currency}</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${roi >= 1 ? "bg-green-50" : "bg-red-50"}`}>
          <p className="text-xs text-slate-500 mb-1">ROI</p>
          <p className={`text-lg font-bold ${roi >= 1 ? "text-green-700" : "text-red-600"}`}>
            {(roi * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
