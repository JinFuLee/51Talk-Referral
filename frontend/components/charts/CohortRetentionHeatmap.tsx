"use client";

import useSWR from "swr";
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

const MOCK_DECAY: Record<string, DecayPoint[]> = {
  "0-30": [{ month: "M1", reach_rate: 0.82, participation_rate: 0.35, checkin_rate: 0.78, referral_ratio: 0.42 }],
  "31-60": [{ month: "M1", reach_rate: 0.71, participation_rate: 0.28, checkin_rate: 0.65, referral_ratio: 0.33 }],
  "61-90": [{ month: "M1", reach_rate: 0.58, participation_rate: 0.20, checkin_rate: 0.52, referral_ratio: 0.24 }],
  "91-180": [{ month: "M1", reach_rate: 0.44, participation_rate: 0.14, checkin_rate: 0.40, referral_ratio: 0.16 }],
  "181+": [{ month: "M1", reach_rate: 0.28, participation_rate: 0.08, checkin_rate: 0.25, referral_ratio: 0.09 }],
};

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

export function CohortRetentionHeatmap() {
  const { data, error, isLoading } = useSWR<CohortDecayRawResponse>(
    "cohort-decay-raw",
    () => fetch("/api/analysis/cohort-decay-raw").then((r) => r.json())
  );

  const curves: Record<string, DecayPoint[]> =
    data?.decay_curves && Object.keys(data.decay_curves).length > 0
      ? data.decay_curves
      : MOCK_DECAY;

  const rows = buildMatrix(curves);
  const maxMap = computeMaxPerMetric(rows);

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
    <div className="overflow-x-auto">
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
                    title={val != null ? `${m.label}: ${pct(val)}` : "无数据"}
                    className={`px-3 py-2 border border-slate-200 text-center font-mono transition-colors cursor-default select-none ${colorClass}`}
                  >
                    {pct(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-400 mt-2">
        * 取各围场段第一个月（M1）数据 · 颜色深浅反映指标相对表现
      </p>
    </div>
  );
}
