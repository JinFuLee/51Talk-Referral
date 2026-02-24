"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";

interface ConversionSlideProps {
  revealStep: number;
}

interface FunnelStep {
  name: string;
  rate: number;
  target: number;
  owner: "ops" | "biz";
  revealIndex: number;
}

const OWNER_COLORS = {
  ops: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
    label: "运营",
  },
  biz: {
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-700",
    label: "业务",
  },
};

function FunnelStepRow({
  step,
  revealStep,
  highlightBottleneck,
}: {
  step: FunnelStep;
  revealStep: number;
  highlightBottleneck: boolean;
}) {
  const ownedReveal = step.owner === "ops" ? 1 : 2;
  const isVisible = revealStep >= ownedReveal;
  const gap = step.rate - step.target;
  const isUnderTarget = gap < 0;
  const colors = OWNER_COLORS[step.owner];
  const showBottleneck = highlightBottleneck && revealStep >= 3 && isUnderTarget;

  return (
    <div
      className={clsx(
        "flex items-center gap-4 rounded-xl border-2 px-5 py-3 transition-all duration-500",
        colors.bg,
        showBottleneck ? "border-red-400 ring-2 ring-red-200" : colors.border
      )}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateX(0)" : "translateX(-16px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      {/* Owner badge */}
      <span className={clsx("text-xs font-bold px-2 py-1 rounded-full flex-none", colors.badge)}>
        {colors.label}
      </span>

      {/* Step name */}
      <span className="flex-1 text-base font-semibold text-slate-800">{step.name}</span>

      {/* Rate */}
      <span className="text-2xl font-bold text-slate-900 w-20 text-right">
        {(step.rate * 100).toFixed(1)}%
      </span>

      {/* Target */}
      <span className="text-sm text-slate-400 w-20 text-right">
        目标 {(step.target * 100).toFixed(1)}%
      </span>

      {/* Gap */}
      <span
        className={clsx(
          "text-sm font-bold px-2 py-1 rounded w-20 text-right",
          isUnderTarget ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
        )}
      >
        {gap >= 0 ? "+" : ""}{(gap * 100).toFixed(1)}%
      </span>

      {/* Bottleneck label */}
      {showBottleneck && (
        <span className="text-xs font-bold bg-red-500 text-white px-2 py-1 rounded-full flex-none">
          瓶颈
        </span>
      )}
    </div>
  );
}

export function ConversionSlide({ revealStep }: ConversionSlideProps) {
  const { data } = useSWR("/api/analysis/funnel", swrFetcher);
  const funnel = data?.data ?? {};

  const steps: FunnelStep[] = [
    {
      name: "触达率",
      rate: funnel.contact_rate?.actual ?? 0,
      target: funnel.contact_rate?.target ?? 0.7,
      owner: "ops",
      revealIndex: 1,
    },
    {
      name: "参与率",
      rate: funnel.participation_rate?.actual ?? 0,
      target: funnel.participation_rate?.target ?? 0.5,
      owner: "ops",
      revealIndex: 1,
    },
    {
      name: "注册转化率",
      rate: funnel.registration_rate?.actual ?? 0,
      target: funnel.registration_rate?.target ?? 0.4,
      owner: "ops",
      revealIndex: 1,
    },
    {
      name: "约课率",
      rate: funnel.booking_rate?.actual ?? 0,
      target: funnel.booking_rate?.target ?? 0.6,
      owner: "biz",
      revealIndex: 2,
    },
    {
      name: "出席率",
      rate: funnel.attendance_rate?.actual ?? 0,
      target: funnel.attendance_rate?.target ?? 0.75,
      owner: "biz",
      revealIndex: 2,
    },
    {
      name: "付费转化率",
      rate: funnel.conversion_rate?.actual ?? 0,
      target: funnel.conversion_rate?.target ?? 0.3,
      owner: "biz",
      revealIndex: 2,
    },
  ];

  const bottleneckStep = steps.reduce(
    (worst, s) => {
      const gap = s.rate - s.target;
      return gap < (worst?.gap ?? 0) ? { ...s, gap } : worst;
    },
    null as (FunnelStep & { gap: number }) | null
  );

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Title */}
      <div
        className="text-center"
        style={{ opacity: revealStep >= 0 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
          责任归属
        </p>
        <h2 className="text-3xl font-bold text-slate-800">转化率责任矩阵</h2>
      </div>

      {/* Legend */}
      <div
        className="flex items-center justify-center gap-6"
        style={{ opacity: revealStep >= 1 ? 1 : 0, transition: "opacity 0.4s ease" }}
      >
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-blue-700 font-medium">← 运营负责</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-orange-700 font-medium">业务负责 →</span>
        </div>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-2 flex-1 justify-center">
        {steps.map((step) => (
          <FunnelStepRow
            key={step.name}
            step={step}
            revealStep={revealStep}
            highlightBottleneck={step.name === bottleneckStep?.name}
          />
        ))}
      </div>

      {/* Bottleneck callout */}
      {bottleneckStep && (
        <div
          className="rounded-xl bg-red-50 border border-red-200 px-6 py-3"
          style={{
            opacity: revealStep >= 3 ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
        >
          <span className="text-sm font-semibold text-red-700">
            当前最大瓶颈: {bottleneckStep.name} 落后 {((bottleneckStep.gap ?? 0) * 100).toFixed(1)}%
            （{OWNER_COLORS[bottleneckStep.owner].label}侧负责）
          </span>
        </div>
      )}
    </div>
  );
}
