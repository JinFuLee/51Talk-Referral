"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatRevenue } from "@/lib/utils";

interface RevenueSlideProps {
  revealStep: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function fade(revealStep: number, threshold: number) {
  return {
    opacity: revealStep >= threshold ? 1 : 0,
    transition: "opacity 0.5s ease",
  };
}

interface SummaryData {
  revenue?: {
    actual?: number;
    target?: number;
    gap?: number;
    absolute_gap?: number;
    mom_pct?: number;
    yoy_pct?: number;
    remaining_daily_avg?: number;
    daily_avg?: number;
  };
  time_progress?: number;
}

export function RevenueSlide({ revealStep }: RevenueSlideProps) {
  const { data, isLoading, error } = useSWR("/api/analysis/summary", fetcher);

  const summary: SummaryData = data?.data ?? {};
  const rev = summary.revenue ?? {};
  const actual = rev.actual ?? 0;
  const target = rev.target ?? 0;
  const absoluteGap = rev.absolute_gap ?? actual - target;
  const momPct = rev.mom_pct;
  const yoyPct = rev.yoy_pct;
  const remainingDailyAvg = rev.remaining_daily_avg ?? 0;
  const dailyAvg = rev.daily_avg ?? 0;
  const timeProgress = summary.time_progress ?? 0;
  const completionPct = target > 0 ? (actual / target) * 100 : 0;

  // Build bar chart data: actual vs target progress
  const barData = [
    { name: "实际", value: actual, fill: actual >= target * timeProgress ? "#22c55e" : "#ef4444" },
    { name: "目标", value: target, fill: "#94a3b8" },
  ];

  const gapColor = absoluteGap >= 0 ? "text-green-600" : "text-red-500";
  const gapSign = absoluteGap >= 0 ? "+" : "";

  const MomIcon =
    momPct === undefined ? Minus : momPct > 0 ? TrendingUp : momPct < 0 ? TrendingDown : Minus;
  const momColor =
    momPct === undefined
      ? "text-slate-400"
      : momPct > 0
      ? "text-green-600"
      : "text-red-500";

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-lg">
        数据加载失败，请稍后重试
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Left + Right layout */}
      <div className="flex flex-1 gap-8">
        {/* Left: big numbers */}
        <div className="flex flex-col justify-center gap-6 w-1/2" style={fade(revealStep, 1)}>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6">
            <p className="text-lg font-medium text-slate-500 mb-2">本月实际业绩</p>
            <p className="text-5xl font-bold text-slate-800">{formatRevenue(actual)}</p>
          </div>
          <div className="rounded-2xl bg-blue-50 border border-blue-200 p-6">
            <p className="text-lg font-medium text-slate-500 mb-2">本月目标</p>
            <p className="text-4xl font-bold text-blue-700">{formatRevenue(target)}</p>
          </div>
          <div
            className={clsx(
              "rounded-2xl p-6 border",
              absoluteGap >= 0
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            )}
          >
            <p className="text-lg font-medium text-slate-500 mb-2">目标差额</p>
            <p className={clsx("text-4xl font-bold", gapColor)}>
              {gapSign}{formatRevenue(absoluteGap)}
            </p>
          </div>
        </div>

        {/* Right: bar chart */}
        <div className="flex flex-col w-1/2" style={fade(revealStep, 2)}>
          <p className="text-lg font-semibold text-slate-600 mb-3">月度进度对比</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 14 }} />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number) => [formatRevenue(value), "金额"]}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, index) => (
                    <rect key={index} fill={entry.fill} />
                  ))}
                </Bar>
                <ReferenceLine
                  y={target * timeProgress}
                  stroke="#f59e0b"
                  strokeDasharray="4 2"
                  label={{ value: "时间线", position: "right", fontSize: 12, fill: "#f59e0b" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Completion bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-slate-500 mb-1">
              <span>完成度 {completionPct.toFixed(1)}%</span>
              <span>时间进度 {(timeProgress * 100).toFixed(0)}%</span>
            </div>
            <div className="relative w-full bg-slate-200 rounded-full h-3">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
                style={{ left: `${Math.min(timeProgress * 100, 100)}%` }}
              />
              <div
                className={clsx(
                  "h-3 rounded-full transition-all duration-700",
                  completionPct >= timeProgress * 100 ? "bg-green-500" : "bg-red-400"
                )}
                style={{ width: `${Math.min(completionPct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom trend row */}
      <div
        className="rounded-xl bg-slate-50 border border-slate-200 px-6 py-4 flex gap-8"
        style={fade(revealStep, 3)}
      >
        <div className={clsx("flex items-center gap-2 text-lg", momColor)}>
          <MomIcon className="w-5 h-5" />
          <span>
            环比 {momPct !== undefined ? `${momPct > 0 ? "+" : ""}${momPct.toFixed(1)}%` : "—"}
          </span>
        </div>
        <div className="text-slate-500 text-lg">
          同比{" "}
          <strong
            className={
              yoyPct !== undefined
                ? yoyPct > 0
                  ? "text-green-600"
                  : "text-red-500"
                : "text-slate-400"
            }
          >
            {yoyPct !== undefined ? `${yoyPct > 0 ? "+" : ""}${yoyPct.toFixed(1)}%` : "—"}
          </strong>
        </div>
        <div className="text-slate-500 text-lg">
          当前日均 <strong className="text-slate-700">{formatRevenue(dailyAvg)}</strong>
        </div>
        <div className="text-slate-500 text-lg">
          达标需日均 <strong className="text-blue-700">{formatRevenue(remainingDailyAvg)}</strong>
        </div>
      </div>
    </div>
  );
}
