"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { formatRevenue } from "@/lib/utils";

interface ImpactAttributionSlideProps {
  revealStep: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

export function ImpactAttributionSlide({ revealStep }: ImpactAttributionSlideProps) {
  const { data } = useSWR("/api/analysis/impact-chain", fetcher);
  const chains: ImpactChainItem[] = [];

  if (data?.data) {
    const rawChains = Array.isArray(data.data) ? data.data : [];
    for (const chain of rawChains) {
      chains.push({
        metric: chain.metric ?? chain.name ?? "—",
        loss_usd: Math.abs(chain.total_loss_usd ?? chain.loss_usd ?? 0),
        side: OPS_METRICS.has(chain.metric_key ?? "") ? "ops" : "biz",
      });
    }
  }

  // Fallback placeholder rows if no data
  const displayChains: ImpactChainItem[] = chains.length > 0 ? chains : [
    { metric: "打卡率缺口", loss_usd: 0, side: "ops" },
    { metric: "参与率缺口", loss_usd: 0, side: "ops" },
    { metric: "触达率缺口", loss_usd: 0, side: "ops" },
    { metric: "约课率缺口", loss_usd: 0, side: "biz" },
    { metric: "出席率缺口", loss_usd: 0, side: "biz" },
    { metric: "付费转化缺口", loss_usd: 0, side: "biz" },
  ];

  const opsTotal = displayChains.filter((c) => c.side === "ops").reduce((s, c) => s + c.loss_usd, 0);
  const bizTotal = displayChains.filter((c) => c.side === "biz").reduce((s, c) => s + c.loss_usd, 0);
  const maxLoss = Math.max(...displayChains.map((c) => c.loss_usd), 1);

  const improvementSuggestions = [
    "运营: 打卡活动频次提升 20% → 估增收 $X",
    "业务: 约课回访 SLA 缩短至 2h → 估增收 $Y",
    "共同: 结合激励政策提升留存率",
  ];

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
        {displayChains.map((item, i) => (
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
          {improvementSuggestions.map((s, i) => (
            <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
              <span className="text-slate-400 flex-none">•</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
