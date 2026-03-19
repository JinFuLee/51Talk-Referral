"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { formatRevenue, formatRate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { PercentBar } from "@/components/shared/PercentBar";

/* ── 后端实际返回结构 ────────────────────────────────────────────── */

interface OverviewResponse {
  metrics: Record<string, number | string | null>;
  data_sources: { id: string; name: string; has_file: boolean; row_count: number }[];
}

/* ── KPI 卡片定义 ─────────────────────────────────────────────── */

const KPI_CARDS: { key: string; label: string; format?: "rate" | "currency" }[] = [
  { key: "转介绍注册数", label: "注册" },
  { key: "预约数", label: "预约" },
  { key: "出席数", label: "出席" },
  { key: "转介绍付费数", label: "付费" },
  { key: "总带新付费金额USD", label: "业绩 (USD)", format: "currency" },
  { key: "客单价", label: "客单价", format: "currency" },
];

const RATE_PAIRS: { from: string; to: string; rateKey: string }[] = [
  { from: "转介绍注册数", to: "预约数", rateKey: "注册预约率" },
  { from: "预约数", to: "出席数", rateKey: "预约出席率" },
  { from: "出席数", to: "转介绍付费数", rateKey: "出席付费率" },
];

function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

/* ── 漏斗转化率条 ─────────────────────────────────────────────── */

function FunnelSnapshot({ metrics }: { metrics: Record<string, number | string | null> }) {
  return (
    <div className="space-y-3">
      {RATE_PAIRS.map(({ from, to, rateKey }) => {
        const rate = num(metrics[rateKey]);
        return (
          <div key={rateKey}>
            <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
              <span>
                {from.replace("转介绍", "").replace("数", "")} → {to.replace("数", "")}
              </span>
              <span className="font-medium">{formatRate(rate)}</span>
            </div>
            <PercentBar value={rate * 100} max={100} />
          </div>
        );
      })}
    </div>
  );
}

/* ── 主页面 ───────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { data, isLoading, error } = useSWR<OverviewResponse>(
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

  const metrics = data?.metrics ?? {};
  const sources = data?.data_sources ?? [];
  const hasMetrics = Object.keys(metrics).length > 0;

  if (!hasMetrics && sources.length === 0) {
    return (
      <EmptyState
        title="暂无数据"
        description="请先上传数据文件，然后刷新页面"
      />
    );
  }

  const allSourcesOk = sources.length > 0 && sources.every((s) => s.has_file);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">运营总览</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">转介绍漏斗达成情况 · 数据源状态</p>
      </div>

      {/* KPI 卡片 */}
      {hasMetrics && (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {KPI_CARDS.map(({ key, label, format }) => {
            const v = num(metrics[key]);
            const display =
              format === "currency"
                ? formatRevenue(v)
                : format === "rate"
                  ? formatRate(v)
                  : v.toLocaleString();
            return (
              <StatCard key={key} label={label} value={display} />
            );
          })}
        </div>
      )}

      {/* 漏斗转化率 */}
      <Card title="漏斗转化率">
        {!hasMetrics ? (
          <EmptyState title="暂无漏斗数据" description="上传数据后自动刷新" />
        ) : (
          <FunnelSnapshot metrics={metrics} />
        )}
      </Card>

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
                key={s.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                  s.has_file
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                    : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    s.has_file ? "bg-emerald-500 dark:bg-emerald-400" : "bg-red-500 dark:bg-red-400"
                  }`}
                />
                {s.name}
                {s.has_file && (
                  <span className="text-[var(--text-muted)] ml-1">({s.row_count})</span>
                )}
              </div>
            ))}
            {!allSourcesOk && (
              <p className="w-full text-xs text-[var(--text-muted)] mt-1">
                部分数据源缺失，分析结果可能不完整
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
