"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type StatusLevel = "green" | "yellow" | "red";

interface BigMetricCardProps {
  title: string;
  icon?: string;
  value: string;
  subtitle?: string;
  progress?: number; // 0-1
  progressLabel?: string;
  status?: StatusLevel;
  statusLabel?: string;
  miniChart?: ReactNode;
  className?: string;
}

const statusColors: Record<StatusLevel, { badge: string; dot: string }> = {
  green: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  yellow: { badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  red: { badge: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
};

const statusEmoji: Record<StatusLevel, string> = {
  green: "🟢",
  yellow: "🟡",
  red: "🔴",
};

export function BigMetricCard({
  title,
  icon,
  value,
  subtitle,
  progress,
  progressLabel,
  status,
  statusLabel,
  miniChart,
  className,
}: BigMetricCardProps) {
  const colors = status ? statusColors[status] : null;

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-100 shadow-lg p-8 flex flex-col gap-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
          {icon && <span>{icon}</span>}
          {title}
        </span>
        {status && statusLabel && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full border",
              colors?.badge
            )}
          >
            {statusEmoji[status]} {statusLabel}
          </span>
        )}
      </div>

      {/* Main value */}
      <div className="text-4xl font-bold text-slate-800 leading-none">{value}</div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-sm text-slate-400">{subtitle}</p>
      )}

      {/* Progress bar */}
      {progress !== undefined && (
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{progressLabel ?? "进度"}</span>
            <span>{(progress * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                !status || status === "green"
                  ? "bg-emerald-500"
                  : status === "yellow"
                  ? "bg-amber-500"
                  : "bg-rose-500"
              )}
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Mini chart slot */}
      {miniChart && <div className="h-16">{miniChart}</div>}
    </div>
  );
}
