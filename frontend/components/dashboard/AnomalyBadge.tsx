"use client";

import type { AnomalyItem } from "@/lib/types";

const severityStyle: Record<string, string> = {
  high: "border-red-300 bg-red-50 text-red-700",
  medium: "border-yellow-300 bg-yellow-50 text-yellow-700",
  low: "border-slate-200 bg-slate-50 text-slate-600",
};

export function AnomalyBadge({ anomalies }: { anomalies: AnomalyItem[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
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
