"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { formatRevenue } from "@/lib/utils";

interface SharedMetricsSlideProps {
  revealStep: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MetricCardProps {
  label: string;
  value: string;
  target: string;
  gap: number;
  revealIndex: number;
  revealStep: number;
}

function MetricCard({ label, value, target, gap, revealIndex, revealStep }: MetricCardProps) {
  const visible = revealStep >= revealIndex;
  const isPositive = gap >= 0;

  return (
    <div
      className="rounded-2xl bg-white border-2 border-purple-200 p-8 flex flex-col gap-3 shadow-md"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <p className="text-base font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-5xl font-bold text-purple-700 leading-none">{value}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm text-slate-400">目标: <span className="font-medium text-slate-600">{target}</span></span>
        <span
          className={clsx(
            "text-sm font-bold px-3 py-1 rounded-full",
            isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
          )}
        >
          {isPositive ? "+" : ""}{typeof gap === "number" && !isNaN(gap) ? gap.toFixed(1) : "—"}%
        </span>
      </div>
    </div>
  );
}

export function SharedMetricsSlide({ revealStep }: SharedMetricsSlideProps) {
  const { data } = useSWR("/api/analysis/summary", fetcher);
  const summary = data?.data ?? {};

  const registrations = summary.registrations?.actual ?? 0;
  const payments = summary.payments?.actual ?? 0;
  const conversionRate = summary.conversion_rate?.actual ?? 0;
  const avgOrderValue = summary.avg_order_value?.actual ?? 0;

  const regTarget = summary.registrations?.target ?? 0;
  const payTarget = summary.payments?.target ?? 0;
  const convTarget = summary.conversion_rate?.target ?? 0;
  const aovTarget = summary.avg_order_value?.target ?? 0;

  const regGap = regTarget > 0 ? ((registrations - regTarget) / regTarget) * 100 : 0;
  const payGap = payTarget > 0 ? ((payments - payTarget) / payTarget) * 100 : 0;
  const convGap = convTarget > 0 ? ((conversionRate - convTarget) / convTarget) * 100 : 0;
  const aovGap = aovTarget > 0 ? ((avgOrderValue - aovTarget) / aovTarget) * 100 : 0;

  const cards: Omit<MetricCardProps, "revealStep">[] = [
    {
      label: "注册数 (Leads)",
      value: registrations.toLocaleString(),
      target: regTarget.toLocaleString(),
      gap: regGap,
      revealIndex: 1,
    },
    {
      label: "付费单量",
      value: payments.toLocaleString(),
      target: payTarget.toLocaleString(),
      gap: payGap,
      revealIndex: 2,
    },
    {
      label: "注册→付费转化率",
      value: `${(conversionRate * 100).toFixed(1)}%`,
      target: `${(convTarget * 100).toFixed(1)}%`,
      gap: convGap,
      revealIndex: 3,
    },
    {
      label: "客单价 (USD)",
      value: formatRevenue(avgOrderValue),
      target: formatRevenue(aovTarget),
      gap: aovGap,
      revealIndex: 4,
    },
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      <div
        className="text-center"
        style={{ opacity: revealStep >= 0 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <p className="text-sm font-semibold text-purple-500 uppercase tracking-widest mb-1">
          双方共识基准
        </p>
        <h2 className="text-3xl font-bold text-slate-800">共享 KPI 总览</h2>
      </div>

      <div className="grid grid-cols-2 gap-5 flex-1">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} revealStep={revealStep} />
        ))}
      </div>
    </div>
  );
}
