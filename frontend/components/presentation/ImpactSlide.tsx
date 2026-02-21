"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { TrendingUp, ArrowDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { formatRevenue } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ImpactItem {
  metric: string;
  metric_label: string;
  gap: number;
  loss_usd: number;
  fix_gain_usd: number;
  category: string;
}

interface ImpactChainData {
  items: ImpactItem[];
  total_loss_usd: number;
  total_fix_gain_usd: number;
  summary: string;
}

interface ImpactSlideProps {
  revealStep: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  efficiency: "#6366f1",
  outreach: "#3b82f6",
  trial: "#8b5cf6",
  followup: "#f59e0b",
};

const FALLBACK_DATA: ImpactChainData = {
  items: [
    { metric: "checkin_rate", metric_label: "打卡率", gap: -0.08, loss_usd: 3200, fix_gain_usd: 3200, category: "efficiency" },
    { metric: "participation_rate", metric_label: "参与率", gap: -0.05, loss_usd: 2100, fix_gain_usd: 2100, category: "efficiency" },
    { metric: "outreach_effective", metric_label: "有效接通", gap: -120, loss_usd: 1800, fix_gain_usd: 1800, category: "outreach" },
    { metric: "trial_post_rate", metric_label: "课后跟进率", gap: -0.12, loss_usd: 1400, fix_gain_usd: 1400, category: "trial" },
    { metric: "conversion_rate", metric_label: "注册→付费", gap: -0.03, loss_usd: 900, fix_gain_usd: 900, category: "efficiency" },
    { metric: "zero_followup", metric_label: "零跟进率", gap: 0.25, loss_usd: 650, fix_gain_usd: 650, category: "followup" },
  ],
  total_loss_usd: 10050,
  total_fix_gain_usd: 10050,
  summary: "修复全部效率缺口可增收约 $10,050",
};

function WaterfallChart({
  items,
  visible,
}: {
  items: ImpactItem[];
  visible: boolean;
}) {
  const sorted = [...items].sort((a, b) => b.loss_usd - a.loss_usd);

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease" }}
    >
      <div className="text-sm font-semibold text-slate-600 mb-3">效率 Gap → 收入损失（瀑布图）</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={sorted} barCategoryGap="20%">
          <XAxis
            dataKey="metric_label"
            tick={{ fontSize: 10 }}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(v: number) => [formatRevenue(v), "损失"]}
            labelFormatter={(label) => `指标: ${label}`}
          />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Bar dataKey="loss_usd" radius={[6, 6, 0, 0]}>
            {sorted.map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={CATEGORY_COLORS[entry.category] ?? "#6366f1"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ImpactSlide({ revealStep }: ImpactSlideProps) {
  const { data, error } = useSWR<ImpactChainData>("/api/analysis/impact-chain", fetcher);

  // Use real data if available, else fallback
  const chainData: ImpactChainData = !error && data?.items?.length
    ? data
    : FALLBACK_DATA;

  const { items, total_loss_usd, total_fix_gain_usd } = chainData;
  const sorted = [...items].sort((a, b) => b.loss_usd - a.loss_usd);

  // Build waterfall steps cumulatively for display
  let cumulative = 0;
  const waterfallSteps = sorted.map((item) => {
    cumulative += item.loss_usd;
    return { ...item, cumulative };
  });

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Title */}
      <div
        style={{ opacity: revealStep >= 0 ? 1 : 0, transition: "opacity 0.5s ease" }}
        className="text-center"
      >
        <h2 className="text-3xl font-extrabold text-slate-800">效率缺口影响模拟</h2>
        <p className="text-sm text-slate-500 mt-1">Impact Simulation — 每个效率 gap 对应的 $ 损失</p>
      </div>

      {/* Waterfall Chart */}
      <WaterfallChart items={items} visible={revealStep >= 1} />

      {/* Item breakdown */}
      <div
        className="flex-1 overflow-hidden"
        style={{ opacity: revealStep >= 1 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <div className="grid grid-cols-2 gap-2">
          {sorted.slice(0, 6).map((item) => (
            <div
              key={item.metric}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[item.category] ?? "#6366f1" }}
                />
                <span className="text-xs font-medium text-slate-700">{item.metric_label}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-red-600 font-semibold">
                <ArrowDown className="w-3 h-3" />
                {formatRevenue(item.loss_usd)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total Loss / Fix Summary */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Loss */}
        <div
          className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-center"
          style={{ opacity: revealStep >= 2 ? 1 : 0, transition: "opacity 0.5s ease" }}
        >
          <div className="text-xs font-semibold text-red-600 mb-1">本月效率缺口总损失</div>
          <div className="text-3xl font-extrabold text-red-800">{formatRevenue(total_loss_usd)}</div>
          <div className="text-xs text-red-500 mt-1">
            来自 {items.length} 个效率指标缺口
          </div>
        </div>

        {/* Fix Gain */}
        <div
          className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 text-center"
          style={{ opacity: revealStep >= 3 ? 1 : 0, transition: "opacity 0.5s ease" }}
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-600">全部修复后可增收</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-800">
            {formatRevenue(total_fix_gain_usd)}
          </div>
          <div className="text-xs text-emerald-600 mt-1">
            <span className="font-semibold">建议优先修复：</span>
            {sorted[0]?.metric_label ?? "—"} (+{formatRevenue(sorted[0]?.fix_gain_usd ?? 0)})
          </div>
        </div>
      </div>
    </div>
  );
}
