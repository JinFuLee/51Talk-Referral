"use client";

import { useMemo, memo } from "react";
import useSWR from "swr";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatRevenue, CHART_FONT_SIZE, CHART_HEIGHT } from "@/lib/utils";
import { swrFetcher } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface RetentionRankItem {
  cc_name: string;
  followup_count: number;
  retention_rate: number;
  retained_revenue_usd: number;
  contribution_pct: number;
}

interface RetentionAPIResponse {
  rankings: RetentionRankItem[];
  total_retained: number;
}

interface ExchangeRateResponse {
  usd_to_thb: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const BAR_COLORS = [
  "hsl(var(--chart-2))",
  "hsl(var(--success))",
  "hsl(var(--chart-amber))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-pink))",
  "hsl(var(--chart-lime))",
  "hsl(var(--destructive))",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function ContributionBar({ pct }: { pct: number }) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs text-slate-600 w-10 text-right">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

function RetentionContributionRankInner() {
  const { data, error, isLoading } = useSWR<RetentionAPIResponse>(
    "/api/analysis/retention-contribution",
    swrFetcher
  );
  const { data: rateData } = useSWR<ExchangeRateResponse>(
    "/api/config/exchange-rate",
    swrFetcher
  );
  const exchangeRate = rateData?.usd_to_thb ?? 34;

  const rankings = useMemo(() => data?.rankings ?? [], [data?.rankings]);
  const totalRetained = data?.total_retained ?? 0;

  // Top 10 for bar chart
  const top10 = useMemo(() => rankings.slice(0, 10), [rankings]);
  const barData = useMemo(
    () => top10.map((r) => ({ name: r.cc_name || "未知", revenue: r.retained_revenue_usd })),
    [top10]
  );
  const totalRevenue = useMemo(
    () => rankings.reduce((s, r) => s + r.retained_revenue_usd, 0),
    [rankings]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400">
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
        数据加载失败：{String(error?.message ?? error)}
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400">
        暂无留存贡献数据，请先运行分析
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stat */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-400">CC 总数</p>
          <p className="text-xl font-bold text-slate-800 mt-0.5">
            {rankings.length}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-400">总跟进量</p>
          <p className="text-xl font-bold text-slate-800 mt-0.5">
            {totalRetained.toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-400">留存总收入</p>
          <p className="text-lg font-bold text-slate-800 mt-0.5">
            {formatRevenue(totalRevenue, exchangeRate)}
          </p>
        </div>
      </div>

      {/* Bar chart */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">
          留存收入排名（Top {top10.length}）
        </p>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT.sm} aria-label="留存收入排名">
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis tickLine={false} axisLine={false} type="number"
              tick={{ fontSize: CHART_FONT_SIZE.sm }}
              tickFormatter={(v) => `$${v.toLocaleString()}`}
            />
            <YAxis tickLine={false} axisLine={false} type="category"
              dataKey="name"
              tick={{ fontSize: CHART_FONT_SIZE.md }}
              width={72} />
            <Tooltip
              formatter={(val) => [
                formatRevenue(val as number, exchangeRate),
                "留存收入",
              ]}
            />
            <Bar dataKey="revenue" radius={[0, 3, 3, 0]}>
              {barData.map((_, i) => (
                <Cell
                  key={i}
                  fill={BAR_COLORS[i % BAR_COLORS.length]}
                  opacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 px-2 text-slate-400 font-medium w-8">
                排名
              </th>
              <th className="text-left py-2 px-2 text-slate-400 font-medium">
                CC
              </th>
              <th className="text-right py-2 px-2 text-slate-400 font-medium">
                跟进数
              </th>
              <th className="text-right py-2 px-2 text-slate-400 font-medium">
                留存率
              </th>
              <th className="text-right py-2 px-2 text-slate-400 font-medium">
                留存收入
              </th>
              <th className="py-2 px-2 text-slate-400 font-medium min-w-[120px]">
                贡献占比
              </th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((r, idx) => (
              <tr
                key={r.cc_name || idx}
                className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
              >
                <td className="py-2 px-2 text-slate-400 font-mono">
                  {idx + 1}
                </td>
                <td className="py-2 px-2 text-slate-700 font-medium">
                  {r.cc_name || "—"}
                </td>
                <td className="py-2 px-2 text-right text-slate-700">
                  {r.followup_count.toLocaleString()}
                </td>
                <td className="py-2 px-2 text-right text-slate-700">
                  {r.retention_rate > 0
                    ? `${(r.retention_rate * 100).toFixed(1)}%`
                    : "—"}
                </td>
                <td className="py-2 px-2 text-right text-slate-700">
                  {r.retained_revenue_usd > 0
                    ? formatRevenue(r.retained_revenue_usd, exchangeRate)
                    : "—"}
                </td>
                <td className="py-2 px-2">
                  <ContributionBar pct={r.contribution_pct} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const RetentionContributionRank = memo(RetentionContributionRankInner);
