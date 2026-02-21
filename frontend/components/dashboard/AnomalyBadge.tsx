"use client";

import type { AnomalyItem } from "@/lib/types";

const severityStyle: Record<string, string> = {
  high: "border-destructive/30 bg-destructive/10 text-destructive",
  medium: "border-warning/30 bg-warning/10 text-warning",
  low: "border-slate-200 bg-slate-50 text-slate-600",
};

export function AnomalyBadge({ anomalies }: { anomalies: AnomalyItem[] }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-white/95 backdrop-blur-md p-4 shadow-flash hover:shadow-flash-lg hover:-translate-y-1 transition-all duration-500">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">异常检测 <span className="ml-1 text-xs font-normal text-slate-400">({anomalies.length})</span></h3>
      {anomalies.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">未发现异常</p>
      ) : (
        <ul className="space-y-2">
          {anomalies.slice(0, 5).map((a, i) => (
            <li key={i} className={`text-xs rounded-lg border px-3 py-2 ${severityStyle[a.severity] ?? ""}`}>
              <span className="font-semibold">{a.metric}</span>
              {a.description && <span className="ml-1 opacity-80">— {a.description}</span>}
            </li>
          ))}
          {anomalies.length > 5 && (
            <li className="text-xs text-slate-400 text-center">+{anomalies.length - 5} 条…</li>
          )}
        </ul>
      )}
    </div>
  );
}
