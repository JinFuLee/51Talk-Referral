"use client";

import { Card } from "@/components/ui/Card";
import { EnclosureCompareChart } from "@/components/charts/EnclosureCompareChart";
import { EnclosureCombinedOverview } from "@/components/charts/EnclosureCombinedOverview";

export default function EnclosureDetailPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">围场详情分析</h1>
        <p className="text-sm text-slate-400 mt-1">
          按付费起算天数分段 · 市场 vs 转介绍渠道对比 · 多维效率指标
        </p>
      </div>

      {/* Context card */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
            <p className="font-semibold text-slate-700 mb-1">围场定义</p>
            <p className="text-slate-500">
              用户<span className="font-medium">付费当日</span>起算天数分段：
              0-30 / 31-60 / 61-90 / 91-180 / 181+
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
            <p className="font-semibold text-blue-700 mb-1">D2×D3 对比视角</p>
            <p className="text-blue-600">
              同一围场内：市场渠道 vs 转介绍渠道转化率/参与率/学员数对比
            </p>
          </div>
          <div className="bg-emerald-50 rounded-lg px-4 py-3 border border-emerald-100">
            <p className="font-semibold text-emerald-700 mb-1">D4 合并视角</p>
            <p className="text-emerald-600">
              全渠道合并，展示每围场的活跃学员、付费、参与率、动员率综合表现
            </p>
          </div>
        </div>
      </Card>

      {/* D2×D3: Channel compare bar chart */}
      <EnclosureCompareChart />

      {/* D4: Combined overview with colored segment cards */}
      <EnclosureCombinedOverview />
    </div>
  );
}
