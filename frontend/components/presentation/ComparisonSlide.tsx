"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { formatRevenue } from "@/lib/utils";
import { swrFetcher } from "@/lib/api";

interface ComparisonSlideProps {
  revealStep: number;
}

interface KpiComparison {
  label: string;
  prevValue: string;
  currValue: string;
  change: number; // absolute change (positive = up)
  changePct: number; // % change
  unit: "number" | "percent" | "usd";
  revealIndex: number;
}

function formatVal(value: number, unit: "number" | "percent" | "usd"): string {
  if (unit === "usd") return formatRevenue(value);
  if (unit === "percent") return `${(value * 100).toFixed(1)}%`;
  return value.toLocaleString();
}

function ComparisonRow({
  item,
  visible,
}: {
  item: KpiComparison;
  visible: boolean;
}) {
  const isUp = item.changePct > 0;
  const isFlat = Math.abs(item.changePct) < 0.1;

  const ChangeIcon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const changeColor = isFlat
    ? "text-slate-400"
    : isUp
    ? "text-green-600"
    : "text-red-500";
  const changeBg = isFlat
    ? "bg-slate-50 border-slate-200"
    : isUp
    ? "bg-green-50 border-green-200"
    : "bg-red-50 border-red-200";

  return (
    <div
      className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-16px)",
        transition: `opacity 0.4s ease, transform 0.4s ease`,
      }}
    >
      {/* Label */}
      <div className="w-36 shrink-0">
        <p className="text-lg font-semibold text-slate-700">{item.label}</p>
      </div>

      {/* Previous value */}
      <div className="flex-1 text-center">
        <p className="text-sm text-slate-400 mb-0.5">上期</p>
        <p className="text-2xl font-bold text-slate-500">{item.prevValue}</p>
      </div>

      {/* Arrow + change */}
      <div
        className={clsx(
          "flex flex-col items-center px-4 py-2 rounded-xl border min-w-[100px]",
          changeBg
        )}
      >
        <div className={clsx("flex items-center gap-1", changeColor)}>
          <ChangeIcon className="w-5 h-5" />
          <span className="text-lg font-bold">
            {isFlat
              ? "持平"
              : `${isUp ? "+" : ""}${item.changePct.toFixed(1)}%`}
          </span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300 mt-1" />
      </div>

      {/* Current value */}
      <div className="flex-1 text-center">
        <p className="text-sm text-slate-400 mb-0.5">本期</p>
        <p
          className={clsx(
            "text-2xl font-bold",
            isFlat ? "text-slate-700" : isUp ? "text-green-700" : "text-red-600"
          )}
        >
          {item.currValue}
        </p>
      </div>
    </div>
  );
}

export function ComparisonSlide({ revealStep }: ComparisonSlideProps) {
  const { data, isLoading, error } = useSWR("/api/analysis/summary", swrFetcher);

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

  const s = data?.data ?? {};

  // Build comparison rows from MoM data
  const rows: KpiComparison[] = [
    {
      label: "注册数",
      prevValue: ((s.registrations?.actual ?? 0) / (1 + (s.registrations?.mom_pct ?? 0) / 100)).toFixed(0),
      currValue: (s.registrations?.actual ?? 0).toLocaleString(),
      change: (s.registrations?.actual ?? 0) - (s.registrations?.actual ?? 0) / (1 + (s.registrations?.mom_pct ?? 0) / 100),
      changePct: s.registrations?.mom_pct ?? 0,
      unit: "number",
      revealIndex: 1,
    },
    {
      label: "付费数",
      prevValue: ((s.payments?.actual ?? 0) / (1 + (s.payments?.mom_pct ?? 0) / 100)).toFixed(0),
      currValue: (s.payments?.actual ?? 0).toLocaleString(),
      change: 0,
      changePct: s.payments?.mom_pct ?? 0,
      unit: "number",
      revealIndex: 2,
    },
    {
      label: "转介绍业绩",
      prevValue: formatRevenue((s.revenue?.actual ?? 0) / (1 + (s.revenue?.mom_pct ?? 0) / 100)),
      currValue: formatRevenue(s.revenue?.actual ?? 0),
      change: 0,
      changePct: s.revenue?.mom_pct ?? 0,
      unit: "usd",
      revealIndex: 3,
    },
    {
      label: "打卡率",
      prevValue: formatVal((s.checkin_rate?.actual ?? 0) / (1 + (s.checkin_rate?.mom_pct ?? 0) / 100), "percent"),
      currValue: formatVal(s.checkin_rate?.actual ?? 0, "percent"),
      change: 0,
      changePct: s.checkin_rate?.mom_pct ?? 0,
      unit: "percent",
      revealIndex: 4,
    },
    {
      label: "注册→付费转化",
      prevValue: formatVal((s.conversion_rate?.actual ?? 0) / (1 + (s.conversion_rate?.mom_pct ?? 0) / 100), "percent"),
      currValue: formatVal(s.conversion_rate?.actual ?? 0, "percent"),
      change: 0,
      changePct: s.conversion_rate?.mom_pct ?? 0,
      unit: "percent",
      revealIndex: 5,
    },
  ];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header labels */}
      <div
        className="flex items-center gap-4 pb-2 border-b border-slate-200 shrink-0"
        style={{
          opacity: revealStep >= 1 ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        <div className="w-36 shrink-0" />
        <div className="flex-1 text-center">
          <p className="text-base font-semibold text-slate-400">上月</p>
        </div>
        <div className="min-w-[100px] text-center">
          <p className="text-base font-semibold text-slate-400">变化</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-base font-semibold text-slate-700">本月</p>
        </div>
      </div>

      {/* Comparison rows */}
      <div className="flex-1 flex flex-col justify-center">
        {rows.map((row) => (
          <ComparisonRow
            key={row.label}
            item={row}
            visible={revealStep >= row.revealIndex}
          />
        ))}
      </div>

      {/* YoY note */}
      <div
        className="rounded-xl bg-slate-50 border border-slate-200 px-6 py-3 flex gap-6 shrink-0"
        style={{
          opacity: revealStep >= 6 ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        <p className="text-sm text-slate-500">
          同比数据:{" "}
          {s.revenue?.yoy_pct !== undefined ? (
            <strong
              className={s.revenue.yoy_pct >= 0 ? "text-green-600" : "text-red-500"}
            >
              业绩 {s.revenue.yoy_pct > 0 ? "+" : ""}
              {s.revenue.yoy_pct.toFixed(1)}%
            </strong>
          ) : (
            <span className="text-slate-400">暂无同比数据（需 ≥2 个月历史快照）</span>
          )}
        </p>
      </div>
    </div>
  );
}
