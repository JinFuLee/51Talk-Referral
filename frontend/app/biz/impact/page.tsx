"use client";

import { useImpactChain } from "@/lib/hooks";
import { formatRevenue } from "@/lib/utils";
import { ImpactWaterfallChart } from "@/components/biz/ImpactWaterfallChart";
import { WhatIfSimulator } from "@/components/biz/WhatIfSimulator";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export default function ImpactChainPage() {
  const { data, isLoading, error } = useImpactChain();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {error ? `数据加载失败: ${error.message}` : "暂无影响链数据，请先运行分析引擎"}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">影响链分析</h1>
        <p className="text-sm text-slate-400 mt-1">
          效率指标缺口 → 收入损失量化 · What-if 模拟器
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4">
          <p className="text-xs text-red-400 font-medium">总收入损失</p>
          <p className="text-xl font-bold text-red-700 mt-1">
            {formatRevenue(data.total_lost_revenue_usd)}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4">
          <p className="text-xs text-amber-500 font-medium">最大杠杆指标</p>
          <p className="text-xl font-bold text-amber-700 mt-1">{data.top_lever_label}</p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-4">
          <p className="text-xs text-slate-400 font-medium">分析指标数</p>
          <p className="text-xl font-bold text-slate-700 mt-1">{data.chains.length} 项</p>
        </div>
      </div>

      {/* Waterfall chart */}
      <Card
        title="效率损失瀑布图"
        actions={
          <span className="text-xs text-slate-400">
            总损失: {formatRevenue(data.total_lost_revenue_usd)} · 最大杠杆: {data.top_lever_label}
          </span>
        }
      >
        <ImpactWaterfallChart data={data} />
      </Card>

      {/* What-if simulator */}
      <Card title="What-if 模拟器">
        <p className="text-xs text-slate-500 mb-4">
          拖动滑块调节效率指标，实时查看对付费单数和收入的预期影响
        </p>
        <WhatIfSimulator chains={data.chains} />
      </Card>
    </div>
  );
}
