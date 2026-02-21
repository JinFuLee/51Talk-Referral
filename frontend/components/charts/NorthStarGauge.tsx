"use client";

import useSWR from "swr";
import { Spinner } from "@/components/ui/Spinner";

interface NorthStarMetric {
  name: string;
  actual: number;
  target: number;
  unit?: string;
}

interface NorthStarResponse {
  checkin_24h_rate?: number;
  north_star_metrics?: NorthStarMetric[];
  ranking?: unknown[];
}

const MOCK_DATA: NorthStarResponse = {
  checkin_24h_rate: 0.74,
  north_star_metrics: [
    { name: "打卡率", actual: 0.74, target: 0.85, unit: "%" },
    { name: "参与率", actual: 0.32, target: 0.40, unit: "%" },
    { name: "触达率", actual: 0.61, target: 0.75, unit: "%" },
  ],
};

function GaugeArc({ value, max, size = 120 }: { value: number; max: number; size?: number }) {
  const ratio = Math.min(value / (max || 1), 1);
  const r = size / 2 - 8;
  const circumference = Math.PI * r;
  const offset = circumference * (1 - ratio);
  const color = ratio >= 0.95 ? "#10b981" : ratio >= 0.8 ? "#f59e0b" : "#f43f5e";

  return (
    <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
      {/* Background arc */}
      <path
        d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`}
        fill="none"
        stroke="#e2e8f0"
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

export function NorthStarGauge() {
  const { data, error, isLoading } = useSWR<NorthStarResponse>(
    "north-star",
    () => fetch("/api/analysis/north-star").then((r) => r.json())
  );

  const metrics: NorthStarMetric[] =
    data?.north_star_metrics && data.north_star_metrics.length > 0
      ? data.north_star_metrics
      : MOCK_DATA.north_star_metrics!;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 gap-2 text-slate-500 text-sm">
        <Spinner size="sm" /> 加载中…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-40 text-rose-500 text-sm">
        数据加载失败，显示模拟数据
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-8 py-4">
      {metrics.map((m) => (
        <SingleGauge key={m.name} metric={m} />
      ))}
    </div>
  );
}
