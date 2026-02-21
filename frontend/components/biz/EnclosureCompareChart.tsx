"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface EnclosureComparePoint {
  enclosure: string;
  market_conv: number | null;
  referral_conv: number | null;
  market_participation: number | null;
  referral_participation: number | null;
  market_students: number | null;
  referral_students: number | null;
  market_mobilization: number | null;
  referral_mobilization: number | null;
  market_monthly_paid: number | null;
  referral_monthly_paid: number | null;
  conv_gap: number | null;
}

type Metric = "conv" | "participation" | "mobilization" | "monthly_paid";

const METRIC_OPTIONS: { value: Metric; label: string; isRate: boolean }[] = [
  { value: "conv", label: "注册→付费转化率", isRate: true },
  { value: "participation", label: "参与率", isRate: true },
  { value: "mobilization", label: "动员率（活跃推荐人/学员）", isRate: true },
  { value: "monthly_paid", label: "本月付费人数", isRate: false },
];

interface Props {
  comparison: EnclosureComparePoint[];
}

export function EnclosureCompareChart({ comparison }: Props) {
  const [metric, setMetric] = useState<Metric>("conv");

  const selected = METRIC_OPTIONS.find((o) => o.value === metric)!;

  const chartData = comparison.map((row) => {
    const mVal = row[`market_${metric}` as keyof EnclosureComparePoint] as number | null;
    const rVal = row[`referral_${metric}` as keyof EnclosureComparePoint] as number | null;
    const diff = mVal != null && rVal != null ? rVal - mVal : null;
    return {
      enclosure: row.enclosure,
      市场: selected.isRate ? ((mVal ?? 0) * 100) : (mVal ?? 0),
      转介绍: selected.isRate ? ((rVal ?? 0) * 100) : (rVal ?? 0),
      diff,
      mRaw: mVal,
      rRaw: rVal,
    };
  });

  const formatVal = (v: number) =>
    selected.isRate ? `${v.toFixed(1)}%` : v.toLocaleString();

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: { name: string; value: number; color: string }[];
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    const market = payload.find((p) => p.name === "市场");
    const referral = payload.find((p) => p.name === "转介绍");
    const diff = referral && market ? referral.value - market.value : null;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3 text-sm">
        <p className="font-semibold text-slate-700 mb-2">{label} 天围场</p>
        {market && (
          <p className="text-blue-600">市场：{formatVal(market.value)}</p>
        )}
        {referral && (
          <p className="text-violet-600">转介绍：{formatVal(referral.value)}</p>
        )}
        {diff != null && (
          <p className={`mt-1 font-medium ${diff >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            差值：{diff >= 0 ? "+" : ""}{formatVal(diff)}
          </p>
        )}
      </div>
    );
  };

  const yFormatter = (v: number) =>
    selected.isRate ? `${v.toFixed(0)}%` : v.toLocaleString();

  return (
    <div className="space-y-4">
      {/* 指标切换 */}
      <div className="flex flex-wrap gap-2">
        {METRIC_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setMetric(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              metric === opt.value
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 双 Bar 图 */}
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
          <XAxis
            dataKey="enclosure"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `${v}天`}
          />
          <YAxis tickFormatter={yFormatter} tick={{ fontSize: 11 }} width={48} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="市场" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="转介绍" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* 转化率差值摘要行 */}
      {metric === "conv" && comparison.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {comparison.map((row) => {
            const gap = row.conv_gap;
            return (
              <div
                key={row.enclosure}
                className={`rounded-lg border p-2 text-center text-xs ${
                  gap == null
                    ? "border-slate-100 bg-slate-50 text-slate-400"
                    : gap > 0
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                <div className="font-medium">{row.enclosure}天</div>
                <div className="mt-0.5">
                  {gap != null
                    ? `转介绍${gap >= 0 ? "+" : ""}${(gap * 100).toFixed(1)}%`
                    : "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
