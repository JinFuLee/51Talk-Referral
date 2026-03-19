"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { formatRevenue, formatRate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { PercentBar } from "@/components/shared/PercentBar";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CHANNEL_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

interface OverviewStage {
  name: string;
  target: number;
  actual: number;
  achievement_rate: number;
  conversion_rate?: number;
}

interface ChannelShare {
  channel: string;
  revenue_usd: number;
  share_pct: number;
}

interface OverviewData {
  funnel_stages: OverviewStage[];
  channel_shares: ChannelShare[];
  datasource_status: { name: string; available: boolean }[];
}

function FunnelSnapshot({ stages }: { stages: OverviewStage[] }) {
  const pairs = [
    { from: "注册", to: "预约" },
    { from: "预约", to: "出席" },
    { from: "出席", to: "付费" },
  ];
  const stageMap = Object.fromEntries(stages.map((s) => [s.name, s]));

  return (
    <div className="space-y-3">
      {pairs.map(({ from, to }) => {
        const fromStage = stageMap[from];
        const toStage = stageMap[to];
        if (!fromStage || !toStage) return null;
        const rate = fromStage.actual > 0 ? toStage.actual / fromStage.actual : 0;
        return (
          <div key={`${from}-${to}`}>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{from} → {to}</span>
              <span className="font-medium">{formatRate(rate)}</span>
            </div>
            <PercentBar value={rate * 100} max={100} />
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useSWR<OverviewData>(
    "/api/overview",
    swrFetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="数据加载失败"
        description="无法获取概览数据，请检查后端服务是否正常运行"
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="暂无数据"
        description="请先上传数据文件，然后刷新页面"
      />
    );
  }

  const stages = data.funnel_stages ?? [];
  const channels = data.channel_shares ?? [];
  const sources = data.datasource_status ?? [];

  const stageKeys = ["注册", "预约", "出席", "付费"];
  const statStages = stages.filter((s) => stageKeys.includes(s.name));

  const pieData = channels.map((c) => ({
    name: c.channel,
    value: c.revenue_usd,
  }));

  const allSourcesOk = sources.length > 0 && sources.every((s) => s.available);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">运营总览</h1>
        <p className="text-sm text-slate-500 mt-1">转介绍漏斗达成情况 · 渠道业绩分布</p>
      </div>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statStages.map((s) => (
          <StatCard
            key={s.name}
            label={s.name}
            value={s.actual.toLocaleString()}
            target={s.target.toLocaleString()}
            achievement={s.achievement_rate}
          />
        ))}
      </div>

      {/* 中部：漏斗 + 渠道 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="漏斗转化率">
          {stages.length === 0 ? (
            <EmptyState title="暂无漏斗数据" description="上传数据后自动刷新" />
          ) : (
            <FunnelSnapshot stages={stages} />
          )}
        </Card>

        <Card title="渠道业绩占比">
          {pieData.length === 0 ? (
            <EmptyState title="暂无渠道数据" description="上传数据后自动刷新" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [formatRevenue(val), "业绩"]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* 数据源状态 */}
      <Card title="数据源状态">
        {sources.length === 0 ? (
          <EmptyState
            title="未检测到数据源"
            description="请前往设置页面配置数据文件路径"
          />
        ) : (
          <div className="flex flex-wrap gap-3">
            {sources.map((s) => (
              <div
                key={s.name}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                  s.available
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    s.available ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                {s.name}
              </div>
            ))}
            {!allSourcesOk && (
              <p className="w-full text-xs text-slate-400 mt-1">
                部分数据源缺失，分析结果可能不完整
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
