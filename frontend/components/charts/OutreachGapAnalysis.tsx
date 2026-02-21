"use client";

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
  Cell,
  LabelList,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { formatRevenue } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface CCGap {
  cc_name: string;
  total: number;
  called: number;
  not_called: number;
  coverage_rate: number;
  gap_vs_target: number;
}

interface OutreachGapData {
  summary: {
    total_students: number;
    called: number;
    not_called: number;
    coverage_rate: number;
    target_rate: number;
    gap_rate: number;
    gap_students: number;
  };
  loss_estimate: {
    lost_attend: number;
    lost_paid: number;
    lost_revenue_usd: number;
    lost_revenue_thb: number;
  };
  by_cc: CCGap[];
}

// ── Mock fallback ─────────────────────────────────────────────────────────────

const MOCK: OutreachGapData = {
  summary: {
    total_students: 320,
    called: 246,
    not_called: 74,
    coverage_rate: 0.769,
    target_rate: 0.85,
    gap_rate: 0.081,
    gap_students: 26,
  },
  loss_estimate: {
    lost_attend: 22,
    lost_paid: 3,
    lost_revenue_usd: 660,
    lost_revenue_thb: 22440,
  },
  by_cc: [
    { cc_name: "张伟", total: 45, called: 30, not_called: 15, coverage_rate: 0.667, gap_vs_target: 0.183 },
    { cc_name: "李娜", total: 38, called: 27, not_called: 11, coverage_rate: 0.711, gap_vs_target: 0.139 },
    { cc_name: "王芳", total: 52, called: 42, not_called: 10, coverage_rate: 0.808, gap_vs_target: 0.042 },
    { cc_name: "刘洋", total: 40, called: 34, not_called: 6, coverage_rate: 0.85, gap_vs_target: 0.0 },
    { cc_name: "陈静", total: 35, called: 31, not_called: 4, coverage_rate: 0.886, gap_vs_target: -0.036 },
  ],
};

// ── Fetcher ───────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function fetcher(): Promise<OutreachGapData> {
  const res = await fetch(`${BASE}/api/analysis/outreach-gap`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: "red" | "orange" | "green" | "slate";
}

function MetricCard({ label, value, sub, highlight = "slate" }: MetricCardProps) {
  const colorMap = {
    red: "text-red-600",
    orange: "text-orange-500",
    green: "text-green-600",
    slate: "text-slate-800",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorMap[highlight]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

interface TooltipPayloadItem {
  payload: CCGap & { pct: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{d.cc_name}</p>
      <p className="text-slate-500">已拨: {d.called} / {d.total}</p>
      <p className="text-slate-500">未拨: {d.not_called}</p>
      <p className={d.gap_vs_target > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
        缺口: {(d.gap_vs_target * 100).toFixed(1)}%
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function OutreachGapAnalysis() {
  const { data: raw, isLoading, error } = useSWR("outreach-gap", fetcher, {
    onErrorRetry: (err, _key, _cfg, revalidate, { retryCount }) => {
      if (retryCount >= 1) return;
      setTimeout(() => revalidate({ retryCount }), 3000);
    },
  });

  const data: OutreachGapData = raw ?? MOCK;
  const isMock = !raw && !isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Spinner />
      </div>
    );
  }

  const { summary, loss_estimate, by_cc } = data;

  // Build chart data: coverage rate as percentage (0–100)
  const chartData = by_cc.map((cc) => ({
    ...cc,
    pct: Math.round(cc.coverage_rate * 100),
  }));

  const targetPct = Math.round(summary.target_rate * 100);

  return (
    <div className="space-y-4">
      {isMock && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2">
          当前显示模拟数据（API 不可用）
        </div>
      )}
      {error && !isMock && (
        <div className="text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2">
          数据加载失败: {String(error)}
        </div>
      )}

      {/* Top 3 metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          label="实际覆盖率 vs 目标"
          value={`${(summary.coverage_rate * 100).toFixed(1)}%`}
          sub={`目标 ${(summary.target_rate * 100).toFixed(0)}% · 缺口 ${(summary.gap_rate * 100).toFixed(1)}%`}
          highlight={summary.gap_rate > 0.1 ? "red" : summary.gap_rate > 0.05 ? "orange" : "green"}
        />
        <MetricCard
          label="缺口学员数"
          value={`${summary.gap_students} 人`}
          sub={`未拨 ${summary.not_called} 人 / 共 ${summary.total_students} 人`}
          highlight={summary.gap_students > 30 ? "red" : summary.gap_students > 10 ? "orange" : "slate"}
        />
        <MetricCard
          label="预估损失收入"
          value={formatRevenue(loss_estimate.lost_revenue_usd)}
          sub={`→ 损失出席 ${loss_estimate.lost_attend} 人 · 损失付费 ${loss_estimate.lost_paid} 单`}
          highlight={loss_estimate.lost_revenue_usd > 1000 ? "red" : loss_estimate.lost_revenue_usd > 300 ? "orange" : "slate"}
        />
      </div>

      {/* Bar chart: CC coverage rate vs target */}
      <Card title="CC 外呼覆盖率 vs 目标（85%）">
        {by_cc.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">暂无 CC 粒度数据</p>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: Math.max(400, by_cc.length * 72) }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={chartData}
                  margin={{ top: 24, right: 16, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="cc_name"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v: number) => `${v}%`}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine
                    y={targetPct}
                    stroke="#3b82f6"
                    strokeDasharray="4 4"
                    label={{ value: `目标 ${targetPct}%`, position: "insideTopRight", fontSize: 10, fill: "#3b82f6" }}
                  />
                  <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="pct"
                      position="top"
                      formatter={(v: number) => `${v}%`}
                      style={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
                    />
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.cc_name}
                        fill={
                          entry.gap_vs_target > 0.1
                            ? "#ef4444"
                            : entry.gap_vs_target > 0
                            ? "#f97316"
                            : "#22c55e"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-red-500" /> 缺口 &gt;10%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-orange-500" /> 缺口 1–10%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-green-500" /> 达标
          </span>
        </div>
      </Card>

      {/* CC detail table */}
      <Card title="CC 外呼缺口明细（按缺口排序）">
        {by_cc.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">暂无数据</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">CC</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">总学员</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">已拨</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">未拨</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">覆盖率</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">vs 目标</th>
                </tr>
              </thead>
              <tbody>
                {by_cc.map((cc) => {
                  const isLargeGap = cc.gap_vs_target > 0.1;
                  const isMedGap = cc.gap_vs_target > 0 && !isLargeGap;
                  return (
                    <tr
                      key={cc.cc_name}
                      className={
                        isLargeGap
                          ? "bg-red-50 border-b border-red-100"
                          : isMedGap
                          ? "bg-orange-50 border-b border-orange-100"
                          : "border-b border-slate-50 hover:bg-slate-50"
                      }
                    >
                      <td className="py-2 px-3 font-medium text-slate-700">{cc.cc_name}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{cc.total}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{cc.called}</td>
                      <td className={`py-2 px-3 text-right font-medium ${cc.not_called > 0 ? "text-red-600" : "text-slate-400"}`}>
                        {cc.not_called}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700">
                        {(cc.coverage_rate * 100).toFixed(1)}%
                      </td>
                      <td className={`py-2 px-3 text-right font-semibold ${cc.gap_vs_target > 0 ? "text-red-600" : "text-green-600"}`}>
                        {cc.gap_vs_target > 0 ? "-" : "+"}
                        {Math.abs(cc.gap_vs_target * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Loss breakdown note */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-600">损失量化假设</p>
        <p>未拨学员 × 出席率 30% → 损失出席 {loss_estimate.lost_attend} 人</p>
        <p>损失出席 × 付费转化率 15% → 损失付费 {loss_estimate.lost_paid} 单</p>
        <p>损失付费 × 客单价 $200 → 损失收入 {formatRevenue(loss_estimate.lost_revenue_usd)}</p>
      </div>
    </div>
  );
}
