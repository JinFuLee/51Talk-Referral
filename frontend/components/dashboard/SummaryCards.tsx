"use client";

import React from "react";

interface SummaryCardsProps {
  summary: Record<string, unknown>;
  timeProgress: number;
  meta: Record<string, unknown>;
}

function pct(actual: number, target: number) {
  if (!target) return 0;
  return Math.round((actual / target) * 100);
}

function statusColor(p: number) {
  if (p >= 100) return "text-success bg-success/10 border-success/30";
  if (p >= 95) return "text-warning bg-warning/10 border-warning/30";
  return "text-destructive bg-destructive/10 border-destructive/30";
}

function SummaryCardsBase({ summary, timeProgress }: SummaryCardsProps) {
  const reg = summary as { registrations?: { actual: number; target: number }; payments?: { actual: number; target: number }; revenue?: { actual: number; target: number }; leads?: { actual: number; target: number } };
  const progress = Math.round((timeProgress ?? 0) * 100);

  const cards = [
    { label: "注册", data: reg.registrations, unit: "人" },
    { label: "付费", data: reg.payments, unit: "人" },
    { label: "收入", data: reg.revenue, unit: "THB" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>时间进度：{progress}%</span>
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {cards.map(({ label, data, unit }) => {
          const actual = data?.actual ?? 0;
          const target = data?.target ?? 0;
          const p = pct(actual, target);
          const color = statusColor(p);
          return (
            <div key={label} className={`rounded-2xl border p-4 shadow-flash transition-all duration-500 hover:shadow-flash-lg hover:-translate-y-1 ${color}`}>
              <p className="text-xs font-medium opacity-70">{label}</p>
              <p className="text-2xl font-bold mt-1">{actual.toLocaleString()}</p>
              <p className="text-xs mt-1 opacity-60">目标 {target.toLocaleString()} {unit} · {p}%</p>
              <div className="mt-2 h-1 bg-white/40 rounded-full overflow-hidden">
                <div className="h-full bg-current opacity-60 rounded-full" style={{ width: `${Math.min(p, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const SummaryCards = React.memo(SummaryCardsBase);
