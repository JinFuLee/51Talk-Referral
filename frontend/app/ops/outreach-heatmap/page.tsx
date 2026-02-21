"use client";

import { useState, useEffect } from "react";
import { CCOutreachHeatmap } from "@/components/ops/CCOutreachHeatmap";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

// ── Types ──────────────────────────────────────────────────────────────────────

interface HeatmapCell {
  cc_name: string;
  date: string;
  calls: number;
  connects: number;
  effective: number;
  effective_rate: number;
}

interface HeatmapSummary {
  total_calls: number;
  avg_daily: number;
  top_cc: string;
}

interface HeatmapData {
  dates: string[];
  cc_names: string[];
  data: HeatmapCell[];
  summary: HeatmapSummary;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CCOutreachHeatmapPage() {
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/analysis/outreach-heatmap")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: HeatmapData) => {
        setHeatmap(d);
        setError(null);
      })
      .catch((e: Error) => {
        setError(e.message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-none space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">CC 外呼热力图</h1>
          <p className="text-xs text-slate-400 mt-0.5">CC × 日期二维热力图</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          数据加载失败: {error}。请先运行分析后刷新。
        </div>
      </div>
    );
  }

  const summary = heatmap?.summary ?? { total_calls: 0, avg_daily: 0, top_cc: "" };

  return (
    <div className="max-w-none space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">CC 外呼热力图</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          CC × 日期二维矩阵 · 颜色=拨打量深浅 · 可切换维度
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">月总拨打量</div>
          <div className="mt-1 text-2xl font-bold text-blue-700">
            {summary.total_calls.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">日均拨打</div>
          <div className="mt-1 text-2xl font-bold text-blue-600">
            {summary.avg_daily.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">本月 Top CC</div>
          <div className="mt-1 text-2xl font-bold text-indigo-700 truncate">
            {summary.top_cc || "—"}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <Card title="CC 外呼热力图（CC × 日期）">
        <CCOutreachHeatmap
          dates={heatmap?.dates ?? []}
          cc_names={heatmap?.cc_names ?? []}
          data={heatmap?.data ?? []}
        />
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>颜色图例：</span>
        <span className="rounded px-2 py-0.5 bg-slate-50 border border-slate-200">0</span>
        <span className="rounded px-2 py-0.5 bg-slate-100">低</span>
        <span className="rounded px-2 py-0.5 bg-blue-100 text-blue-700">中低</span>
        <span className="rounded px-2 py-0.5 bg-blue-300 text-white">中</span>
        <span className="rounded px-2 py-0.5 bg-blue-500 text-white">中高</span>
        <span className="rounded px-2 py-0.5 bg-blue-700 text-white">高</span>
      </div>
    </div>
  );
}
