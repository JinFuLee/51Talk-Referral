"use client";

import { useState, memo } from "react";
import Link from "next/link";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import { useCountUp } from "@/lib/use-count-up";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ComparisonData {
  value: number | null;
  changePct: number | null;
  label: string;
}

interface SparklinePoint {
  date: string;
  value: number;
}

interface KPICardProps {
  title: string;
  actual: number;
  target: number;
  unit?: string;
  status: "green" | "yellow" | "red" | "gray";
  progress: number; // 0~1
  remaining_daily_avg?: number;
  efficiency_lift_pct?: number;
  mom_prev?: number | null;
  mom_change?: number | null;
  mom_change_pct?: number | null;
  sparkline?: SparklinePoint[] | null;
  comparison?: ComparisonData | null;

  // Variant & new metric props
  variant?: "compact" | "full";
  absolute_gap?: number;
  gap?: number;
  pace_daily_needed?: number;
  current_daily_avg?: number;
  drilldownHref?: string;
  drilldownLabel?: string;
}

/** General number formatter (no currency prefix). Uses same scale as formatUSDShort. */
function fmtNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "0";
  const num = Number(n);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toLocaleString();
}

/** Format a gap value with sign (+ green / - red semantics handled by caller). */
function fmtGap(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const num = Number(n);
  const abs = Math.abs(num);
  const sign = num >= 0 ? "+" : "-";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${abs.toLocaleString()}`;
}

const STATUS_COLORS = {
  green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", bar: "bg-green-500" },
  yellow: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", bar: "bg-yellow-400" },
  red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", bar: "bg-red-500" },
  gray: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-500", bar: "bg-slate-400" },
};

const STATUS_EMOJI = { green: "🟢", yellow: "🟡", red: "🔴", gray: "⚪" };

const SPARKLINE_COLORS: Record<string, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  gray: "#94a3b8",
};

function KPICardInner({
  title,
  actual,
  target,
  unit,
  status,
  progress,
  remaining_daily_avg,
  efficiency_lift_pct,
  mom_prev,
  mom_change,
  mom_change_pct,
  sparkline,
  comparison,
  variant = "compact",
  absolute_gap,
  gap,
  pace_daily_needed,
  current_daily_avg,
  drilldownHref,
  drilldownLabel = "点击分析漏斗 →",
}: KPICardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const colors = STATUS_COLORS[status];
  const pct = Math.min(Math.round(progress * 100), 100);
  const animatedActual = useCountUp(actual, 1200);
  const sparkColor = SPARKLINE_COLORS[status];

  const isCompact = variant === "compact";
  const showFull = !isCompact || isExpanded;

  // The content of the card
  const cardContent = (
    <div 
      className={`relative group rounded-2xl border p-4 shadow-sm transition-all duration-300 ${colors.bg} ${colors.border} ${
        drilldownHref ? "cursor-pointer hover:shadow-md hover:-translate-y-1 pb-6" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</span>
        <span>{STATUS_EMOJI[status]}</span>
      </div>

      {/* compact: 4 core metrics row */}
      <div className="flex items-end gap-1 mb-1">
        <span className={`text-2xl font-bold ${colors.text}`}>
          {fmtNum(Number(animatedActual.toFixed(0)))}
        </span>
        {unit && <span className="text-sm text-gray-400 mb-0.5">{unit}</span>}
      </div>

      {/* compact core: target + absolute_gap + status arrow */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
        <span>目标 {fmtNum(target)}{unit}</span>
        {absolute_gap !== undefined && (
          <span className={`font-semibold ${absolute_gap >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {fmtGap(absolute_gap)}{unit}
          </span>
        )}
      </div>

      {/* progress bar always visible */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
        <div
          className={`h-1.5 rounded-full transition-all ${colors.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-gray-400 mb-1">{pct}% 进度</div>

      {mom_change_pct != null && (
        <div className="text-xs mt-0.5 mb-1">
          <span
            className={
              mom_change_pct > 0
                ? "text-emerald-600 font-semibold"
                : mom_change_pct < 0
                ? "text-red-500 font-semibold"
                : "text-slate-400"
            }
          >
            {mom_change_pct > 0 ? "▲" : mom_change_pct < 0 ? "▼" : "—"}
            {Math.abs(mom_change_pct).toFixed(1)}%
          </span>
          <span className="text-slate-400 ml-1">
            vs上月{mom_prev != null ? `(${fmtNum(mom_prev)})` : ""}
          </span>
        </div>
      )}

      {/* Fold/Unfold button — compact only */}
      {isCompact && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="mt-1 flex items-center justify-center w-full text-xs text-gray-500 hover:text-gray-700 transition-colors py-1"
        >
          {isExpanded ? (
            <>收起详情 <ChevronUp className="w-3 h-3 ml-1" /></>
          ) : (
            <>展开详情 <ChevronDown className="w-3 h-3 ml-1" /></>
          )}
        </button>
      )}

      {/* Extended metrics — compact: collapsible, full: always visible */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          showFull ? "max-h-[400px] opacity-100 mt-2" : "max-h-0 opacity-0"
        }`}
      >
        {/* Sparkline */}
        {sparkline && sparkline.length >= 2 && (
          <div className="h-8 mt-1 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkline}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={sparkColor}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Comparison row */}
        {comparison && comparison.value !== null && (
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-slate-400">{comparison.label}</span>
            <span
              className={
                comparison.changePct !== null && comparison.changePct > 0
                  ? "text-emerald-600 font-semibold"
                  : comparison.changePct !== null && comparison.changePct < 0
                  ? "text-red-500 font-semibold"
                  : "text-slate-400"
              }
            >
              {comparison.value.toLocaleString()}
              {comparison.changePct !== null && (
                <span className="ml-1">
                  {comparison.changePct > 0 ? "▲" : comparison.changePct < 0 ? "▼" : "—"}
                  {Math.abs(comparison.changePct).toFixed(1)}%
                </span>
              )}
            </span>
          </div>
        )}

        {/* 8-item extended metrics grid */}
        <div className="mt-2 pt-2 border-t border-gray-200/60 space-y-0.5">
          {gap !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">时间进度差</span>
              <span className={`font-medium ${gap >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {gap >= 0 ? "+" : ""}{(gap * 100).toFixed(1)}%
              </span>
            </div>
          )}
          {pace_daily_needed !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">追进度需日均</span>
              <span className="font-medium text-orange-500">{fmtNum(pace_daily_needed)}{unit}</span>
            </div>
          )}
          {current_daily_avg !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">当前日均</span>
              <span className="text-gray-600">{fmtNum(current_daily_avg)}{unit}</span>
            </div>
          )}
          {remaining_daily_avg !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">达标需日均</span>
              <span className="text-gray-600">{fmtNum(remaining_daily_avg)}{unit}</span>
            </div>
          )}
          {efficiency_lift_pct !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">效率提升需求</span>
              <span className={`font-medium ${efficiency_lift_pct > 0 ? "text-red-500" : "text-green-600"}`}>
                {efficiency_lift_pct > 0
                  ? `↑${efficiency_lift_pct.toFixed(1)}%`
                  : `超额 ↓${Math.abs(efficiency_lift_pct).toFixed(1)}%`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Hover Overlay Text */}
      {drilldownHref && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/60 backdrop-blur-sm ${colors.text}`}>
            {drilldownLabel}
          </span>
        </div>
      )}
    </div>
  );

  if (drilldownHref) {
    return (
      <Link href={drilldownHref} className="block no-underline">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

export const KPICard = memo(KPICardInner);
