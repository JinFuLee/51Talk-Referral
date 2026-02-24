"use client";

import { useMemo, memo } from "react";
import { AlertCircle } from "lucide-react";

export interface EfficiencyMetricProps {
  title: string;
  actualRate: number; // e.g., 0.65 -> 65%
  targetRate: number; // e.g., 0.70 -> 70%
  difference: number; // e.g., -0.05
  impactChain: {
    step: string;
    lossVolume: number;
    rootCause?: string;
  }[];
  isLoading?: boolean;
}

function formatPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function EfficiencyMetricCardInner({
  title,
  actualRate,
  targetRate,
  difference,
  impactChain,
  isLoading,
}: EfficiencyMetricProps) {
  const isPositive = difference >= 0;

  // Calculate scales for waterfall
  const maxLoss = useMemo(() => {
    if (!impactChain || impactChain.length === 0) return 1;
    return Math.max(...impactChain.map((c) => c.lossVolume));
  }, [impactChain]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border p-4 shadow-sm bg-white animate-pulse h-64 flex items-center justify-center">
        <div className="text-sm text-slate-400">Loading efficiency data...</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-5 shadow-sm bg-white hover:shadow-md transition-shadow">
      {/* 顶部：标题和差值色标 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <div
          className={`flex items-center px-2 py-1 rounded-md text-xs font-medium ${
            isPositive
              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
              : "bg-red-50 text-red-600 border border-red-100"
          }`}
        >
          {isPositive ? "▲" : "▼"} {Math.abs(difference * 100).toFixed(1)}% vs 目标
        </div>
      </div>

      {/* 实际率 vs 目标率对比条 */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between items-end text-sm">
          <div>
            <span className="text-2xl font-bold font-mono text-slate-900">
              {formatPct(actualRate)}
            </span>
            <span className="text-xs text-slate-500 ml-2">实际</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-slate-600">
              {formatPct(targetRate)}
            </span>
            <span className="text-xs text-slate-400 ml-1">目标</span>
          </div>
        </div>

        {/* 双线对比条设计 */}
        <div className="relative h-2 bg-slate-100 rounded-full w-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
              isPositive ? "bg-emerald-500" : "bg-indigo-500"
            }`}
            style={{ width: `${Math.min(actualRate * 100, 100)}%`, zIndex: 10 }}
          />
          {/* Target marker layer */}
          <div
            className="absolute top-0 w-1 h-full bg-slate-800 shadow-sm transition-all duration-1000"
            style={{ left: `${Math.min(targetRate * 100, 100)}%`, zIndex: 20 }}
          />
        </div>
      </div>

      {/* 底部：损失链瀑布可视化 + 根因标签 badge */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <h4 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">
          损失链量化分析 (Impact Chain)
        </h4>
        <div className="space-y-3">
          {impactChain.map((item) => {
            const width = Math.max((item.lossVolume / maxLoss) * 100, 5); // min 5% width for visibility
            return (
              <div key={item.step} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium">{item.step}</span>
                  <span className="text-slate-500 font-mono">
                    -{item.lossVolume.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Waterfall Bar */}
                  <div className="flex-1 h-1.5 bg-slate-50 rounded-r-md">
                    <div
                      className="h-full bg-rose-400 rounded-r-md transition-all duration-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  {/* Root Cause Badge */}
                  {item.rootCause && (
                    <div className="shrink-0 flex items-center text-[10px] pl-1 pr-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 max-w-[120px] truncate">
                      <AlertCircle className="w-3 h-3 mr-1 shrink-0" />
                      <span className="truncate">{item.rootCause}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const EfficiencyMetricCard = memo(EfficiencyMetricCardInner);
