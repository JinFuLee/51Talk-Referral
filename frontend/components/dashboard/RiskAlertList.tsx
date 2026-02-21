"use client";

import type { RiskAlert } from "@/lib/types";

const levelStyle: Record<string, string> = {
  critical: "border-red-300 bg-red-50 text-red-700",
  warning: "border-yellow-300 bg-yellow-50 text-yellow-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
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
          {alerts.map((a, i) => (
            <li key={i} className={`text-xs rounded-lg border px-3 py-2 ${levelStyle[a.level] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
              <span className="font-semibold mr-1">[{levelLabel[a.level] ?? a.level}]</span>
              {a.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
