"use client";

import { memo } from "react";
import { useImpactChain, useRootCause } from "@/lib/hooks";
import { formatRevenue } from "@/lib/utils";
import type { ImpactStep, ImpactChainData, RootCauseData } from "@/lib/types";

// ── Types ──────────────────────────────────────────────────────────────────────

interface LossChainStep {
  label: string;
  value: number;
  unit: string;
}

interface EfficiencyMetricCardProps {
  title: string;
  /** API key used to match impact chain and root cause entries */
  metricKey: string;
  actualRate: number;       // 0~1
  targetRate: number;       // 0~1
  gap: number;              // actualRate - targetRate
  /** Optionally override loss chain from API (e.g. for static/demo usage) */
  lossChain?: LossChainStep[];
  /** Optionally override lost revenue USD */
  lostRevenue?: number;
  /** Optionally override root cause text */
  rootCause?: string;
  rootCauseLevel?: "low" | "medium" | "high";
  variant?: "compact" | "full";
  /**
   * Pre-fetched impact chain data from a parent component.
   * When provided, the component does NOT call useImpactChain() internally.
   * Use this to avoid N redundant subscriptions when rendering multiple cards.
   */
  impactData?: ImpactChainData;
  /**
   * Pre-fetched root cause data from a parent component.
   * When provided, the component does NOT call useRootCause() internally.
   */
  rootCauseData?: RootCauseData;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  const color =
    clamped >= 100
      ? "bg-green-500"
      : clamped >= 80
      ? "bg-yellow-400"
      : "bg-red-500";
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5">
      <div
        className={`h-1.5 rounded-full transition-all ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function RootCauseBadge({
  level,
  text,
}: {
  level: "low" | "medium" | "high";
  text: string;
}) {
  const styles = {
    low: "bg-green-50 text-green-700 border-green-200",
    medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
    high: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div
      className={`text-xs rounded border px-2 py-1 ${styles[level]}`}
    >
      <span className="font-medium">根因：</span>
      {text}
    </div>
  );
}

// ── Helper: resolve root cause level from severity ─────────────────────────────

function severityToLevel(severity: string): "low" | "medium" | "high" {
  if (severity === "red") return "high";
  if (severity === "yellow") return "medium";
  return "low";
}

// ── Helper: derive a simple unit from step key ─────────────────────────────────

function stepUnit(step: string): string {
  if (step.includes("revenue")) return "";
  if (step.includes("payment")) return "笔";
  return "人";
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * Wrapper that fetches impact/root-cause data via hooks when the parent has NOT
 * pre-fetched them. Splitting into two components (with-hooks vs without) is the
 * only React-compliant way to conditionally omit hook calls.
 */
function EfficiencyMetricCardWithHooks(props: EfficiencyMetricCardProps) {
  const { data: impactData } = useImpactChain();
  const { data: rootCauseData } = useRootCause();
  return <EfficiencyMetricCardCore {...props} impactData={impactData} rootCauseData={rootCauseData} />;
}

/**
 * Public export.
 * - Pass `impactData` + `rootCauseData` from the parent to avoid one SWR
 *   subscription per card instance (N cards = N subscriptions → 1).
 * - Omitting those props falls back to per-card hook calls (backward-compatible).
 */
function EfficiencyMetricCardDispatcher(props: EfficiencyMetricCardProps) {
  // If both data props are pre-supplied by the parent, render directly (no extra hooks).
  if (props.impactData !== undefined && props.rootCauseData !== undefined) {
    return <EfficiencyMetricCardCore {...props} />;
  }
  // Otherwise, fetch internally — each card instance will independently subscribe.
  return <EfficiencyMetricCardWithHooks {...props} />;
}

export const EfficiencyMetricCard = memo(EfficiencyMetricCardDispatcher);

function EfficiencyMetricCardCore({
  title,
  metricKey,
  actualRate,
  targetRate,
  gap,
  lossChain: lossChainProp,
  lostRevenue: lostRevenueProp,
  rootCause: rootCauseProp,
  rootCauseLevel: rootCauseLevelProp,
  variant = "full",
  impactData,
  rootCauseData,
}: EfficiencyMetricCardProps) {

  const actualPct = actualRate * 100;
  const targetPct = targetRate * 100;
  const gapPct = parseFloat((gap * 100).toFixed(1));
  const progressRatio = targetRate > 0 ? (actualRate / targetRate) * 100 : 0;
  const isDeficit = gap < 0;

  // ── 1. Resolve loss chain from impact API ──────────────────────────────────
  let resolvedLossChain: LossChainStep[] | undefined = lossChainProp;
  let resolvedLostRevenue: number | undefined = lostRevenueProp;

  if (!resolvedLossChain && impactData) {
    const chainItem = impactData.chains.find((c) => c.metric === metricKey);
    if (chainItem) {
      resolvedLostRevenue = chainItem.lost_revenue_usd;
      resolvedLossChain = chainItem.impact_steps
        .filter((s: ImpactStep) => !s.step.includes("thb"))
        .map((s: ImpactStep) => ({
          label: s.label,
          value: s.value,
          unit: stepUnit(s.step),
        }));
    }
  }

  // ── 2. Resolve root cause from root cause API ──────────────────────────────
  let resolvedRootCause: string | undefined = rootCauseProp;
  let resolvedRootCauseLevel: "low" | "medium" | "high" =
    rootCauseLevelProp ?? "medium";

  if (!resolvedRootCause && rootCauseData) {
    // Match by trigger_metric containing metricKey, or by trigger_label
    const analysis = rootCauseData.analyses.find(
      (a) =>
        a.trigger_metric === metricKey ||
        a.trigger_metric.includes(metricKey) ||
        (a.trigger_label ?? "").toLowerCase().includes(title.toLowerCase())
    );
    if (analysis) {
      resolvedRootCause = analysis.root_cause ?? analysis.why_chain.find((w) => w.is_root)?.answer;
      resolvedRootCauseLevel = severityToLevel(analysis.severity);
    }
  }

  // Fallback root cause text when in deficit but no API result
  if (!resolvedRootCause && isDeficit) {
    resolvedRootCause = "数据分析中，待根因引擎完成归因";
    resolvedRootCauseLevel = "medium";
  }

  // ── Compact variant: condensed 2-line view ─────────────────────────────────
  if (variant === "compact") {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">{title}</span>
          <span
            className={`text-xs font-semibold ${
              gapPct >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {gapPct >= 0 ? `+${gapPct}%` : `${gapPct}%`}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-slate-800">
            {actualPct.toFixed(1)}%
          </span>
          <span className="text-xs text-slate-400">/ 目标 {targetPct.toFixed(1)}%</span>
        </div>
        <ProgressBar pct={progressRatio} />
      </div>
    );
  }

  // ── Full variant ───────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      {/* 1. Header: title + gap badge */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            gapPct >= 0
              ? "bg-green-50 text-green-700"
              : gapPct >= -5
              ? "bg-yellow-50 text-yellow-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {gapPct >= 0 ? `+${gapPct}%` : `${gapPct}%`}
        </span>
      </div>

      {/* 2. Rate comparison: actual vs target */}
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-800">
          {actualPct.toFixed(1)}%
        </span>
        <span className="text-xs text-slate-400">
          / 目标 {targetPct.toFixed(1)}%
        </span>
      </div>

      {/* 3. Progress bar */}
      <ProgressBar pct={progressRatio} />

      {/* 3b. Goal diff row */}
      <div className="flex justify-between text-xs text-slate-500">
        <span>目标差</span>
        <span
          className={
            gapPct >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"
          }
        >
          {gapPct >= 0 ? `+${gapPct}pp` : `${gapPct}pp`}
        </span>
      </div>

      {/* 4. Loss quantification chain — only when in deficit */}
      {isDeficit && resolvedLossChain && resolvedLossChain.length > 0 && (
        <div className="bg-red-50 rounded-lg p-2 space-y-1">
          <p className="text-xs font-semibold text-red-700">损失量化</p>
          <div className="flex flex-wrap items-center gap-1 text-xs text-red-600">
            {resolvedLossChain.map((step, idx) => (
              <span key={step.label} className="flex items-center gap-1">
                {idx > 0 && <span className="text-red-400">→</span>}
                <span>
                  {step.value.toLocaleString()}{step.unit} {step.label}
                </span>
              </span>
            ))}
            {resolvedLostRevenue !== undefined && resolvedLostRevenue > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-red-400">→</span>
                <span className="font-semibold">
                  损失 {formatRevenue(resolvedLostRevenue)}
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* 5. Root cause annotation */}
      {isDeficit && resolvedRootCause && (
        <RootCauseBadge
          level={resolvedRootCauseLevel}
          text={resolvedRootCause}
        />
      )}

      {/* Surplus annotation */}
      {!isDeficit && (
        <p className="text-xs text-green-600 font-medium">
          已达标，持续保持当前运营节奏
        </p>
      )}
    </div>
  );
}
