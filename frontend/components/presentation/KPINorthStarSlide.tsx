"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { Star, TrendingUp } from "lucide-react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts";
import { swrFetcher } from "@/lib/api";

interface NorthStarCC {
  cc_name: string;
  team?: string | null;
  checkin_24h_rate?: number | null;
  checkin_24h_target?: number | null;
  achievement_rate?: number | null;
  referral_coefficient?: number | null;
}

interface NorthStarSummary {
  avg_checkin_24h_rate?: number | null;
  target?: number | null;
  total_achievement?: number | null;
}

interface NorthStarData {
  by_cc: NorthStarCC[];
  by_team: unknown[];
  summary: NorthStarSummary;
  achieved_count: number;
  total_cc: number;
}

interface MergedCC {
  cc_name: string;
  checkin_monthly_rate?: number | null;
  checkin_multiplier?: number | null;
  referral_coefficient_monthly?: number | null;
}

interface D5Summary {
  avg_checkin_rate?: number | null;
  avg_referral_participation?: number | null;
}

interface CheckinABData {
  merged: MergedCC[];
  d5_summary: D5Summary;
  d1_summary: NorthStarSummary;
}

interface KPINorthStarSlideProps {
  revealStep: number;
}

function CircularProgress({
  rate,
  target,
  visible,
}: {
  rate: number;
  target: number;
  visible: boolean;
}) {
  const pct = Math.min(rate * 100, 100);
  const tgt = Math.min(target * 100, 100);
  const isAhead = rate >= target;

  const radialData = [{ name: "rate", value: pct, fill: isAhead ? "#10b981" : "#f59e0b" }];

  return (
    <div
      className="flex flex-col items-center gap-3"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease" }}
    >
      <div className="relative w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="65%"
            outerRadius="90%"
            startAngle={90}
            endAngle={-270}
            data={radialData}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "#e2e8f0" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={clsx("text-4xl font-extrabold", isAhead ? "text-emerald-700" : "text-amber-700")}>
            {pct.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">全员打卡率</div>
        </div>
      </div>
      <div className="text-sm text-slate-500">
        目标 <span className="font-semibold text-slate-700">{tgt.toFixed(0)}%</span>
        {isAhead ? (
          <span className="ml-2 text-emerald-600 font-medium">↑ 超额</span>
        ) : (
          <span className="ml-2 text-amber-600 font-medium">↓ 差 {(tgt - pct).toFixed(1)}%</span>
        )}
      </div>
    </div>
  );
}

export function KPINorthStarSlide({ revealStep }: KPINorthStarSlideProps) {
  const { data: northStar, error: nsError } = useSWR<NorthStarData>(
    "/api/analysis/north-star",
    swrFetcher
  );
  const { data: checkinAB } = useSWR<CheckinABData>("/api/analysis/checkin-ab", swrFetcher);

  const summary = northStar?.summary ?? {};
  const avgRate = summary.avg_checkin_24h_rate ?? 0;
  const target = summary.target ?? 0.5;
  const achievedCount = northStar?.achieved_count ?? 0;
  const totalCC = northStar?.total_cc ?? 0;

  const byCC = northStar?.by_cc ?? [];
  const top5 = [...byCC]
    .filter((c) => c.checkin_24h_rate != null)
    .sort((a, b) => (b.checkin_24h_rate ?? 0) - (a.checkin_24h_rate ?? 0))
    .slice(0, 5);
  const bottom5 = [...byCC]
    .filter((c) => c.checkin_24h_rate != null)
    .sort((a, b) => (a.checkin_24h_rate ?? 0) - (b.checkin_24h_rate ?? 0))
    .slice(0, 5);

  const merged = checkinAB?.merged ?? [];
  const avgMultiplier =
    merged.length > 0
      ? merged.reduce((s, c) => s + (c.checkin_multiplier ?? 1), 0) / merged.length
      : 1;

  if (nsError) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-lg">
        北极星数据加载失败
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Title */}
      <div
        style={{ opacity: revealStep >= 0 ? 1 : 0, transition: "opacity 0.5s ease" }}
        className="text-center"
      >
        <h2 className="text-3xl font-extrabold text-slate-800 flex items-center justify-center gap-2">
          <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
          北极星指标：打卡率
          <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
        </h2>
        <p className="text-sm text-slate-500 mt-1">KPI North Star — 打卡率 × 打卡倍率</p>
      </div>

      <div className="flex flex-1 gap-8 items-start">
        {/* Circular Progress */}
        <div className="flex flex-col items-center gap-4">
          <CircularProgress rate={avgRate} target={target} visible={revealStep >= 1} />
          <div
            className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-center"
            style={{ opacity: revealStep >= 1 ? 1 : 0, transition: "opacity 0.5s ease" }}
          >
            <div className="text-2xl font-bold text-slate-800">
              {achievedCount}/{totalCC}
            </div>
            <div className="text-xs text-slate-500">人达标</div>
          </div>

          {/* Multiplier Card */}
          <div
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-6 py-4 text-center w-full"
            style={{ opacity: revealStep >= 3 ? 1 : 0, transition: "opacity 0.5s ease" }}
          >
            <TrendingUp className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
            <div className="text-3xl font-extrabold text-indigo-800">
              {avgMultiplier.toFixed(2)}x
            </div>
            <div className="text-xs text-indigo-600 mt-1">打卡倍率（打卡 vs 未打卡注册比）</div>
          </div>
        </div>

        {/* Top / Bottom 5 */}
        <div
          className="flex-1 flex flex-col gap-4"
          style={{ opacity: revealStep >= 2 ? 1 : 0, transition: "opacity 0.5s ease" }}
        >
          <div>
            <div className="text-sm font-semibold text-emerald-700 mb-2">Top 5 打卡达人</div>
            <div className="space-y-2">
              {top5.map((cc, i) => (
                <div
                  key={cc.cc_name}
                  className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-emerald-800">{cc.cc_name}</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-700">
                    {((cc.checkin_24h_rate ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-red-600 mb-2">Bottom 5 需关注</div>
            <div className="space-y-2">
              {bottom5.map((cc, i) => (
                <div
                  key={cc.cc_name}
                  className="flex items-center justify-between rounded-lg bg-red-50 border border-red-100 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-400 text-white text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-red-800">{cc.cc_name}</span>
                  </div>
                  <span className="text-sm font-bold text-red-600">
                    {((cc.checkin_24h_rate ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
