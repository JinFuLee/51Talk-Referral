"use client";

import { useState, memo } from "react";
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
import { swrFetcher } from "@/lib/api";
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


function EnclosureCompareChartInner() {
  const [metric, setMetric] = useState<MetricKey>("conv");
  const config = METRIC_CONFIGS[metric];

  const { data, isLoading, error } = useSWR<EnclosureCompareData>(
    "/api/analysis/enclosure-compare",
    swrFetcher,
    { shouldRetryOnError: false }
  );

  const hasData = data && data.comparison && data.comparison.length > 0;

  const chartData = hasData
    ? data.comparison.map((seg) => ({
        name: `${seg.enclosure}天`,
        [config.marketLabel]: Number((seg[config.marketKey] as number) ?? 0),
        [config.referralLabel]: Number((seg[config.referralKey] as number) ?? 0),
        conv_gap: seg.conv_gap,
        enclosure: seg.enclosure,
      }))
    : [];

  const segments = hasData ? data.comparison : [];

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
      {!isLoading && !hasData && (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
          <p className="text-sm font-medium text-slate-600 mb-1">围场渠道对比数据暂未就绪</p>
          <p className="text-xs text-slate-400">请先运行分析以生成 D2/D3 围场对照数据</p>
        </div>
      )}
      {!isLoading && hasData && (
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
              <XAxis dataKey="name"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false} />
              <YAxis tickFormatter={tickFormatter}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false} />
              <Tooltip
                content={
                  <CustomTooltip
                    isPercent={config.isPercent}
                    segments={segments}
                  />
                }
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
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

export const EnclosureCompareChart = memo(EnclosureCompareChartInner);
