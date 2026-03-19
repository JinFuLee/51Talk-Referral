"use client";

import React from "react";

interface StatMiniCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "blue" | "green" | "yellow" | "red" | "slate";
}

const accentColor: Record<string, string> = {
  blue: "text-primary",
  green: "text-success",
  yellow: "text-warning",
  red: "text-destructive",
  slate: "text-[var(--text-primary)]",
};

function StatMiniCardBase({ label, value, sub, accent = "slate" }: StatMiniCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-[var(--bg-surface)] px-4 py-3">
      <p className="text-xs text-[var(--text-secondary)] mb-1">{label}</p>
      <p className={`text-xl font-bold ${accentColor[accent]}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}

export const StatMiniCard = React.memo(StatMiniCardBase);
