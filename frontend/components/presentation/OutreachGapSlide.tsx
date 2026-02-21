"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { ArrowRight, AlertCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { formatRevenue } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface CCGapEntry {
  cc_name: string;
  team?: string | null;
  target_calls: number;
  actual_calls: number;
  gap: number;
  gap_rate: number;
  estimated_loss_usd?: number | null;
}

interface OutreachGapSummary {
  total_target: number;
  total_actual: number;
  total_gap: number;
  total_loss_usd: number;
  gap_rate: number;
}

interface OutreachGapData {
  by_cc: CCGapEntry[];
  summary: OutreachGapSummary;
}

interface OutreachGapSlideProps {
  revealStep: number;
}

function GapNumber({
  label,
  value,
  sub,
  accent,
  visible,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: "slate" | "red" | "amber";
  visible: boolean;
}) {
  const styles = {
    slate: "border-slate-200 bg-slate-50 text-slate-800",
    red: "border-red-200 bg-red-50 text-red-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  }[accent];

  return (
    <div
      className={clsx("rounded-2xl border p-6 text-center", styles)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <div className="text-xs font-medium opacity-70 mb-1">{label}</div>
      <div className="text-4xl font-extrabold leading-none">{value}</div>
      {sub && <div className="text-xs opacity-60 mt-1">{sub}</div>}
    </div>
  );
}

function LossChain({
  gap,
  lossUsd,
  visible,
}: {
  gap: number;
  lossUsd: number;
  visible: boolean;
}) {
  // Simplified loss chain: gap calls → missed connects → missed effective → missed leads → missed revenue
  const CONNECT_RATE = 0.45;
  const EFFECTIVE_RATE = 0.6;
  const LEAD_RATE = 0.08;
  const AVG_PRICE_USD = 120;

  const missedConnects = Math.round(gap * CONNECT_RATE);
  const missedEffective = Math.round(missedConnects * EFFECTIVE_RATE);
  const missedLeads = Math.round(missedEffective * LEAD_RATE);
  const missedRevenue = lossUsd > 0 ? lossUsd : missedLeads * AVG_PRICE_USD;

  const steps = [
    { label: "缺口外呼", value: gap.toLocaleString(), unit: "次" },
    { label: "损失接通", value: missedConnects.toLocaleString(), unit: "次" },
    { label: "损失有效", value: missedEffective.toLocaleString(), unit: "次" },
    { label: "损失leads", value: missedLeads.toLocaleString(), unit: "个" },
    { label: "损失收入", value: formatRevenue(missedRevenue), unit: "" },
  ];

  return (
    <div
      className="rounded-xl border border-red-200 bg-red-50 p-5"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s ease" }}
    >
      <div className="flex items-center gap-1 mb-4">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <span className="text-sm font-semibold text-red-700">缺口→损失链</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((step, i) => (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center">
              <div className="text-lg font-bold text-red-800">
                {step.value}
                {step.unit && <span className="text-sm font-normal ml-0.5">{step.unit}</span>}
              </div>
              <div className="text-xs text-red-600">{step.label}</div>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 text-red-400 shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function OutreachGapSlide({ revealStep }: OutreachGapSlideProps) {
  const { data, error } = useSWR<OutreachGapData>("/api/analysis/outreach-gap", fetcher);

  const summary = data?.summary ?? {
    total_target: 0,
    total_actual: 0,
    total_gap: 0,
    total_loss_usd: 0,
    gap_rate: 0,
  };
  const byCC = data?.by_cc ?? [];

  const chartData = byCC
    .filter((cc) => cc.gap < 0)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 12)
    .map((cc) => ({
      name: cc.cc_name.length > 8 ? cc.cc_name.slice(0, 8) + "…" : cc.cc_name,
      gap: Math.abs(cc.gap),
      fullName: cc.cc_name,
    }));

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-lg">
        外呼缺口数据加载失败
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
        <h2 className="text-3xl font-extrabold text-slate-800">外呼缺口分析</h2>
        <p className="text-sm text-slate-500 mt-1">Outreach Gap — 目标 vs 实际 vs 收入损失</p>
      </div>

      {/* Gap Numbers */}
      <div
        className="grid grid-cols-3 gap-4"
        style={{ opacity: revealStep >= 1 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <GapNumber
          label="目标外呼"
          value={summary.total_target.toLocaleString()}
          sub="次/月"
          accent="slate"
          visible={revealStep >= 1}
        />
        <GapNumber
          label="实际外呼"
          value={summary.total_actual.toLocaleString()}
          sub={`完成率 ${summary.total_target > 0 ? ((summary.total_actual / summary.total_target) * 100).toFixed(0) : 0}%`}
          accent="amber"
          visible={revealStep >= 1}
        />
        <GapNumber
          label="外呼缺口"
          value={Math.abs(summary.total_gap).toLocaleString()}
          sub={`缺口率 ${(Math.abs(summary.gap_rate) * 100).toFixed(1)}%`}
          accent="red"
          visible={revealStep >= 1}
        />
      </div>

      {/* Loss Chain */}
      <LossChain
        gap={Math.abs(summary.total_gap)}
        lossUsd={summary.total_loss_usd}
        visible={revealStep >= 2}
      />

      {/* CC Gap Bar Chart */}
      <div
        className="flex-1 rounded-xl border border-slate-200 bg-white p-4"
        style={{ opacity: revealStep >= 3 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <div className="text-sm font-semibold text-slate-600 mb-3">CC 外呼缺口排名</div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} layout="vertical" barCategoryGap="25%">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
              <Tooltip
                formatter={(v: number) => [v.toLocaleString(), "缺口"]}
                labelFormatter={(label) => {
                  const item = chartData.find((d) => d.name === label);
                  return item?.fullName ?? label;
                }}
              />
              <ReferenceLine x={0} stroke="#94a3b8" />
              <Bar dataKey="gap" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={i < 3 ? "#ef4444" : "#f97316"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            所有 CC 均已达标外呼目标
          </div>
        )}
      </div>
    </div>
  );
}
