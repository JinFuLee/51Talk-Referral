"use client";

import React from "react";
import { clsx } from "clsx";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import useSWR from "swr";
import { formatRevenue } from "@/lib/utils";

interface ExecutiveSummarySlideProps {
  revealStep: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface KpiCardItem {
  label: string;
  value: string;
  mom?: number; // month-over-month % change
  status: "green" | "yellow" | "red";
  revealIndex: number;
}

function KpiCard({
  label,
  value,
  mom,
  status,
  revealStep,
  revealIndex,
}: KpiCardItem & { revealStep: number }) {
  const visible = revealStep >= revealIndex;

  const statusBg = {
    green: "border-l-green-500 bg-green-50",
    yellow: "border-l-amber-400 bg-amber-50",
    red: "border-l-red-500 bg-red-50",
  }[status];

  const valueColor = {
    green: "text-green-700",
    yellow: "text-amber-700",
    red: "text-red-600",
  }[status];

  const momColor =
    mom === undefined ? "text-slate-400"
    : mom > 0 ? "text-green-600"
    : mom < 0 ? "text-red-500"
    : "text-slate-400";

  const MomIcon =
    mom === undefined ? Minus
    : mom > 0 ? TrendingUp
    : mom < 0 ? TrendingDown
    : Minus;

  return (
    <div
      className={clsx(
        "rounded-2xl border-l-4 p-6 transition-all duration-500",
        statusBg
      )}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <p className="text-sm font-medium text-slate-500 mb-2">{label}</p>
      <p className={clsx("text-5xl font-bold leading-none", valueColor)}>{value}</p>
      {mom !== undefined && (
        <div className={clsx("flex items-center gap-1 mt-3 text-sm", momColor)}>
          <MomIcon className="w-4 h-4" />
          <span>
            {mom > 0 ? "+" : ""}{mom.toFixed(1)}% 环比
          </span>
        </div>
      )}
    </div>
  );
}

export function ExecutiveSummarySlide({ revealStep }: ExecutiveSummarySlideProps) {
  const { data } = useSWR("/api/analysis/summary", fetcher);

  const summary = data?.data ?? {};

  const registrations = summary.registrations?.actual ?? 0;
  const payments = summary.payments?.actual ?? 0;
  const revenue = summary.revenue?.actual ?? 0;
  const checkinRate = summary.checkin_rate?.actual ?? 0;
  const conversionRate = summary.conversion_rate?.actual ?? 0;
  const roi = summary.roi?.actual ?? 0;

  const target = summary.revenue?.target ?? 0;
  const timeProgress = summary.time_progress ?? 0;
  const completionRate = target > 0 ? (revenue / target) * 100 : 0;

  const cards: KpiCardItem[] = [
    {
      label: "注册数 (leads)",
      value: registrations.toLocaleString(),
      mom: summary.registrations?.mom_pct,
      status: (summary.registrations?.gap ?? 0) >= 0 ? "green" : "red",
      revealIndex: 1,
    },
    {
      label: "付费单量",
      value: payments.toLocaleString(),
      mom: summary.payments?.mom_pct,
      status: (summary.payments?.gap ?? 0) >= 0 ? "green" : "red",
      revealIndex: 2,
    },
    {
      label: "转介绍业绩",
      value: formatRevenue(revenue),
      mom: summary.revenue?.mom_pct,
      status: (summary.revenue?.gap ?? 0) >= 0 ? "green" : (summary.revenue?.gap ?? 0) >= -0.05 ? "yellow" : "red",
      revealIndex: 3,
    },
    {
      label: "打卡率",
      value: `${(checkinRate * 100).toFixed(1)}%`,
      mom: summary.checkin_rate?.mom_pct,
      status: (summary.checkin_rate?.gap ?? 0) >= 0 ? "green" : (summary.checkin_rate?.gap ?? 0) >= -0.05 ? "yellow" : "red",
      revealIndex: 4,
    },
    {
      label: "注册→付费转化率",
      value: `${(conversionRate * 100).toFixed(1)}%`,
      mom: summary.conversion_rate?.mom_pct,
      status: (summary.conversion_rate?.gap ?? 0) >= 0 ? "green" : "yellow",
      revealIndex: 5,
    },
    {
      label: "ROI",
      value: `${roi.toFixed(2)}x`,
      mom: summary.roi?.mom_pct,
      status: roi >= 1 ? "green" : "red",
      revealIndex: 6,
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      {/* KPI grid */}
      <div className="grid grid-cols-3 gap-4 flex-1">
        {cards.map((card) => (
          <KpiCard key={card.label} {...card} revealStep={revealStep} />
        ))}
      </div>

      {/* Bottom: time progress + completion */}
      <div
        className="rounded-xl bg-slate-50 border border-slate-200 px-6 py-4"
        style={{
          opacity: revealStep >= 6 ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">月度进度</span>
          <div className="flex gap-6 text-sm">
            <span className="text-slate-500">
              时间进度: <strong className="text-slate-800">{(timeProgress * 100).toFixed(0)}%</strong>
            </span>
            <span className="text-slate-500">
              业绩完成: <strong className={completionRate >= timeProgress * 100 ? "text-green-700" : "text-red-600"}>
                {completionRate.toFixed(0)}%
              </strong>
            </span>
          </div>
        </div>
        <div className="relative w-full bg-slate-200 rounded-full h-3">
          {/* Time progress marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
            style={{ left: `${Math.min(timeProgress * 100, 100)}%` }}
          />
          {/* Completion fill */}
          <div
            className="h-3 rounded-full bg-primary transition-all duration-700"
            style={{ width: `${Math.min(completionRate, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>月初</span>
          <span>月末</span>
        </div>
      </div>
    </div>
  );
}
