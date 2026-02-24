"use client";

import { useMemo } from "react";
import useSWR from "swr";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { swrFetcher } from "@/lib/api";
import { formatRevenue } from "@/lib/utils";
import type { MemberProfileResponse } from "@/lib/types/member";

interface RevenueSharePanelProps {
  revenue: MemberProfileResponse["revenue"];
}

interface ExchangeRateResponse {
  usd_to_thb: number;
}

const PIE_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#94a3b8",
];

const MAX_PIE_SLICES = 5;

export function RevenueSharePanel({ revenue }: RevenueSharePanelProps) {
  const { data: rateData } = useSWR<ExchangeRateResponse>(
    "/api/config/exchange-rate",
    swrFetcher
  );
  const exchangeRate = rateData?.usd_to_thb ?? 34;

  const hasData =
    revenue &&
    (revenue.mtd_usd > 0 || (revenue.package_mix ?? []).length > 0);

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">金钱与订单转化池</h3>
        <div className="flex items-center justify-center h-40 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-sm text-slate-400 text-center px-4">
            本月暂无转介绍订单数据，请上传 E7/E8 订单明细文件
          </p>
        </div>
      </div>
    );
  }

  // Merge packages beyond top-5 into "其他"
  const packageMix = useMemo(() => {
    const sorted = [...(revenue.package_mix ?? [])].sort((a, b) => b.pct - a.pct);
    if (sorted.length <= MAX_PIE_SLICES) return sorted;
    const top = sorted.slice(0, MAX_PIE_SLICES);
    const otherPct = sorted.slice(MAX_PIE_SLICES).reduce((s, p) => s + p.pct, 0);
    const otherCount = sorted.slice(MAX_PIE_SLICES).reduce((s, p) => s + p.count, 0);
    return [...top, { type: "其他", pct: otherPct, count: otherCount }];
  }, [revenue.package_mix]);

  const totalOrders = useMemo(
    () => (revenue.package_mix ?? []).reduce((s, p) => s + p.count, 0),
    [revenue.package_mix]
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">金钱与订单转化池</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KPI Cards */}
        <div className="space-y-3">
          {/* Revenue KPI */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">当月业绩</p>
            <p className="text-2xl font-bold text-slate-800">
              {formatRevenue(revenue.mtd_usd, exchangeRate)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              团队排名{" "}
              <span className="font-semibold text-slate-600">
                #{revenue.rank_in_team}/{revenue.team_size}
              </span>
            </p>
          </div>

          {/* Orders KPI */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">付费单量</p>
            <p className="text-2xl font-bold text-slate-800">
              {totalOrders} <span className="text-base font-normal text-slate-500">单</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              客单价{" "}
              <span className="font-semibold text-slate-600">
                ${(revenue.asp_usd ?? 0).toFixed(1)}
              </span>
            </p>
          </div>
        </div>

        {/* Pie chart */}
        <div>
          <p className="text-xs text-slate-500 mb-2">套餐组合分布</p>
          {packageMix.length === 0 ? (
            <div className="flex items-center justify-center h-40 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-400">暂无套餐数据</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={packageMix}
                  dataKey="pct"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={32}
                  paddingAngle={2}
                >
                  {packageMix.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number, name: string) => [
                    `${(val * 100).toFixed(1)}%`,
                    name,
                  ]}
                />
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value, entry) => {
                    const item = packageMix.find((p) => p.type === value);
                    return (
                      <span style={{ color: entry.color }}>
                        {value} {item ? `${(item.pct * 100).toFixed(0)}%` : ""}
                      </span>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
