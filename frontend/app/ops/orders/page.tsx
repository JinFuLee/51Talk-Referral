"use client";

import { useState } from "react";
import { useOrders, usePackageMix, useChannelRevenue, useExchangeRate, useTranslation } from "@/lib/hooks";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { formatRevenue } from "@/lib/utils";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { PieChart } from "@/components/charts/PieChart";
import { ChannelBarChart } from "@/components/charts/ChannelBarChart";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import type { OrderData } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { OPS_PAGE } from "@/lib/layout";

export default function OpsOrdersPage() {
  const { t } = useTranslation();
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

  const pkgItems = (packageMixRaw as { items?: Array<{ product_type: string; count: number; revenue_usd: number; percentage: number }> } | undefined)?.items ?? [];
  const pieData = pkgItems.length > 0
    ? pkgItems.map((t) => ({ name: t.product_type, value: t.revenue_usd > 0 ? t.revenue_usd : t.count }))
    : (orders?.by_type ?? []).map((t) => ({ name: t.type, value: t.count }));

  const dailySeries = (orders as Record<string, unknown> | undefined)?.daily_series as
    | Array<Record<string, unknown>>
    | undefined ?? [];

  const items = (orders as Record<string, unknown> | undefined)?.items as
    | Array<Record<string, string | number>>
    | undefined ?? [];

  const filtered = items.filter((row) =>
    Object.values(row).some((v) =>
      String(v).toLowerCase().includes(search.toLowerCase())
    )
  );

  const channelRevenueData = channelRevenueRaw as { channels?: Array<{ channel: string; revenue_usd: number; revenue_thb: number; percentage: number }>; total_usd?: number } | undefined;
  const channelBreakdown = channelRevenueData ?? ((orders as Record<string, unknown> | undefined)?.channel_breakdown as Record<string, unknown> | undefined ?? { channels: [] });

  const tableHeaders = [
    t("ops.orders.table.date"),
    "CC",
    t("ops.orders.table.student"),
    t("ops.orders.table.channel"),
    t("ops.orders.table.package"),
    t("ops.orders.table.amount"),
  ];

  if (isLoading) {
    return (
      <div className="max-w-none space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className={OPS_PAGE}>
      <PageHeader
        title={t("ops.orders.title")}
        subtitle={`共 ${totalOrders} 单 · 总收入 ${formatRevenue(totalRevenue, rate)} · 均值 ${formatRevenue(avgOrderValue, rate)}`}
      />

      <GlossaryBanner terms={[
        { term: "新单", definition: "首次购买" },
        { term: "续单", definition: "续费" },
        { term: "CC前端转介绍业绩", definition: "CC+新单+转介绍渠道" },
        { term: "SS", definition: "后端销售(数据别名EA)" },
        { term: "LP", definition: "后端服务(数据别名CM)" },
      ]} />

      <ErrorBoundary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title={t("ops.orders.card.trend")}>
            <TrendLineChart
              data={dailySeries}
              xKey="date"
              lineKeys={["revenue"]}
              barKeys={["orders"]}
            />
          </Card>
          <Card title={t("ops.orders.card.packageDist")}>
            {pieData.length > 0 ? (
              <PieChart data={pieData} />
            ) : (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                {t("ops.orders.label.noPackage")}
              </div>
            )}
          </Card>
        </div>

        <Card title={t("ops.orders.card.channelRevenue")}>
          {channelRevenueData?.channels && channelRevenueData.channels.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {[t("ops.orders.table.channel"), t("ops.orders.table.revenueUSD"), t("ops.orders.table.revenueTHB"), t("ops.orders.table.pct")].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {channelRevenueData.channels.map((ch) => (
                    <tr key={ch.channel} className="border-b border-slate-100 hover:bg-slate-50">
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

        <Card
          title={t("ops.orders.card.orderDetail")}
          actions={
            <input
              type="text"
              placeholder={t("ops.orders.input.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 w-40"
            />
          }
        >
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              {items.length === 0 ? t("ops.orders.label.noOrders") : t("ops.orders.label.noMatch")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {tableHeaders.map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map((row, i) => (
                    <tr key={`${row.date}-${row.cc_name ?? row.cc ?? i}-${row.student_name ?? row.student ?? i}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
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
      </ErrorBoundary>
    </div>
  );
}
