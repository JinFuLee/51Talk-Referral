"use client";

interface CCGap {
  cc_name: string;
  total: number;
  called: number;
  not_called: number;
  coverage_rate: number;
  gap_vs_target: number;
}

interface TooltipPayloadItem {
  payload: CCGap & { pct: number };
}

export interface OutreachGapTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

export default function OutreachGapTooltip({ active, payload }: OutreachGapTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-xl shadow-flash p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{d.cc_name}</p>
      <p className="text-slate-500">
        已拨: {d.called} / {d.total}
      </p>
      <p className="text-slate-500">未拨: {d.not_called}</p>
      <p
        className={
          d.gap_vs_target > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"
        }
      >
        缺口: {(d.gap_vs_target * 100).toFixed(1)}%
      </p>
    </div>
  );
}
