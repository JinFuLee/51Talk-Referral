"use client";

import { useState } from "react";
import { useTrend, useDailyKPI } from "@/lib/hooks";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { DailyKPIChart } from "@/components/charts/DailyKPIChart";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export default function TrendPage() {
  const [compareType, setCompareType] = useState<"mom" | "yoy">("mom");
  const { data: trend, isLoading: trendLoading } = useTrend(compareType);
  const { data: dailyKPI, isLoading: dailyLoading } = useDailyKPI();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">趋势分析</h1>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {(["mom", "yoy"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setCompareType(t)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                compareType === t
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t === "mom" ? "月环比" : "月同比"}
            </button>
          ))}
        </div>
      </div>

      <Card title={compareType === "mom" ? "月环比趋势" : "月同比趋势"}>
        {trendLoading ? (
          <Spinner />
        ) : trend ? (
          <TrendLineChart data={trend as Record<string, unknown>} />
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
