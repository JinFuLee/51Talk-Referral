"use client";

import { memo } from "react";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

interface NorthStarMetric {
  name: string;
  actual: number;
  target: number;
  unit?: string;
}

/** Shape returned by GET /api/analysis/north-star */
interface NorthStarResponse {
  by_cc: Array<{
    cc_name: string;
    checkin_24h_rate?: number;
    participation_rate?: number;
    contact_rate?: number;
    team?: string;
  }>;
  by_team: unknown[];
  summary: {
    avg_checkin_24h_rate?: number;
    target?: number;
    participation_target?: number;
    contact_target?: number;
    total_achievement?: number;
  };
  achieved_count: number;
  total_cc: number;
}

/** Derive the three north-star gauge metrics from the API response */
function deriveMetrics(data: NorthStarResponse): NorthStarMetric[] {
  const summary = data.summary ?? {};
  const byCc = data.by_cc ?? [];

  // Checkin rate comes from summary; target from API or fallback
  const checkinActual = summary.avg_checkin_24h_rate ?? 0;
  const checkinTarget = summary.target ?? 0.60; // fallback: 默认目标

  // Participation and contact rates: average across CC list (graceful if absent)
  const participationVals = byCc
    .map((c) => c.participation_rate)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const contactVals = byCc
    .map((c) => c.contact_rate)
    .filter((v): v is number => typeof v === "number" && v > 0);

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const metrics: NorthStarMetric[] = [
    { name: "打卡率", actual: checkinActual, target: checkinTarget, unit: "%" },
  ];

  if (participationVals.length > 0) {
    // Target from API summary; fallback: 默认目标
    const participationTarget = summary.participation_target ?? 0.40; // fallback: 默认目标
    metrics.push({ name: "参与率", actual: avg(participationVals), target: participationTarget, unit: "%" });
  }

  if (contactVals.length > 0) {
    // Target from API summary; fallback: 默认目标
    const contactTarget = summary.contact_target ?? 0.75; // fallback: 默认目标
    metrics.push({ name: "触达率", actual: avg(contactVals), target: contactTarget, unit: "%" });
  }

  return metrics;
}

function GaugeArc({ value, max, size = 120 }: { value: number; max: number; size?: number }) {
  const ratio = Math.min(value / (max || 1), 1);
  const r = size / 2 - 8;
  const circumference = Math.PI * r;
  const offset = circumference * (1 - ratio);
  const color = ratio >= 0.95 ? "hsl(var(--success))" : ratio >= 0.8 ? "hsl(var(--chart-amber))" : "hsl(var(--chart-rose))";

  return (
    <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
      {/* Background arc */}
      <path
        d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Progress arc */}
      <path
        d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function SingleGauge({ metric }: { metric: NorthStarMetric }) {
  const ratio = metric.actual / (metric.target || 1);
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const gap = metric.actual - metric.target;
  const gapColor = gap >= 0 ? "text-emerald-600" : "text-rose-500";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <GaugeArc value={metric.actual} max={metric.target} size={120} />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-xl font-bold text-slate-800">{pct(ratio)}</span>
        </div>
      </div>
      <p className="text-sm font-semibold text-slate-700">{metric.name}</p>
      <div className="text-xs text-slate-500 space-y-0.5 text-center">
        <div>
          实际 <span className="font-medium text-slate-700">{pct(metric.actual)}</span>
        </div>
        <div>
          目标 <span className="font-medium text-slate-700">{pct(metric.target)}</span>
        </div>
        <div>
          差值{" "}
          <span className={`font-medium ${gapColor}`}>
            {gap >= 0 ? "+" : ""}
            {pct(gap)}
          </span>
        </div>
      </div>
    </div>
  );
}

function NorthStarGaugeInner() {
  const { data, error, isLoading } = useSWR<NorthStarResponse>(
    "/api/analysis/north-star",
    swrFetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 gap-2 text-slate-500 text-sm">
        <Spinner size="sm" /> 加载中…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-40 text-rose-500 text-sm">
        数据加载失败，请检查后端服务
      </div>
    );
  }

  const metrics = deriveMetrics(data);

  return (
    <div className="flex flex-wrap justify-center gap-8 py-4">
      {metrics.map((m) => (
        <SingleGauge key={m.name} metric={m} />
      ))}
    </div>
  );
}

export const NorthStarGauge = memo(NorthStarGaugeInner);
