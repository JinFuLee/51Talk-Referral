"use client";

import { useState, useCallback, useRef } from "react";
import { analysisAPI } from "@/lib/api";
import { formatRevenue } from "@/lib/utils";
import type { ImpactChainItem, WhatIfResult } from "@/lib/types";

interface WhatIfSimulatorProps {
  chains: ImpactChainItem[];
}

interface SimulatorRowState {
  value: number;
  result: WhatIfResult | null;
  loading: boolean;
  error: string | null;
}

function SimulatorRow({
  chain,
  state,
  onChange,
}: {
  chain: ImpactChainItem;
  state: SimulatorRowState;
  onChange: (metric: string, newValue: number) => void;
}) {
  const minVal = chain.actual;
  const maxVal = Math.min(1.0, chain.actual + Math.abs(chain.gap) * 3);
  const step = 0.01;

  const displayVal = (v: number) => `${(v * 100).toFixed(1)}%`;

  const deltaPayments = state.result?.delta_payments ?? 0;
  const deltaRevenue = state.result?.delta_revenue_usd ?? 0;
  const isImproved = deltaPayments > 0;

  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">{chain.label}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">
            当前 {displayVal(chain.actual)}
          </span>
          <span className="text-xs text-slate-400">目标 {displayVal(chain.target)}</span>
        </div>
        <span className="text-xs font-mono text-blue-600 min-w-[52px] text-right">
          {displayVal(state.value)}
        </span>
      </div>

      <input
        type="range"
        min={minVal}
        max={maxVal}
        step={step}
        value={state.value}
        onChange={(e) => onChange(chain.metric, parseFloat(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-blue-600"
      />

      <div className="mt-1.5 flex items-center gap-3 text-xs">
        {state.loading && (
          <span className="text-slate-400">计算中...</span>
        )}
        {state.error && (
          <span className="text-red-500">{state.error}</span>
        )}
        {!state.loading && !state.error && state.result && (
          <>
            <span className={`font-medium ${isImproved ? "text-emerald-600" : "text-slate-400"}`}>
              {isImproved ? "+" : ""}{deltaPayments.toFixed(1)} 付费单
            </span>
            <span className={`font-medium ${isImproved ? "text-emerald-600" : "text-slate-400"}`}>
              {isImproved ? "+" : ""}{formatRevenue(deltaRevenue)}
            </span>
            {state.result.message && (
              <span className="text-slate-400">{state.result.message}</span>
            )}
          </>
        )}
        {!state.loading && !state.error && !state.result && (
          <span className="text-slate-300">拖动滑块查看影响</span>
        )}
      </div>
    </div>
  );
}

export function WhatIfSimulator({ chains }: WhatIfSimulatorProps) {
  const [states, setStates] = useState<Record<string, SimulatorRowState>>(() =>
    Object.fromEntries(
      chains.map((c) => [
        c.metric,
        { value: c.actual, result: null, loading: false, error: null },
      ])
    )
  );

  // Debounce timers per metric
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleChange = useCallback(
    (metric: string, newValue: number) => {
      // Update slider value immediately
      setStates((prev) => ({
        ...prev,
        [metric]: { ...prev[metric], value: newValue, loading: true, error: null },
      }));

      // Clear existing timer for this metric
      if (timers.current[metric]) clearTimeout(timers.current[metric]);

      // Debounce API call 300ms
      timers.current[metric] = setTimeout(async () => {
        try {
          const result = await analysisAPI.postWhatIf(metric, newValue);
          setStates((prev) => ({
            ...prev,
            [metric]: { ...prev[metric], result, loading: false, error: null },
          }));
        } catch (err) {
          setStates((prev) => ({
            ...prev,
            [metric]: {
              ...prev[metric],
              loading: false,
              error: err instanceof Error ? err.message : "请求失败",
            },
          }));
        }
      }, 300);
    },
    []
  );

  // Aggregate totals from all results
  const totalDeltaPayments = Object.values(states).reduce(
    (sum, s) => sum + (s.result?.delta_payments ?? 0),
    0
  );
  const totalDeltaRevenue = Object.values(states).reduce(
    (sum, s) => sum + (s.result?.delta_revenue_usd ?? 0),
    0
  );

  const hasAnyResult = Object.values(states).some((s) => s.result !== null);

  return (
    <div>
      <div className="space-y-0">
        {chains.map((chain) => (
          <SimulatorRow
            key={chain.metric}
            chain={chain}
            state={states[chain.metric] ?? { value: chain.actual, result: null, loading: false, error: null }}
            onChange={handleChange}
          />
        ))}
      </div>

      {hasAnyResult && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-emerald-700">全指标组合改善预期</span>
          <div className="flex items-center gap-4 text-sm font-semibold text-emerald-700">
            <span>+{totalDeltaPayments.toFixed(1)} 付费单</span>
            <span>+{formatRevenue(totalDeltaRevenue)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
