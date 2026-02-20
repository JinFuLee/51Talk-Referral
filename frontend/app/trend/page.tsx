"use client";

import { useState } from "react";
import { useTrend, useDailyKPI } from "@/lib/hooks";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { DailyKPIChart } from "@/components/charts/DailyKPIChart";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import type { TrendData } from "@/lib/types";

type CompareType = "mom" | "wow" | "yoy";

const COMPARE_TABS: { key: CompareType; label: string }[] = [
  { key: "mom", label: "月环比" },
  { key: "wow", label: "周环比 (WoW)" },
  { key: "yoy", label: "月同比" },
];

const DIRECTION_CONFIG = {
  rising:   { icon: "↑", color: "bg-emerald-100 text-emerald-700", text: "上升趋势" },
  falling:  { icon: "↓", color: "bg-rose-100 text-rose-700",    text: "下降趋势" },
  volatile: { icon: "~", color: "bg-amber-100 text-amber-700",  text: "波动" },
} as const;

function TrendBadge({ direction }: { direction?: string }) {
  if (!direction || direction === "insufficient") return null;
  const c = DIRECTION_CONFIG[direction as keyof typeof DIRECTION_CONFIG];
  if (!c) return null;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.color}`}>
      {c.icon} {c.text}
    </span>
  );
}

export default function TrendPage() {
  const [compareType, setCompareType] = useState<CompareType>("mom");
  const { data: trendRaw, isLoading: trendLoading } = useTrend(compareType);
  const { data: dailyKPI, isLoading: dailyLoading } = useDailyKPI();

  const trend = trendRaw as TrendData | undefined;

  const COMPARE_LABEL: Record<CompareType, string> = {
    mom: "月环比趋势",
    wow: "周环比趋势",
    yoy: "月同比趋势",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-800">趋势分析</h1>
          <TrendBadge direction={trend?.direction} />
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {COMPARE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setCompareType(t.key)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                compareType === t.key
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Peak / Valley summary line */}
      {trend?.peak && trend?.valley && (
        <p className="text-xs text-slate-400">
          峰值: {trend.peak.value.toLocaleString()} ({trend.peak.date}) &nbsp;|&nbsp; 谷底: {trend.valley.value.toLocaleString()} ({trend.valley.date})
        </p>
      )}

      <Card title={COMPARE_LABEL[compareType]}>
        {trendLoading ? (
          <Spinner />
        ) : compareType === "wow" && (!trend || (trend.series ?? []).length < 2) ? (
          <EmptyState msg="暂无周对比数据，需累积至少 2 周快照" />
        ) : trend ? (
          <TrendLineChart
            data={trend}
            peak={trend.peak}
            valley={trend.valley}
          />
        ) : (
          <EmptyState />
        )}
      </Card>

      <Card title="日级 KPI 曲线">
        {dailyLoading ? (
          <Spinner />
        ) : dailyKPI && dailyKPI.length > 0 ? (
          <DailyKPIChart data={dailyKPI} />
        ) : (
          <EmptyState msg="暂无日级快照数据（需运行历史导入）" />
        )}
      </Card>
    </div>
  );
}

function EmptyState({ msg = "暂无数据" }: { msg?: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
      {msg}
    </div>
  );
}
