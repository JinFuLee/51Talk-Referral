"use client";

import type { RiskAlert } from "@/lib/types";

const levelStyle: Record<string, string> = {
  critical: "border-destructive/30 bg-destructive/10 text-destructive",
  warning: "border-warning/30 bg-warning/10 text-warning",
  info: "border-info/30 bg-info/10 text-info",
};

const levelLabel: Record<string, string> = {
  critical: "严重",
  warning: "警告",
  info: "提示",
};

export function RiskAlertList({ alerts }: { alerts: RiskAlert[] }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-white/95 backdrop-blur-md p-4 shadow-flash hover:shadow-flash-lg hover:-translate-y-1 transition-all duration-500">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">风险预警</h3>
      {alerts.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">暂无风险预警</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={`${a.level}-${a.message}`} className={`text-xs rounded-lg border px-3 py-2 ${levelStyle[a.level] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
              <span className="font-semibold mr-1">[{levelLabel[a.level] ?? a.level}]</span>
              {a.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
