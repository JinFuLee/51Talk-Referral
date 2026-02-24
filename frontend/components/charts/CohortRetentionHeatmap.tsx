"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

interface DecayPoint {
  month: string;
  reach_rate?: number;
  participation_rate?: number;
  checkin_rate?: number;
  referral_ratio?: number;
}

interface CohortDecayRawResponse {
  decay_curves?: Record<string, DecayPoint[]>;
}

const COHORT_SEGMENTS = ["0-30", "31-60", "61-90", "91-180", "181+"];

const METRICS: { key: keyof Omit<DecayPoint, "month">; label: string }[] = [
  { key: "reach_rate", label: "触达率" },
  { key: "participation_rate", label: "参与率" },
  { key: "checkin_rate", label: "打卡率" },
  { key: "referral_ratio", label: "带货比" },
];



function getHeatColor(value: number, max: number): string {
  const ratio = value / (max || 1);
  if (ratio >= 0.8) return "bg-emerald-600 text-white";
  if (ratio >= 0.6) return "bg-emerald-400 text-white";
  if (ratio >= 0.4) return "bg-emerald-200 text-emerald-900";
  if (ratio >= 0.2) return "bg-amber-100 text-amber-900";
  return "bg-rose-100 text-rose-800";
}

function pct(v: number | undefined) {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function buildMatrix(curves: Record<string, DecayPoint[]>) {
  return COHORT_SEGMENTS.map((seg) => {
    const points = curves[seg] ?? [];
    const m1 = points[0] ?? {};
    return { seg, data: m1 };
  });
}

function computeMaxPerMetric(rows: { seg: string; data: DecayPoint }[]) {
  const maxMap: Record<string, number> = {};
  for (const { key } of METRICS) {
    maxMap[key] = Math.max(...rows.map((r) => (r.data[key] as number | undefined) ?? 0), 0.001);
  }
  return maxMap;
}

interface TooltipInfo {
  seg: string;
  metricLabel: string;
  value: number | undefined;
  x: number;
  y: number;
}

export function CohortRetentionHeatmap() {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  const { data, error, isLoading } = useSWR<CohortDecayRawResponse>(
    "/api/analysis/cohort-decay-raw",
    swrFetcher
  );

  const hasData = data?.decay_curves && Object.keys(data.decay_curves).length > 0;

  const curves = useMemo(() => data?.decay_curves ?? {}, [data?.decay_curves]);
  const rows = useMemo(() => buildMatrix(curves), [curves]);
  const maxMap = useMemo(() => computeMaxPerMetric(rows), [rows]);

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
        数据加载失败
      </div>
    );
  }

  if (!hasData || !data?.decay_curves) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
        <p className="text-sm font-medium text-slate-600 mb-1">Cohort 留存热力图数据暂未就绪</p>
        <p className="text-xs text-slate-400">请先运行分析以生成 cohort-decay-raw 数据</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto relative">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left px-3 py-2 font-semibold text-slate-600 bg-slate-50 border border-slate-200 w-24">
              围场段
            </th>
            {METRICS.map((m) => (
              <th
                key={m.key}
                className="px-3 py-2 font-semibold text-slate-600 bg-slate-50 border border-slate-200 text-center"
              >
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ seg, data: point }) => (
            <tr key={seg}>
              <td className="px-3 py-2 font-medium text-slate-700 bg-slate-50 border border-slate-200 whitespace-nowrap">
                {seg} 天
              </td>
              {METRICS.map((m) => {
                const val = point[m.key] as number | undefined;
                const colorClass = val != null ? getHeatColor(val, maxMap[m.key]) : "bg-slate-50 text-slate-400";
                return (
                  <td
                    key={m.key}
                    className={`px-3 py-2 border border-slate-200 text-center font-mono transition-colors cursor-default select-none ${colorClass}`}
                    onMouseEnter={(e) => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setTooltip({ seg, metricLabel: m.label, value: val, x: rect.left, y: rect.top });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {pct(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Custom floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-white/95 backdrop-blur-md border border-border/40 rounded-lg shadow-lg px-3 py-2 text-xs"
          style={{ left: tooltip.x + 8, top: tooltip.y - 48 }}
        >
          <p className="font-semibold text-slate-700">{tooltip.seg} 天围场</p>
          <p className="text-slate-500 mt-0.5">
            {tooltip.metricLabel}：
            <span className="font-medium text-slate-700">{pct(tooltip.value)}</span>
          </p>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-2">
        * 取各围场段第一个月（M1）数据 · 颜色深浅反映指标相对表现
      </p>
    </div>
  );
}
