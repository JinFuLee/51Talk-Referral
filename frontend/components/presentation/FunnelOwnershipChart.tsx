"use client";

import React from "react";
import { clsx } from "clsx";

interface FunnelStage {
  name: string;
  value: number;
  target: number;
  owner: "ops" | "biz" | "shared";
  gap: number;
}

interface FunnelOwnershipChartProps {
  stages: FunnelStage[];
  revealStep: number;
}

const OWNER_COLORS = {
  ops: {
    bg: "bg-blue-500",
    light: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-700",
    label: "运营",
  },
  biz: {
    bg: "bg-orange-500",
    light: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-700",
    label: "业务",
  },
  shared: {
    bg: "bg-purple-500",
    light: "bg-purple-50",
    border: "border-purple-300",
    text: "text-purple-700",
    label: "共同",
  },
};

// Funnel stages in order (with divider between ops and biz)
const DEFAULT_STAGES: FunnelStage[] = [
  { name: "有效学员", value: 0, target: 0, owner: "ops", gap: 0 },
  { name: "触达率", value: 0, target: 0, owner: "ops", gap: 0 },
  { name: "参与率", value: 0, target: 0, owner: "ops", gap: 0 },
  { name: "注册 (leads)", value: 0, target: 0, owner: "ops", gap: 0 },
  { name: "约课率", value: 0, target: 0, owner: "biz", gap: 0 },
  { name: "出席率", value: 0, target: 0, owner: "biz", gap: 0 },
  { name: "付费转化", value: 0, target: 0, owner: "biz", gap: 0 },
  { name: "续费率", value: 0, target: 0, owner: "shared", gap: 0 },
];

function FunnelBar({
  stage,
  index,
  totalStages,
  visible,
}: {
  stage: FunnelStage;
  index: number;
  totalStages: number;
  visible: boolean;
}) {
  const colors = OWNER_COLORS[stage.owner];
  // Width narrows as funnel goes down: 100% → ~50%
  const maxWidth = 100;
  const minWidth = 50;
  const widthPct = maxWidth - ((maxWidth - minWidth) * index) / (totalStages - 1);
  const gapPct = Math.abs(stage.gap) * 100;
  const isNegativeGap = stage.gap < 0;

  return (
    <div
      className="flex items-center gap-4"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-20px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      {/* Owner badge */}
      <div className="w-12 flex-none flex justify-end">
        <span className={clsx("text-xs font-semibold", colors.text)}>
          {colors.label}
        </span>
      </div>

      {/* Funnel bar - centered trapezoid via margin */}
      <div className="flex-1 flex justify-center">
        <div
          className={clsx(
            "rounded-lg border-2 flex items-center justify-between px-4 py-3",
            colors.light,
            colors.border
          )}
          style={{ width: `${widthPct}%` }}
        >
          <span className="text-sm font-semibold text-slate-700">{stage.name}</span>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold text-slate-900">
              {stage.value.toLocaleString()}
            </span>
            <span className="text-slate-400 text-xs">/ {stage.target.toLocaleString()}</span>
            {stage.gap !== 0 && (
              <span
                className={clsx(
                  "text-xs font-semibold px-1.5 py-0.5 rounded",
                  isNegativeGap ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                )}
              >
                {isNegativeGap ? "-" : "+"}{gapPct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FunnelOwnershipChart({ stages, revealStep }: FunnelOwnershipChartProps) {
  const displayStages = stages.length > 0 ? stages : DEFAULT_STAGES;

  // Find divider position: first "biz" stage
  const bizStartIndex = displayStages.findIndex((s) => s.owner === "biz");

  // Legend
  const legendItems = [
    { key: "ops" as const, label: "← 运营负责" },
    { key: "shared" as const, label: "共同负责" },
    { key: "biz" as const, label: "业务负责 →" },
  ];

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Legend */}
      <div className="flex items-center justify-center gap-6">
        {legendItems.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <div className={clsx("w-3 h-3 rounded-full", OWNER_COLORS[key].bg)} />
            <span className={clsx("font-medium", OWNER_COLORS[key].text)}>{label}</span>
          </div>
        ))}
      </div>

      {/* Funnel stages */}
      <div className="flex flex-col gap-2 flex-1 justify-center">
        {displayStages.map((stage, index) => {
          // Insert divider before first biz stage
          const showDivider = index === bizStartIndex && bizStartIndex > 0;
          return (
            <React.Fragment key={stage.name}>
              {showDivider && (
                <div
                  className="flex items-center gap-3 my-1"
                  style={{
                    opacity: revealStep >= bizStartIndex ? 1 : 0,
                    transition: "opacity 0.4s ease",
                  }}
                >
                  <div className="flex-1 h-px bg-slate-300 border-dashed" />
                  <span className="text-xs text-slate-400 font-medium px-2">
                    ← 运营 | 业务 →
                  </span>
                  <div className="flex-1 h-px bg-slate-300 border-dashed" />
                </div>
              )}
              <FunnelBar
                stage={stage}
                index={index}
                totalStages={displayStages.length}
                visible={revealStep > index}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
