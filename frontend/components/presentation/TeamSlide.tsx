"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { swrFetcher } from "@/lib/api";

interface TeamSlideProps {
  revealStep: number;
}

interface CCRankEntry {
  rank: number;
  cc_name: string;
  composite_score: number;
  process_score: number;
  result_score: number;
  efficiency_score: number;
  mom_pct?: number;
}

const MEDAL_COLORS = [
  "bg-amber-400 text-white", // Gold
  "bg-slate-400 text-white", // Silver
  "bg-orange-600 text-white", // Bronze
];

const ROW_HIGHLIGHT = [
  "bg-amber-50 border-l-4 border-l-amber-400",
  "bg-slate-50 border-l-4 border-l-slate-400",
  "bg-orange-50 border-l-4 border-l-orange-500",
];

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-indigo-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-slate-700 w-10 text-right">
        {value.toFixed(0)}
      </span>
    </div>
  );
}

export function TeamSlide({ revealStep }: TeamSlideProps) {
  const { data, isLoading, error } = useSWR("/api/analysis/cc-ranking-enhanced", swrFetcher);

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

  const rawList: CCRankEntry[] = data?.data?.by_cc ?? data?.data ?? data?.by_cc ?? [];
  const top10 = rawList.slice(0, 10);

  // Stats
  const scores = top10.map((r) => r.composite_score);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const maxGap = scores.length >= 2 ? scores[0] - scores[scores.length - 1] : 0;

  // Visible rows based on revealStep
  const visibleCount =
    revealStep >= 2 ? top10.length : revealStep >= 1 ? 3 : 0;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="pb-3 text-left text-sm font-semibold text-slate-500 w-12">排名</th>
              <th className="pb-3 text-left text-sm font-semibold text-slate-500">姓名</th>
              <th className="pb-3 text-right text-sm font-semibold text-slate-500 w-32">综合得分</th>
              <th className="pb-3 text-center text-sm font-semibold text-slate-500 w-24">过程分</th>
              <th className="pb-3 text-center text-sm font-semibold text-slate-500 w-24">结果分</th>
              <th className="pb-3 text-center text-sm font-semibold text-slate-500 w-24">效率分</th>
              <th className="pb-3 text-center text-sm font-semibold text-slate-500 w-20">环比</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((entry, index) => {
              const visible = index < visibleCount;
              const isTop3 = index < 3;
              const rowClass = isTop3 ? ROW_HIGHLIGHT[index] : "";
              const medalClass = isTop3 ? MEDAL_COLORS[index] : "bg-slate-100 text-slate-600";

              const mom = entry.mom_pct;
              const MomIcon =
                mom === undefined ? Minus : mom > 0 ? TrendingUp : mom < 0 ? TrendingDown : Minus;
              const momColor =
                mom === undefined
                  ? "text-slate-400"
                  : mom > 0
                  ? "text-green-600"
                  : "text-red-500";

              return (
                <tr
                  key={entry.cc_name}
                  className={clsx("border-b border-slate-100 transition-all duration-400", rowClass)}
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? "translateY(0)" : "translateY(8px)",
                    transition: `opacity 0.4s ease ${index * 0.05}s, transform 0.4s ease ${index * 0.05}s`,
                  }}
                >
                  <td className="py-3">
                    <span
                      className={clsx(
                        "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold",
                        medalClass
                      )}
                    >
                      {entry.rank}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={clsx(
                        "text-base font-semibold",
                        isTop3 ? "text-slate-800" : "text-slate-700"
                      )}
                    >
                      {entry.cc_name}
                    </span>
                  </td>
                  <td className="py-3 w-36">
                    <ScoreBar value={entry.composite_score} />
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-sm text-slate-600">{entry.process_score.toFixed(0)}</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-sm text-slate-600">{entry.result_score.toFixed(0)}</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-sm text-slate-600">{entry.efficiency_score.toFixed(0)}</span>
                  </td>
                  <td className="py-3 text-center">
                    <div className={clsx("flex items-center justify-center gap-1 text-sm", momColor)}>
                      <MomIcon className="w-3.5 h-3.5" />
                      {mom !== undefined ? `${mom > 0 ? "+" : ""}${mom.toFixed(1)}%` : "—"}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom stats */}
      <div
        className="rounded-xl bg-slate-50 border border-slate-200 px-6 py-4 flex gap-8 shrink-0"
        style={{
          opacity: revealStep >= 3 ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        <div>
          <p className="text-sm text-slate-400">团队均分</p>
          <p className="text-2xl font-bold text-indigo-700">{avgScore.toFixed(1)}</p>
        </div>
        <div className="border-l border-slate-200 pl-8">
          <p className="text-sm text-slate-400">最大差距</p>
          <p className="text-2xl font-bold text-slate-700">{maxGap.toFixed(1)}</p>
        </div>
        <div className="border-l border-slate-200 pl-8">
          <p className="text-sm text-slate-400">参与人数</p>
          <p className="text-2xl font-bold text-slate-700">{rawList.length}</p>
        </div>
      </div>
    </div>
  );
}
