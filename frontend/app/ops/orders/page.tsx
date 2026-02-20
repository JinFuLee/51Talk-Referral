"use client";

import { useState } from "react";
import { useOrders } from "@/lib/hooks";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { PieChart } from "@/components/charts/PieChart";
import { ChannelBarChart } from "@/components/charts/ChannelBarChart";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import type { OrderData } from "@/lib/types";

export default function OpsOrdersPage() {
  const [search, setSearch] = useState("");
  const { data: ordersRaw, isLoading } = useOrders();

  const orders = ordersRaw as (OrderData & Record<string, unknown>) | undefined;

  const totalOrders = orders?.total_orders ?? 0;
  const totalRevenue = orders?.total_revenue ?? 0;
  const avgOrderValue = orders?.avg_order_value ?? 0;

  // Build pie data from by_type
  const byType = orders?.by_type ?? [];
  const pieData = byType.map((t) => ({ name: t.type, value: t.count }));

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

  // Channel bar chart data (synthetic from by_type if no channel_breakdown)
  const channelBreakdown = (orders as Record<string, unknown> | undefined)?.channel_breakdown as
    | Record<string, unknown>
    | undefined ?? { channels: [] };

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
          共 {totalOrders} 单 · 总收入 ¥{totalRevenue.toLocaleString()} · 均值 ¥{avgOrderValue.toLocaleString()}
        </p>
      </div>

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

      {/* Channel comparison */}
      <Card title="渠道对比（市场 vs 转介绍）">
        <ChannelBarChart data={channelBreakdown} />
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
                      {row.amount !== undefined ? `¥${Number(row.amount).toLocaleString()}` : "—"}
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
