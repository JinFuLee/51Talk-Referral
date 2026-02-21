"use client";

import { useState } from "react";
import { useOrders, usePackageMix, useChannelRevenue, useExchangeRate } from "@/lib/hooks";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { formatRevenue } from "@/lib/utils";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { PieChart } from "@/components/charts/PieChart";
import { ChannelBarChart } from "@/components/charts/ChannelBarChart";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import type { OrderData } from "@/lib/types";

export default function OpsOrdersPage() {
  const [search, setSearch] = useState("");
  const { data: ordersRaw, isLoading } = useOrders();
  const { data: packageMixRaw } = usePackageMix();
  const { data: channelRevenueRaw } = useChannelRevenue();
  const { data: exchangeRateRaw } = useExchangeRate();

  const rate = (exchangeRateRaw as { rate?: number } | undefined)?.rate ?? 34;
  const orders = ordersRaw as (OrderData & Record<string, unknown>) | undefined;

  const totalOrders = orders?.total_orders ?? 0;
  const totalRevenue = orders?.total_revenue ?? 0;
  const avgOrderValue = orders?.avg_order_value ?? 0;

  // Build pie data from package-mix endpoint (E6), fallback to by_type
  const pkgItems = (packageMixRaw as { items?: Array<{ product_type: string; count: number; revenue_usd: number; percentage: number }> } | undefined)?.items ?? [];
  const pieData = pkgItems.length > 0
    ? pkgItems.map((t) => ({ name: t.product_type, value: t.revenue_usd > 0 ? t.revenue_usd : t.count }))
    : (orders?.by_type ?? []).map((t) => ({ name: t.type, value: t.count }));

  // Daily trend series
  const dailySeries = (orders as Record<string, unknown> | undefined)?.daily_series as
    | Array<Record<string, unknown>>
    | undefined ?? [];

  // Items / detail rows
  const items = (orders as Record<string, unknown> | undefined)?.items as
    | Array<Record<string, string | number>>
    | undefined ?? [];

  const filtered = items.filter((row) =>
    Object.values(row).some((v) =>
      String(v).toLowerCase().includes(search.toLowerCase())
    )
  );

  // Channel bar chart: use channel-revenue endpoint (E8), fallback to channel_breakdown
  const channelRevenueData = channelRevenueRaw as { channels?: Array<{ channel: string; revenue_usd: number; revenue_thb: number; percentage: number }>; total_usd?: number } | undefined;
  const channelBreakdown = channelRevenueData ?? ((orders as Record<string, unknown> | undefined)?.channel_breakdown as Record<string, unknown> | undefined ?? { channels: [] });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">订单分析</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          共 {totalOrders} 单 · 总收入 {formatRevenue(totalRevenue, rate)} · 均值 {formatRevenue(avgOrderValue, rate)}
        </p>
      </div>

      <GlossaryBanner terms={[
        { term: "新单", definition: "首次购买" },
        { term: "续单", definition: "续费" },
        { term: "CC前端转介绍业绩", definition: "CC+新单+转介绍渠道" },
        { term: "SS", definition: "后端销售(数据别名EA)" },
        { term: "LP", definition: "后端服务(数据别名CM)" },
      ]} />

      {/* Trend + Pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="日付费趋势">
          <TrendLineChart
            data={dailySeries}
            xKey="date"
            lineKeys={["revenue"]}
            barKeys={["orders"]}
          />
        </Card>
        <Card title="套餐分布">
          {pieData.length > 0 ? (
            <PieChart data={pieData} />
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              暂无套餐数据
            </div>
          )}
        </Card>
      </div>

      {/* Channel revenue comparison */}
      <Card title="渠道收入对比（E8）">
        {channelRevenueData?.channels && channelRevenueData.channels.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["渠道", "收入 (USD)", "收入 (THB)", "占比"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {channelRevenueData.channels.map((ch, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{ch.channel}</td>
                    <td className="px-4 py-3 text-slate-700">${Math.round(ch.revenue_usd).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600">฿{Math.round(ch.revenue_thb).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600">{ch.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ChannelBarChart data={channelBreakdown as Record<string, unknown>} />
        )}
      </Card>

      {/* Order detail table */}
      <Card
        title="订单明细"
        actions={
          <input
            type="text"
            placeholder="搜索…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 w-40"
          />
        }
      >
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            {items.length === 0 ? "暂无订单数据，请先运行分析" : "无匹配结果"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["日期", "CC", "学员", "渠道", "套餐", "金额"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.date ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{row.cc_name ?? row.cc ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{row.student_name ?? row.student ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{row.channel ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{row.package ?? row.type ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-700 font-medium">
                      {row.amount !== undefined ? formatRevenue(Number(row.amount), rate) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <p className="text-xs text-slate-400 text-center py-2">
                仅显示前 100 条，共 {filtered.length} 条
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
