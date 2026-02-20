"use client";

import { formatRevenue } from "@/lib/utils";

interface ImpactData {
  lost_students?: number;
  lost_payments?: number;
  lost_revenue_usd?: number;
}

interface EfficiencyMetricCardProps {
  label: string;
  actual: number;
  target: number;
  impact?: ImpactData;
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  const color =
    clamped >= 100
      ? "bg-emerald-500"
      : clamped >= 80
      ? "bg-amber-400"
      : "bg-rose-500";
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5">
      <div
        className={`h-1.5 rounded-full transition-all ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function EfficiencyMetricCard({ label, actual, target, impact }: EfficiencyMetricCardProps) {
  const actualPct = actual * 100;
  const targetPct = target * 100;
  const gap = parseFloat((actualPct - targetPct).toFixed(1));
  const progressRatio = target > 0 ? (actual / target) * 100 : 0;

  const isDeficit = gap < 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            gap >= 0
              ? "bg-emerald-100 text-emerald-700"
              : gap >= -5
              ? "bg-amber-100 text-amber-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {gap >= 0 ? `+${gap}%` : `${gap}%`}
        </span>
      </div>

      {/* Rate comparison */}
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-800">
          {actualPct.toFixed(1)}%
        </span>
        <span className="text-xs text-slate-400">/ 目标 {targetPct.toFixed(1)}%</span>
      </div>

      {/* Progress bar */}
      <ProgressBar pct={progressRatio} />

      {/* Loss quantification — only when in deficit */}
      {isDeficit && impact && (
        <div className="text-xs text-rose-600 font-medium">
          损失{" "}
          {impact.lost_students !== undefined && (
            <span>{impact.lost_students} 注册</span>
          )}
          {impact.lost_payments !== undefined && (
            <span> → {impact.lost_payments} 付费</span>
          )}
          {impact.lost_revenue_usd !== undefined && (
            <span> → {formatRevenue(impact.lost_revenue_usd)}</span>
          )}
        </div>
      )}

      {/* Root cause placeholder */}
      {isDeficit && (
        <p className="text-xs text-slate-400 italic">
          根因分析: 待 M14 真实数据接入
        </p>
      )}
    </div>
  );
}
