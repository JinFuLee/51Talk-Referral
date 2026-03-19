"use client";

import { useState } from "react";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { formatRevenue, formatRate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ChannelMetrics, RevenueContribution, ThreeFactorComparison } from "@/lib/types/channel";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CHANNEL_COLORS = ['#92400E', '#065F46', '#1E40AF', '#6B21A8'];
const TABS = ["业绩贡献", "净拆解", "三因素对标"] as const;
type Tab = (typeof TABS)[number];

interface ChannelResponse {
  channels: ChannelMetrics[];
}
interface AttributionResponse {
  contributions: RevenueContribution[];
}
interface ThreeFactorResponse {
  comparisons: ThreeFactorComparison[];
}

export default function ChannelPage() {
  const [tab, setTab] = useState<Tab>("业绩贡献");
  const { data: channelData, isLoading: c1 } = useSWR<ChannelResponse>("/api/channel", swrFetcher);
  const { data: attrData, isLoading: c2 } = useSWR<AttributionResponse>("/api/channel/attribution", swrFetcher);
  const { data: threeData, isLoading: c3 } = useSWR<ThreeFactorResponse>("/api/channel/three-factor", swrFetcher);

  const isLoading = c1 || c2 || c3;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const channels = Array.isArray(channelData) ? channelData : (channelData?.channels ?? []);
  const contributions = Array.isArray(attrData) ? attrData : (attrData?.contributions ?? []);
  const comparisons = Array.isArray(threeData) ? threeData : (threeData?.comparisons ?? []);

  const n = (v: number | null | undefined) => v ?? 0;

  const pieData = channels
    .filter((c) => n(c.revenue_usd) > 0)
    .map((c) => ({
      name: c.channel,
      value: n(c.revenue_usd),
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">渠道分析</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">CC窄/SS窄/LP窄/宽口 · 业绩归因</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-[var(--bg-subtle)] p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? "bg-[var(--bg-surface)] shadow-sm text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "业绩贡献" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="渠道业绩汇总">
            {channels.length === 0 ? (
              <EmptyState title="暂无渠道数据" description="上传数据后自动刷新" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                      <th className="py-2 pr-3">渠道</th>
                      <th className="py-2 pr-3 text-right">注册</th>
                      <th className="py-2 pr-3 text-right">预约</th>
                      <th className="py-2 pr-3 text-right">出席</th>
                      <th className="py-2 pr-3 text-right">付费</th>
                      <th className="py-2 text-right">业绩</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((c) => (
                      <tr key={c.channel} className="border-b border-[var(--border-subtle)]">
                        <td className="py-2.5 pr-3 font-medium">{c.channel}</td>
                        <td className="py-2.5 pr-3 text-right">{n(c.registrations).toLocaleString()}</td>
                        <td className="py-2.5 pr-3 text-right">{n(c.appointments).toLocaleString()}</td>
                        <td className="py-2.5 pr-3 text-right">{n(c.attendance).toLocaleString()}</td>
                        <td className="py-2.5 pr-3 text-right">{n(c.payments).toLocaleString()}</td>
                        <td className="py-2.5 text-right text-[var(--text-secondary)]">${n(c.revenue_usd).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="渠道业绩占比">
            {pieData.length === 0 ? (
              <EmptyState title="暂无渠道数据" description="上传数据后自动刷新" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "业绩"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}

      {tab === "净拆解" && (
        <Card title="渠道净业绩拆解">
          {contributions.length === 0 ? (
            <EmptyState title="暂无归因数据" description="上传数据后自动刷新" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="py-2 pr-4">渠道</th>
                    <th className="py-2 pr-4 text-right">净业绩 (USD)</th>
                    <th className="py-2 pr-4 text-right">占比</th>
                    <th className="py-2 text-right">人均业绩</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((c) => (
                    <tr key={c.channel} className="border-b border-slate-50">
                      <td className="py-2.5 pr-4 font-medium">{c.channel}</td>
                      <td className="py-2.5 pr-4 text-right font-semibold">
                        ${n(c.revenue).toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-4 text-right">{formatRate(n(c.share) / 100)}</td>
                      <td className="py-2.5 text-right text-[var(--text-secondary)]">
                        ${n(c.per_capita).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "三因素对标" && (
        <Card title="三因素对标：预约 × 出席 × 付费">
          {comparisons.length === 0 ? (
            <EmptyState title="暂无三因素数据" description="上传数据后自动刷新" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="py-2 pr-4">渠道</th>
                    <th className="py-2 pr-4 text-right">预期量</th>
                    <th className="py-2 pr-4 text-right">实际量</th>
                    <th className="py-2 pr-4 text-right">差距</th>
                    <th className="py-2 pr-4 text-right">预约因子</th>
                    <th className="py-2 pr-4 text-right">出席因子</th>
                    <th className="py-2 text-right">付费因子</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((c) => (
                    <tr key={c.channel} className="border-b border-slate-50">
                      <td className="py-2.5 pr-4 font-medium">{c.channel}</td>
                      <td className="py-2.5 pr-4 text-right">{n(c.expected_volume).toLocaleString()}</td>
                      <td className="py-2.5 pr-4 text-right font-semibold">{n(c.actual_volume).toLocaleString()}</td>
                      <td className={`py-2.5 pr-4 text-right font-medium ${n(c.gap) >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {n(c.gap) >= 0 ? "+" : ""}{n(c.gap).toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-4 text-right">{formatRate(n(c.appt_factor))}</td>
                      <td className="py-2.5 pr-4 text-right">{formatRate(n(c.show_factor))}</td>
                      <td className="py-2.5 text-right">{formatRate(n(c.pay_factor))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
