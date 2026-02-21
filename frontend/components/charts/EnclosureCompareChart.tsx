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
  Cell,
  LabelList,
} from "recharts";
import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

interface EnclosureCompareSegment {
  enclosure: string;
  market_conv: number;
  referral_conv: number;
  market_participation: number;
  referral_participation: number;
  market_students: number;
  referral_students: number;
  market_mobilization: number;
  referral_mobilization: number;
  market_monthly_paid: number;
  referral_monthly_paid: number;
  conv_gap: number;
}

interface EnclosureCompareData {
  comparison: EnclosureCompareSegment[];
  segments: string[];
}

type MetricKey = "conv" | "participation" | "students";

interface MetricConfig {
  label: string;
  marketKey: keyof EnclosureCompareSegment;
  referralKey: keyof EnclosureCompareSegment;
  isPercent: boolean;
  marketLabel: string;
  referralLabel: string;
}

const METRIC_CONFIGS: Record<MetricKey, MetricConfig> = {
  conv: {
    label: "转化率",
    marketKey: "market_conv",
    referralKey: "referral_conv",
    isPercent: true,
    marketLabel: "市场转化率",
    referralLabel: "转介绍转化率",
  },
  participation: {
    label: "参与率",
    marketKey: "market_participation",
    referralKey: "referral_participation",
    isPercent: true,
    marketLabel: "市场参与率",
    referralLabel: "转介绍参与率",
  },
  students: {
    label: "学员数",
    marketKey: "market_students",
    referralKey: "referral_students",
    isPercent: false,
    marketLabel: "市场学员数",
    referralLabel: "转介绍学员数",
  },
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
  isPercent: boolean;
  segments: EnclosureCompareSegment[];
}

function CustomTooltip({ active, payload, label, isPercent, segments }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const seg = segments.find((s) => s.enclosure === label);
  const gapVal = seg?.conv_gap ?? 0;
  const gapColor = gapVal >= 0 ? "text-emerald-600" : "text-red-600";

  return (
    <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-xl shadow-flash p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-2">{label} 天</p>
      {payload.map((p) => {
        const val = p.value ?? 0;
        return (
          <div key={p.name} className="flex items-center justify-between gap-3 mb-1">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: p.fill }} />
              <span className="text-slate-500">{p.name}</span>
            </span>
            <span className="font-medium text-slate-700">
              {isPercent ? `${(val * 100).toFixed(1)}%` : Number(val).toLocaleString()}
            </span>
          </div>
        );
      })}
      {seg && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <span className="text-slate-400">转化率差：</span>
          <span className={`font-semibold ${gapColor}`}>
            {gapVal >= 0 ? "+" : ""}{(gapVal * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

const MOCK_DATA: EnclosureCompareData = {
  segments: ["0-30", "31-60", "61-90", "91-180", "181+"],
  comparison: [
    { enclosure: "0-30", market_conv: 0.12, referral_conv: 0.18, market_participation: 0.25, referral_participation: 0.35, market_students: 100, referral_students: 80, market_mobilization: 0.15, referral_mobilization: 0.22, market_monthly_paid: 5, referral_monthly_paid: 8, conv_gap: 0.06 },
    { enclosure: "31-60", market_conv: 0.09, referral_conv: 0.14, market_participation: 0.20, referral_participation: 0.28, market_students: 85, referral_students: 65, market_mobilization: 0.12, referral_mobilization: 0.18, market_monthly_paid: 4, referral_monthly_paid: 6, conv_gap: 0.05 },
    { enclosure: "61-90", market_conv: 0.07, referral_conv: 0.10, market_participation: 0.15, referral_participation: 0.20, market_students: 70, referral_students: 50, market_mobilization: 0.09, referral_mobilization: 0.13, market_monthly_paid: 3, referral_monthly_paid: 4, conv_gap: 0.03 },
    { enclosure: "91-180", market_conv: 0.05, referral_conv: 0.06, market_participation: 0.10, referral_participation: 0.12, market_students: 55, referral_students: 40, market_mobilization: 0.06, referral_mobilization: 0.08, market_monthly_paid: 2, referral_monthly_paid: 2, conv_gap: 0.01 },
    { enclosure: "181+", market_conv: 0.08, referral_conv: 0.05, market_participation: 0.12, referral_participation: 0.09, market_students: 40, referral_students: 30, market_mobilization: 0.07, referral_mobilization: 0.05, market_monthly_paid: 1, referral_monthly_paid: 1, conv_gap: -0.03 },
  ],
};

export function EnclosureCompareChart() {
  const [metric, setMetric] = useState<MetricKey>("conv");
  const config = METRIC_CONFIGS[metric];

  const { data, isLoading, error } = useSWR<EnclosureCompareData>(
    "enclosure-compare",
    () => fetch("/api/analysis/enclosure-compare").then((r) => r.json()),
    { fallbackData: MOCK_DATA, shouldRetryOnError: false }
  );

  const chartData = (data ?? MOCK_DATA).comparison.map((seg) => ({
    name: `${seg.enclosure}天`,
    [config.marketLabel]: Number((seg[config.marketKey] as number) ?? 0),
    [config.referralLabel]: Number((seg[config.referralKey] as number) ?? 0),
    conv_gap: seg.conv_gap,
    enclosure: seg.enclosure,
  }));

  const segments = (data ?? MOCK_DATA).comparison;

  const gapSummary = segments.filter((s) => s.conv_gap >= 0).length;
  const totalSegs = segments.length;

  const tickFormatter = (v: number) =>
    config.isPercent ? `${(v * 100).toFixed(0)}%` : v.toLocaleString();

  return (
    <Card
      title="D2×D3 围场渠道对比 — 市场 vs 转介绍"
      actions={
        <div className="flex items-center gap-1">
          {(Object.keys(METRIC_CONFIGS) as MetricKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setMetric(k)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                metric === k
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {METRIC_CONFIGS[k].label}
            </button>
          ))}
        </div>
      }
    >
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      )}
      {error && !isLoading && (
        <p className="text-xs text-amber-600 mb-2">API 暂不可用，显示示例数据</p>
      )}
      {!isLoading && (
        <>
          {/* Summary strip */}
          <div className="flex items-center gap-4 mb-4 text-xs">
            <span className="text-slate-400">
              转介绍领先围场：
              <span className="font-semibold text-emerald-600 ml-1">{gapSummary}/{totalSegs}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
              <span className="text-slate-400">转介绍 &gt; 市场</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300" />
              <span className="text-slate-400">市场 &gt; 转介绍</span>
            </span>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 16, right: 16, left: 0, bottom: 4 }}
              barCategoryGap="25%"
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={tickFormatter}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    isPercent={config.isPercent}
                    segments={segments}
                  />
                }
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey={config.marketLabel} fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey={config.marketLabel}
                  position="top"
                  formatter={(v: number) =>
                    config.isPercent ? `${(v * 100).toFixed(0)}%` : v
                  }
                  style={{ fontSize: 10, fill: "hsl(var(--chart-2))" }}
                />
              </Bar>
              <Bar dataKey={config.referralLabel} fill="hsl(var(--success))" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey={config.referralLabel}
                  position="top"
                  formatter={(v: number) =>
                    config.isPercent ? `${(v * 100).toFixed(0)}%` : v
                  }
                  style={{ fontSize: 10, fill: "hsl(var(--success))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* conv_gap annotations — only shown when metric = conv */}
          {metric === "conv" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {segments.map((seg) => (
                <div
                  key={seg.enclosure}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    seg.conv_gap >= 0
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {seg.enclosure}天：{seg.conv_gap >= 0 ? "+" : ""}
                  {(seg.conv_gap * 100).toFixed(1)}%
                </div>
              ))}
              <p className="w-full text-xs text-slate-400 mt-1">
                差值 = 转介绍转化率 − 市场转化率（正值表示转介绍优势）
              </p>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
