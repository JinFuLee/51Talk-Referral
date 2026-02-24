"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { swrFetcher } from "@/lib/api";

interface StageSlideProps {
  revealStep: number;
}

interface StageData {
  current_stage: number; // 1, 2, or 3
  stage_name: string;
  stage_score: number; // 0-100
  dimensions?: Record<string, number>; // radar chart data
  upgrade_suggestions?: string[];
}

const STAGES = [
  { label: "基础启动", description: "结果激励 + 工具能力" },
  { label: "科学运营", description: "公式化 + 多渠道精细化" },
  { label: "系统思维", description: "两大存量经营" },
];

const DEFAULT_DIMENSIONS = [
  { subject: "激励", fullMark: 100, value: 60 },
  { subject: "渠道", fullMark: 100, value: 55 },
  { subject: "数据", fullMark: 100, value: 50 },
  { subject: "过程", fullMark: 100, value: 65 },
  { subject: "存量", fullMark: 100, value: 45 },
  { subject: "用户", fullMark: 100, value: 58 },
];

export function StageSlide({ revealStep }: StageSlideProps) {
  const { data, isLoading, error } = useSWR("/api/analysis/stage-evaluation", swrFetcher);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  const stageData: StageData = data?.data ?? data ?? {
    current_stage: 2,
    stage_name: "科学运营",
    stage_score: 65,
    upgrade_suggestions: [],
  };

  const currentStage = stageData.current_stage ?? 2;
  const stageName = stageData.stage_name ?? STAGES[currentStage - 1]?.label ?? "—";
  const stageScore = stageData.stage_score ?? 65;
  const suggestions: string[] = stageData.upgrade_suggestions ?? [];

  // Build radar data
  const dimMap = stageData.dimensions ?? {};
  const radarData =
    Object.keys(dimMap).length > 0
      ? Object.entries(dimMap).map(([subject, value]) => ({
          subject,
          value: Number(value),
          fullMark: 100,
        }))
      : DEFAULT_DIMENSIONS;

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Stage progress bar */}
      <div
        className="shrink-0"
        style={{
          opacity: revealStep >= 1 ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        <div className="flex gap-4">
          {STAGES.map((stage, index) => {
            const stageNum = index + 1;
            const isActive = stageNum === currentStage;
            const isDone = stageNum < currentStage;

            return (
              <div key={stage.label} className="flex-1 relative">
                {/* Connector line */}
                {index < STAGES.length - 1 && (
                  <div
                    className={clsx(
                      "absolute top-5 left-1/2 right-0 h-0.5 z-0",
                      isDone ? "bg-indigo-400" : "bg-slate-200"
                    )}
                  />
                )}

                <div className="relative z-10 flex flex-col items-center gap-2">
                  {/* Circle */}
                  <div
                    className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2 transition-all duration-500",
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-100"
                        : isDone
                        ? "bg-indigo-400 text-white border-indigo-400"
                        : "bg-white text-slate-400 border-slate-200"
                    )}
                  >
                    {isDone ? "✓" : stageNum}
                  </div>

                  {/* Label */}
                  <div className="text-center">
                    <p
                      className={clsx(
                        "text-base font-semibold",
                        isActive ? "text-indigo-700" : isDone ? "text-indigo-500" : "text-slate-400"
                      )}
                    >
                      {stage.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{stage.description}</p>
                  </div>

                  {/* Progress bar for active stage */}
                  {isActive && (
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
                      <div
                        className="h-2 rounded-full bg-indigo-500 transition-all duration-700"
                        style={{ width: `${stageScore}%` }}
                      />
                    </div>
                  )}
                  {isActive && (
                    <p className="text-xs text-indigo-600 font-medium">{stageScore}% 完成度</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Current stage badge */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-slate-500">当前阶段:</span>
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-full">
            {stageName}
          </span>
        </div>
      </div>

      {/* Radar + suggestions */}
      <div className="flex flex-1 min-h-0 gap-6">
        {/* Radar chart */}
        <div
          className="flex-1"
          style={{
            opacity: revealStep >= 2 ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
        >
          <p className="text-sm font-semibold text-slate-600 mb-2">6 维度评估</p>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 13, fontWeight: 600, fill: "#475569" }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
              />
              <Radar
                name="当前"
                dataKey="value"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip formatter={(v: number) => [`${v}分`, "得分"]} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Upgrade suggestions */}
        <div
          className="w-64 shrink-0 flex flex-col gap-3"
          style={{
            opacity: revealStep >= 3 ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
        >
          <p className="text-sm font-semibold text-slate-600">升级建议</p>
          {suggestions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm rounded-xl border border-dashed border-slate-200">
              暂无建议数据
            </div>
          ) : (
            suggestions.slice(0, 5).map((suggestion, i) => (
              <div
                key={suggestion}
                className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 flex gap-3"
              >
                <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-700 text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700">{suggestion}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
