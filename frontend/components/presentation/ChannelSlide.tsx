"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ChannelMetric {
  month: string;
  registrations: number | null;
  mom_reg_pct: number | null;
  reg_paid_rate: number | null;
  unit_price_usd: number | null;
  attend_paid_rate: number | null;
}

interface ChannelEntry {
  channel: string;
  metrics: ChannelMetric[];
}

interface ChannelMomResponse {
  by_channel: ChannelEntry[];
  months: string[];
}

interface ChannelSlideProps {
  revealStep: number;
}

const CHANNEL_COLORS: Record<string, string> = {
  转介绍: "#6366f1",
  市场: "#10b981",
  直客: "#f59e0b",
  活动: "#ef4444",
};

const FALLBACK_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

function MomBadge({ pct }: { pct: number | null }) {
  if (pct === null || pct === undefined) {
    return <span className="text-slate-400 text-xs flex items-center gap-1"><Minus className="w-3 h-3" /> —</span>;
  }
  if (pct > 0) {
    return (
      <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
        <TrendingUp className="w-3 h-3" />+{pct.toFixed(1)}%
      </span>
    );
  }
  if (pct < 0) {
    return (
      <span className="text-red-500 text-xs font-medium flex items-center gap-1">
        <TrendingDown className="w-3 h-3" />{pct.toFixed(1)}%
      </span>
    );
  }
  return <span className="text-slate-400 text-xs flex items-center gap-1"><Minus className="w-3 h-3" /> 持平</span>;
}

export function ChannelSlide({ revealStep }: ChannelSlideProps) {
  const { data, error } = useSWR<ChannelMomResponse>("/api/analysis/channel-mom", fetcher);

  const byChannel = data?.by_channel ?? [];
  const months = data?.months ?? [];
  const lastMonth = months[months.length - 1] ?? "";

  // Build pie data from last month
  const pieData = byChannel
    .map((ch, i) => {
      const m = ch.metrics.find((mm) => mm.month === lastMonth);
      return {
        name: ch.channel,
        value: m?.registrations ?? 0,
        mom: m?.mom_reg_pct ?? null,
        color: CHANNEL_COLORS[ch.channel] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = pieData.reduce((s, d) => s + d.value, 0);

  // Strategy insights per channel
  const strategies: Record<string, string> = {
    转介绍: "核心渠道，提升打卡率可放大转介绍量",
    市场: "付费转化率较低，优化课前跟进",
    直客: "单价高，优先维护存量",
    活动: "季节性强，活动期集中投入",
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-lg">
        渠道数据加载失败
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
        <h2 className="text-3xl font-extrabold text-slate-800">渠道分布与环比</h2>
        <p className="text-sm text-slate-500 mt-1">Channel Breakdown — 注册量占比 + MoM</p>
      </div>

      <div className="flex flex-1 gap-6">
        {/* Pie Chart */}
        <div
          className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 flex flex-col"
          style={{ opacity: revealStep >= 1 ? 1 : 0, transition: "opacity 0.5s ease" }}
        >
          <div className="text-sm font-semibold text-slate-600 mb-2 text-center">渠道注册占比</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [value.toLocaleString(), "注册数"]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              暂无渠道数据
            </div>
          )}
          <div className="text-center text-xs text-slate-500 mt-1">
            合计 {total.toLocaleString()} 注册
          </div>
        </div>

        {/* MoM Trends */}
        <div
          className="flex-1 flex flex-col gap-3"
          style={{ opacity: revealStep >= 2 ? 1 : 0, transition: "opacity 0.5s ease" }}
        >
          <div className="text-sm font-semibold text-slate-600">渠道环比趋势</div>
          {pieData.map((ch) => (
            <div
              key={ch.name}
              className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: ch.color }}
                />
                <span className="text-sm font-medium text-slate-700">{ch.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">{ch.value.toLocaleString()} 注册</span>
                <MomBadge pct={ch.mom} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy */}
      <div
        className="rounded-xl border border-indigo-200 bg-indigo-50 px-6 py-4"
        style={{ opacity: revealStep >= 3 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <div className="text-sm font-semibold text-indigo-800 mb-2">渠道策略建议</div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(strategies).map(([ch, tip]) => (
            <div key={ch} className="text-xs text-indigo-700">
              <span className="font-semibold">{ch}：</span>{tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
