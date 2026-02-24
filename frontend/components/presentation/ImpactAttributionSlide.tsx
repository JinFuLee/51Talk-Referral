"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { formatRevenue } from "@/lib/utils";
import { swrFetcher } from "@/lib/api";

interface ImpactAttributionSlideProps {
  revealStep: number;
}

interface ImpactChainItem {
  metric: string;
  loss_usd: number;
  side: "ops" | "biz";
}

const OPS_METRICS = new Set(["checkin_rate", "participation_rate", "contact_rate"]);

function StackedBar({
  opsLoss,
  bizLoss,
  visible,
}: {
  opsLoss: number;
  bizLoss: number;
  visible: boolean;
}) {
  const total = opsLoss + bizLoss;
  const opsPct = total > 0 ? (opsLoss / total) * 100 : 50;
  const bizPct = total > 0 ? (bizLoss / total) * 100 : 50;

  return (
    <div
      className="flex h-12 rounded-xl overflow-hidden w-full shadow-sm"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s ease" }}
    >
      <div
        className="bg-blue-500 flex items-center justify-center text-white text-sm font-bold transition-all duration-700"
        style={{ width: `${opsPct}%` }}
      >
        {opsPct.toFixed(0)}%
      </div>
      <div
        className="bg-orange-500 flex items-center justify-center text-white text-sm font-bold transition-all duration-700"
        style={{ width: `${bizPct}%` }}
      >
        {bizPct.toFixed(0)}%
      </div>
    </div>
  );
}

interface AttributionRowProps {
  item: ImpactChainItem;
  maxLoss: number;
  visible: boolean;
}

function AttributionRow({ item, maxLoss, visible }: AttributionRowProps) {
  const isOps = item.side === "ops";
  const barWidth = maxLoss > 0 ? Math.max((item.loss_usd / maxLoss) * 100, 4) : 4;

  return (
    <div
      className="flex items-center gap-4"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-12px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      <span
        className={clsx(
          "text-xs font-bold px-2 py-1 rounded-full flex-none w-12 text-center",
          isOps ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
        )}
      >
        {isOps ? "运营" : "业务"}
      </span>
      <span className="text-sm text-slate-700 w-32 flex-none">{item.metric}</span>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 bg-slate-100 rounded-full h-6">
          <div
            className={clsx("h-6 rounded-full transition-all duration-700", isOps ? "bg-blue-400" : "bg-orange-400")}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <span className="text-sm font-bold text-slate-800 w-28 text-right flex-none">
          {formatRevenue(item.loss_usd)}
        </span>
      </div>
    </div>
  );
}

interface ImpactChainApiResponse {
  chains: Array<{
    metric: string;
    label: string;
    actual: number;
    target: number;
    gap: number;
    lost_revenue_usd: number;
    lost_payments: number;
  }>;
  total_lost_revenue_usd: number;
  total_lost_revenue_thb: number;
  top_lever?: string;
  top_lever_label?: string;
}

export function ImpactAttributionSlide({ revealStep }: ImpactAttributionSlideProps) {
  const { data, error } = useSWR<ImpactChainApiResponse>("/api/analysis/impact-chain", swrFetcher);
  const chains: ImpactChainItem[] = [];

  if (data?.chains) {
    // API returns chains[] at top level (not wrapped in .data)
    // chain.metric is the metric key; chain.label is the display name
    for (const chain of data.chains) {
      chains.push({
        metric: chain.label ?? chain.metric ?? "—",
        loss_usd: Math.abs(chain.lost_revenue_usd ?? 0),
        side: OPS_METRICS.has(chain.metric ?? "") ? "ops" : "biz",
      });
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-rose-500 text-sm">
        影响链数据加载失败
      </div>
    );
  }

  // Show empty state if no chains (all metrics at or above target — no losses)
  const displayChains: ImpactChainItem[] = chains;

  const opsTotal = displayChains.filter((c) => c.side === "ops").reduce((s, c) => s + c.loss_usd, 0);
  const bizTotal = displayChains.filter((c) => c.side === "biz").reduce((s, c) => s + c.loss_usd, 0);
  const maxLoss = Math.max(...displayChains.map((c) => c.loss_usd), 1);

  const topLever = data?.top_lever_label;
  const totalLostUsd = data?.total_lost_revenue_usd ?? 0;
  const improvementSuggestions = [
    topLever ? `首要杠杆: ${topLever}缺口，预计损失最大` : null,
    totalLostUsd > 0 ? `本月效率缺口合计损失 $${totalLostUsd.toLocaleString()}` : null,
    "建议结合具体 CC 外呼数据制定精细化改善方案",
  ].filter((s): s is string => s !== null);

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Title */}
      <div
        className="text-center"
        style={{ opacity: revealStep >= 0 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
          损失归因
        </p>
        <h2 className="text-3xl font-bold text-slate-800">效率缺口 — 收入损失归属</h2>
      </div>

      {/* Attribution chart */}
      <div
        className="flex flex-col gap-2 flex-1"
        style={{ opacity: revealStep >= 1 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        {displayChains.map((item) => (
          <AttributionRow
            key={item.metric}
            item={item}
            maxLoss={maxLoss}
            visible={revealStep >= 1}
          />
        ))}
      </div>

      {/* Stacked summary bar */}
      <div
        style={{ opacity: revealStep >= 2 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-blue-700 font-medium">运营可控损失: {formatRevenue(opsTotal)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-orange-700 font-medium">业务可控损失: {formatRevenue(bizTotal)}</span>
            <div className="w-3 h-3 rounded-full bg-orange-500" />
          </div>
        </div>
        <StackedBar opsLoss={opsTotal} bizLoss={bizTotal} visible={revealStep >= 2} />
      </div>

      {/* Improvement suggestions */}
      <div
        className="rounded-xl bg-slate-50 border border-slate-200 px-5 py-4"
        style={{ opacity: revealStep >= 3 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <p className="text-sm font-semibold text-slate-600 mb-2">改善方案</p>
        <ul className="space-y-1">
          {improvementSuggestions.map((s) => (
            <li key={s} className="text-sm text-slate-600 flex items-start gap-2">
              <span className="text-slate-400 flex-none">•</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
