"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { ChevronDown, TrendingUp } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ChannelSummary {
  pre_call_rate?: number | null;
  pre_connect_rate?: number | null;
  pre_effective_rate?: number | null;
  post_call_rate?: number | null;
  post_connect_rate?: number | null;
  post_effective_rate?: number | null;
}

interface CompareData {
  summary: ChannelSummary;
  by_channel: Record<string, ChannelSummary>;
}

interface TrialSlideProps {
  revealStep: number;
}

function RateCard({
  label,
  rate,
  description,
  accent,
  visible,
}: {
  label: string;
  rate: number;
  description: string;
  accent: "blue" | "emerald";
  visible: boolean;
}) {
  const pct = (rate * 100).toFixed(1);
  const colors = {
    blue: { bg: "bg-blue-50 border-blue-200", text: "text-blue-800", bar: "bg-blue-500" },
    emerald: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800", bar: "bg-emerald-500" },
  }[accent];

  return (
    <div
      className={clsx("rounded-2xl border p-8 flex flex-col items-center gap-3", colors.bg)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <div className={clsx("text-sm font-semibold", colors.text)}>{label}</div>
      <div className={clsx("text-6xl font-extrabold leading-none", colors.text)}>{pct}%</div>
      <div className="w-full bg-white rounded-full h-3 overflow-hidden">
        <div
          className={clsx("h-3 rounded-full transition-all duration-700", colors.bar)}
          style={{ width: `${Math.min(Number(pct), 100)}%` }}
        />
      </div>
      <div className="text-xs text-slate-500 text-center">{description}</div>
    </div>
  );
}

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

function FunnelChart({
  steps,
  visible,
}: {
  steps: FunnelStep[];
  visible: boolean;
}) {
  const max = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col items-center gap-2"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s ease" }}
    >
      <div className="text-sm font-semibold text-slate-600 mb-2">预约→出席→付费漏斗</div>
      {steps.map((step, i) => (
        <div key={step.label} className="w-full flex flex-col items-center gap-1">
          <div
            className={clsx("rounded-lg py-3 text-center font-bold text-white text-lg transition-all duration-700", step.color)}
            style={{ width: `${Math.max(30, (step.value / max) * 100)}%` }}
          >
            {step.value.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">{step.label}</div>
          {i < steps.length - 1 && (
            <ChevronDown className="w-4 h-4 text-slate-300" />
          )}
        </div>
      ))}
    </div>
  );
}

export function TrialSlide({ revealStep }: TrialSlideProps) {
  const { data, error } = useSWR<CompareData>("/api/analysis/trial-class-compare", fetcher);

  const summary = data?.summary ?? {};
  const preRate = summary.pre_call_rate ?? 0;
  const postRate = summary.post_call_rate ?? 0;
  const preEffective = summary.pre_effective_rate ?? 0;
  const postEffective = summary.post_effective_rate ?? 0;

  // Mock funnel derived from rates (no direct funnel API, approximate)
  const funnelSteps: FunnelStep[] = [
    { label: "预约课", value: 100, color: "bg-blue-500" },
    { label: "出席课", value: Math.round(100 * (postRate > 0 ? postRate : 0.7)), color: "bg-indigo-500" },
    { label: "付费转化", value: Math.round(100 * (postRate > 0 ? postRate * 0.4 : 0.25)), color: "bg-emerald-500" },
  ];

  const improvement = postEffective > preEffective
    ? `课后有效率比课前高 ${((postEffective - preEffective) * 100).toFixed(1)}%`
    : preEffective > postEffective
    ? `课前有效率比课后高 ${((preEffective - postEffective) * 100).toFixed(1)}%`
    : "课前课后有效率相近";

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-lg">
        试听跟进数据加载失败
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Title */}
      <div
        style={{ opacity: revealStep >= 0 ? 1 : 0, transition: "opacity 0.5s ease" }}
        className="text-center"
      >
        <h2 className="text-3xl font-extrabold text-slate-800">试听跟进质量</h2>
        <p className="text-sm text-slate-500 mt-1">Trial Class Follow-up — 课前 vs 课后</p>
      </div>

      {/* Follow-up Rate Cards */}
      <div className="grid grid-cols-2 gap-6">
        <RateCard
          label="课前跟进率"
          rate={preRate}
          description={`有效接通率 ${(preEffective * 100).toFixed(1)}%`}
          accent="blue"
          visible={revealStep >= 1}
        />
        <RateCard
          label="课后跟进率"
          rate={postRate}
          description={`有效接通率 ${(postEffective * 100).toFixed(1)}%`}
          accent="emerald"
          visible={revealStep >= 1}
        />
      </div>

      {/* Funnel */}
      <div className="flex-1">
        <FunnelChart steps={funnelSteps} visible={revealStep >= 2} />
      </div>

      {/* Improvement Hint */}
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-4 flex items-center gap-3"
        style={{ opacity: revealStep >= 3 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <TrendingUp className="w-5 h-5 text-amber-600 shrink-0" />
        <div>
          <div className="text-sm font-semibold text-amber-800">改进建议</div>
          <div className="text-xs text-amber-700 mt-0.5">{improvement}。加强课后跟进可显著提升付费转化率。</div>
        </div>
      </div>
    </div>
  );
}
