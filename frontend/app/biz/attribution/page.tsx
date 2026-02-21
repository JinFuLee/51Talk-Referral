"use client";

import { useAttribution } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import type { AttributionFactor } from "@/lib/types";

function AttributionBar({ factor }: { factor: AttributionFactor }) {
  const pct = Math.round(factor.contribution * 100);
  const barColor =
    pct >= 30 ? "bg-blue-500" : pct >= 15 ? "bg-indigo-400" : "bg-slate-300";

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-28 shrink-0 text-slate-600 text-right text-xs truncate">
        {factor.label ?? factor.factor}
      </div>
      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-12 text-right font-semibold text-slate-700 text-xs">
        {pct}%
      </div>
    </div>
  );
}

export default function AttributionPage() {
  const { data, isLoading, error } = useAttribution();

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
          {error
            ? `数据加载失败: ${error.message}`
            : "暂无归因数据，请先运行分析引擎"}
        </div>
      </div>
    );
  }

  const attrData = data as { factors?: AttributionFactor[] } | undefined;
  const factors: AttributionFactor[] = attrData?.factors ?? [];
  const sorted = [...factors].sort((a, b) => b.contribution - a.contribution);
  const topFactor = sorted[0];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">归因分析</h1>
        <p className="text-sm text-slate-400 mt-1">
          各驱动因素对转介绍业绩的贡献度拆解
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
          <p className="text-xs text-blue-400 font-medium">最大贡献因素</p>
          <p className="text-xl font-bold text-blue-700 mt-1">
            {topFactor ? (topFactor.label ?? topFactor.factor) : "—"}
          </p>
          {topFactor && (
            <p className="text-sm text-blue-500 mt-0.5">
              贡献度 {Math.round(topFactor.contribution * 100)}%
            </p>
          )}
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-4">
          <p className="text-xs text-slate-400 font-medium">分析因素数</p>
          <p className="text-xl font-bold text-slate-700 mt-1">
            {factors.length} 项
          </p>
        </div>
      </div>

      {/* Attribution bar chart */}
      <Card title="贡献度分布">
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-400">暂无归因数据</p>
        ) : (
          <div className="space-y-3 py-2">
            {sorted.map((f, i) => (
              <AttributionBar key={i} factor={f} />
            ))}
          </div>
        )}
      </Card>

      {/* Detail table */}
      <Card title="归因明细">
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-400">暂无数据</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 text-left">
                  <th className="pb-2 pr-4">排名</th>
                  <th className="pb-2 pr-4">因素</th>
                  <th className="pb-2 pr-4">标识</th>
                  <th className="pb-2 text-right">贡献度</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((f, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2 pr-4 text-slate-400 text-xs">{i + 1}</td>
                    <td className="py-2 pr-4 font-medium text-slate-700">
                      {f.label ?? f.factor}
                    </td>
                    <td className="py-2 pr-4 text-slate-400 text-xs font-mono">
                      {f.factor}
                    </td>
                    <td className="py-2 text-right font-semibold text-slate-800">
                      {Math.round(f.contribution * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
