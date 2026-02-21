"use client";

import type { AnomalyItem } from "@/lib/types";

const severityStyle: Record<string, string> = {
  high: "bg-destructive/10 border-destructive/30 text-destructive",
  medium: "bg-warning/10 border-warning/30 text-warning",
  low: "bg-slate-50 border-slate-300 text-slate-700",
};

const severityDot: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-slate-400",
};

const metricLabel: Record<string, string> = {
  daily_revenue_usd: "日收入(USD)",
  daily_revenue_cny: "日收入",
  cc_checkin_rate: "CC打卡率",
};

interface AnomalyBannerProps {
  anomalies: AnomalyItem[];
}

export function AnomalyBanner({ anomalies }: AnomalyBannerProps) {
  if (anomalies.length === 0) return null;

  const highCount = anomalies.filter((a) => a.severity === "high").length;
  const medCount = anomalies.filter((a) => a.severity === "medium").length;
  const bannerLevel = highCount > 0 ? "high" : medCount > 0 ? "medium" : "low";

  return (
    <div className={`rounded-lg border px-4 py-3 mb-4 flex items-start gap-3 ${severityStyle[bannerLevel]}`}>
      <span className={`flex-shrink-0 w-3 h-3 rounded-full mt-1 ${severityDot[bannerLevel] ?? "bg-slate-400"}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold mb-1">
          检测到 {anomalies.length} 个异常
          {highCount > 0 && <span className="ml-2 text-destructive">({highCount} 严重)</span>}
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {anomalies.slice(0, 4).map((a, i) => (
            <li key={i} className="text-xs opacity-90">
              <span className="font-medium">{metricLabel[a.metric] ?? a.metric}</span>
              {a.description && <span className="ml-1 opacity-75">— {a.description}</span>}
            </li>
          ))}
          {anomalies.length > 4 && (
            <li className="text-xs opacity-60">+{anomalies.length - 4} 条…</li>
          )}
        </ul>
      </div>
    </div>
  );
}
