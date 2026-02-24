"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";

interface FunnelSlideProps {
  revealStep: number;
}

interface FunnelStage {
  name: string;
  count: number;
  rate: number; // conversion rate from previous stage, 0-1
  gap: number; // gap from target rate
  isBottleneck?: boolean;
}

function getGapColor(gap: number) {
  if (gap >= 0) return "text-green-600 bg-green-50";
  if (gap >= -0.05) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

function getWidthPct(index: number, total: number) {
  // Funnel narrows from 100% to 50% across stages
  return 100 - (index / (total - 1)) * 50;
}

export function FunnelSlide({ revealStep }: FunnelSlideProps) {
  const { data, isLoading, error } = useSWR("/api/analysis/funnel", swrFetcher);

  const raw = data?.data ?? data ?? {};

  // Build funnel stages from API data
  const activeStudents = raw.active_students ?? raw.有效学员 ?? 0;
  const reached = raw.reached ?? raw.触达 ?? Math.round(activeStudents * (raw.contact_rate ?? raw.rates?.contact_rate ?? 0));
  const participated = raw.participated ?? raw.参与 ?? Math.round(activeStudents * (raw.participation_rate ?? raw.rates?.participation_rate ?? 0));
  const registered = raw.registered ?? raw.注册 ?? 0;
  const booked = raw.booked ?? raw.约课 ?? 0;
  const attended = raw.attended ?? raw.出席 ?? 0;
  const paid = raw.paid ?? raw.付费 ?? 0;

  const stages: FunnelStage[] = [
    {
      name: "有效学员",
      count: activeStudents,
      rate: 1,
      gap: 0,
    },
    {
      name: "触达",
      count: reached,
      rate: activeStudents > 0 ? reached / activeStudents : 0,
      gap: (raw.reached_rate_gap ?? 0),
    },
    {
      name: "参与",
      count: participated,
      rate: reached > 0 ? participated / reached : 0,
      gap: (raw.participated_rate_gap ?? 0),
    },
    {
      name: "注册",
      count: registered,
      rate: participated > 0 ? registered / participated : 0,
      gap: (raw.registered_rate_gap ?? 0),
    },
    {
      name: "约课",
      count: booked,
      rate: registered > 0 ? booked / registered : 0,
      gap: (raw.booked_rate_gap ?? 0),
    },
    {
      name: "出席",
      count: attended,
      rate: booked > 0 ? attended / booked : 0,
      gap: (raw.attended_rate_gap ?? 0),
    },
    {
      name: "付费",
      count: paid,
      rate: attended > 0 ? paid / attended : 0,
      gap: (raw.paid_rate_gap ?? 0),
      isBottleneck: true,
    },
  ];

  // Find overall conversion (first to last)
  const overallConversion = activeStudents > 0 ? paid / activeStudents : 0;

  // Find bottleneck (worst gap)
  const bottleneck = stages
    .slice(1)
    .reduce((worst, s) => (s.gap < worst.gap ? s : worst), stages[1]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-lg">
        数据加载失败，请稍后重试
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Funnel stages */}
      <div className="flex-1 flex flex-col justify-center gap-1">
        {stages.map((stage, index) => {
          const visible = revealStep >= index + 1;
          const widthPct = getWidthPct(index, stages.length);
          const gapColorClass = getGapColor(stage.gap);

          return (
            <div
              key={stage.name}
              className="flex items-center gap-4"
              style={{
                opacity: visible ? 1 : 0,
                transition: `opacity 0.4s ease ${index * 0.05}s`,
              }}
            >
              {/* Funnel bar */}
              <div className="flex-1 flex justify-center">
                <div
                  className={clsx(
                    "rounded-lg px-4 py-2 flex items-center justify-between transition-all duration-500",
                    index === 0
                      ? "bg-indigo-600 text-white"
                      : stage.gap < -0.05
                      ? "bg-red-100 border border-red-300"
                      : stage.gap < 0
                      ? "bg-amber-100 border border-amber-300"
                      : "bg-green-100 border border-green-300"
                  )}
                  style={{ width: `${widthPct}%` }}
                >
                  <span
                    className={clsx(
                      "text-base font-semibold",
                      index === 0 ? "text-white" : "text-slate-700"
                    )}
                  >
                    {stage.name}
                  </span>
                  <span
                    className={clsx(
                      "text-xl font-bold ml-4",
                      index === 0 ? "text-white" : "text-slate-800"
                    )}
                  >
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Rate + gap */}
              <div className="w-40 text-right shrink-0">
                {index > 0 && (
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-medium text-slate-600">
                      {(stage.rate * 100).toFixed(1)}%
                    </span>
                    <span
                      className={clsx(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        gapColorClass
                      )}
                    >
                      {stage.gap >= 0 ? "+" : ""}
                      {(stage.gap * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom summary */}
      <div
        className="rounded-xl bg-slate-50 border border-slate-200 px-6 py-4 flex gap-8 shrink-0"
        style={{
          opacity: revealStep >= stages.length + 1 ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        <div>
          <p className="text-sm text-slate-400">整体转化率</p>
          <p className="text-2xl font-bold text-indigo-700">
            {(overallConversion * 100).toFixed(2)}%
          </p>
        </div>
        <div className="border-l border-slate-200 pl-8">
          <p className="text-sm text-slate-400">关键瓶颈</p>
          <p className="text-2xl font-bold text-red-600">
            {bottleneck?.name ?? "—"}
            <span className="text-base font-normal text-red-400 ml-2">
              ({bottleneck ? `${(bottleneck.gap * 100).toFixed(1)}%` : "—"})
            </span>
          </p>
        </div>
        <div className="border-l border-slate-200 pl-8">
          <p className="text-sm text-slate-400">付费人数</p>
          <p className="text-2xl font-bold text-green-700">{paid.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
