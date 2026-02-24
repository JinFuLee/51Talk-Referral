"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { formatRevenue } from "@/lib/utils";
import { swrFetcher } from "@/lib/api";

interface WhatIfSlideProps {
  revealStep: number;
}

interface SimParam {
  key: string;
  label: string;
  side: "ops" | "biz";
  min: number;
  max: number;
  step: number;
  unit: string;
  baseRate: number;
  revenuePerUnit: number;
  /** true when revenuePerUnit comes from hardcoded fallback, not real API data */
  isEstimated?: boolean;
}

function SimSlider({
  param,
  value,
  onChange,
  visible,
}: {
  param: SimParam;
  value: number;
  onChange: (v: number) => void;
  visible: boolean;
}) {
  const isOps = param.side === "ops";
  const deltaRate = value / 100;
  const estimatedGain = deltaRate * param.revenuePerUnit;

  return (
    <div
      className={clsx(
        "rounded-xl border-2 p-5 flex flex-col gap-3",
        isOps ? "border-blue-200 bg-blue-50" : "border-orange-200 bg-orange-50"
      )}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{param.label}</span>
        <span
          className={clsx(
            "text-xs font-bold px-2 py-0.5 rounded-full",
            isOps ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
          )}
        >
          +{value}{param.unit}
        </span>
      </div>

      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={clsx("w-full h-2 rounded-full appearance-none cursor-pointer",
          isOps ? "accent-blue-500" : "accent-orange-500"
        )}
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{param.min}{param.unit}</span>
        <span>{param.max}{param.unit}</span>
      </div>

      <div className="text-center mt-1">
        <span className="text-xs text-slate-500">预期增收: </span>
        <span className={clsx("text-lg font-bold", isOps ? "text-blue-700" : "text-orange-700")}>
          {formatRevenue(estimatedGain)}
        </span>
        {param.isEstimated && (
          <span className="ml-1 text-xs text-slate-400">(预估)</span>
        )}
      </div>
    </div>
  );
}

export function WhatIfSlide({ revealStep }: WhatIfSlideProps) {
  const { data } = useSWR<{ data?: Array<{ metric_key?: string; revenue_per_pct?: number }> }>("/api/analysis/impact-chain", swrFetcher);
  const chains = useMemo(
    () => (Array.isArray(data?.data) ? data.data : []),
    [data]
  );

  // Pull per-unit revenue from impact chain data if available.
  // Returns { value, isEstimated: true } when falling back to hardcoded defaults.
  const getRevenuePerUnit = useCallback(
    (metricKey: string, fallback: number): { value: number; isEstimated: boolean } => {
      const chain = chains.find((c: { metric_key?: string }) => c.metric_key === metricKey);
      if (chain?.revenue_per_pct != null) {
        return { value: chain.revenue_per_pct, isEstimated: false };
      }
      return { value: fallback, isEstimated: true };
    },
    [chains]
  );

  const opsParams: SimParam[] = useMemo(
    () => {
      const checkin = getRevenuePerUnit("checkin_rate", 150);
      const participation = getRevenuePerUnit("participation_rate", 200);
      const contact = getRevenuePerUnit("contact_rate", 100);
      return [
        {
          key: "checkin_rate",
          label: "提升打卡率",
          side: "ops",
          min: 0,
          max: 20,
          step: 1,
          unit: "%",
          baseRate: 0,
          revenuePerUnit: checkin.value,
          isEstimated: checkin.isEstimated,
        },
        {
          key: "participation_rate",
          label: "提升参与率",
          side: "ops",
          min: 0,
          max: 20,
          step: 1,
          unit: "%",
          baseRate: 0,
          revenuePerUnit: participation.value,
          isEstimated: participation.isEstimated,
        },
        {
          key: "contact_rate",
          label: "提升触达率",
          side: "ops",
          min: 0,
          max: 20,
          step: 1,
          unit: "%",
          baseRate: 0,
          revenuePerUnit: contact.value,
          isEstimated: contact.isEstimated,
        },
      ];
    },
    [getRevenuePerUnit]
  );

  const bizParams: SimParam[] = useMemo(
    () => {
      const conversion = getRevenuePerUnit("conversion_rate", 300);
      const booking = getRevenuePerUnit("booking_rate", 180);
      return [
        {
          key: "conversion_rate",
          label: "提升付费转化率",
          side: "biz",
          min: 0,
          max: 20,
          step: 1,
          unit: "%",
          baseRate: 0,
          revenuePerUnit: conversion.value,
          isEstimated: conversion.isEstimated,
        },
        {
          key: "booking_rate",
          label: "提升约课率",
          side: "biz",
          min: 0,
          max: 20,
          step: 1,
          unit: "%",
          baseRate: 0,
          revenuePerUnit: booking.value,
          isEstimated: booking.isEstimated,
        },
      ];
    },
    [getRevenuePerUnit]
  );

  const [opsValues, setOpsValues] = useState<number[]>(opsParams.map(() => 5));
  const [bizValues, setBizValues] = useState<number[]>(bizParams.map(() => 5));
  const [projectedRevenue, setProjectedRevenue] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced POST to /api/analysis/what-if
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const adjustments: Record<string, number> = {};
      opsParams.forEach((p, i) => { adjustments[p.key] = opsValues[i]; });
      bizParams.forEach((p, i) => { adjustments[p.key] = bizValues[i]; });

      fetch("/api/analysis/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustments }),
      })
        .then((r) => r.json())
        .then((result) => {
          const rev = result?.data?.projected_revenue ?? result?.projected_revenue;
          if (typeof rev === "number") setProjectedRevenue(rev);
        })
        .catch(() => {
          // Fallback to local calculation on error
          setProjectedRevenue(null);
        });
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opsValues, bizValues]);

  const opsTotalGain = useMemo(
    () => opsParams.reduce((sum, p, i) => sum + (opsValues[i] / 100) * p.revenuePerUnit, 0),
    [opsParams, opsValues]
  );
  const bizTotalGain = useMemo(
    () => bizParams.reduce((sum, p, i) => sum + (bizValues[i] / 100) * p.revenuePerUnit, 0),
    [bizParams, bizValues]
  );
  const localCombinedGain = useMemo(() => opsTotalGain + bizTotalGain, [opsTotalGain, bizTotalGain]);
  const combinedGain = projectedRevenue ?? localCombinedGain;

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Title */}
      <div
        className="text-center"
        style={{ opacity: revealStep >= 0 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
          What-if 模拟
        </p>
        <h2 className="text-3xl font-bold text-slate-800">如果提升 X%，能增收多少？</h2>
      </div>

      {/* Two-column simulator */}
      <div className="grid grid-cols-2 gap-5 flex-1">
        {/* Ops column */}
        <div className="flex flex-col gap-3">
          <div
            className="flex items-center gap-2"
            style={{ opacity: revealStep >= 1 ? 1 : 0, transition: "opacity 0.4s ease" }}
          >
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm font-bold text-blue-700 uppercase tracking-wide">运营提升方案</span>
          </div>
          {opsParams.map((param, i) => (
            <SimSlider
              key={param.key}
              param={param}
              value={opsValues[i]}
              onChange={(v) => setOpsValues((prev) => prev.map((x, j) => (j === i ? v : x)))}
              visible={revealStep >= 1}
            />
          ))}
        </div>

        {/* Biz column */}
        <div className="flex flex-col gap-3">
          <div
            className="flex items-center gap-2"
            style={{ opacity: revealStep >= 2 ? 1 : 0, transition: "opacity 0.4s ease" }}
          >
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-sm font-bold text-orange-700 uppercase tracking-wide">业务提升方案</span>
          </div>
          {bizParams.map((param, i) => (
            <SimSlider
              key={param.key}
              param={param}
              value={bizValues[i]}
              onChange={(v) => setBizValues((prev) => prev.map((x, j) => (j === i ? v : x)))}
              visible={revealStep >= 2}
            />
          ))}
        </div>
      </div>

      {/* Combined effect */}
      <div
        className="rounded-xl bg-gradient-to-r from-blue-50 via-purple-50 to-orange-50 border-2 border-purple-200 px-6 py-4"
        style={{ opacity: revealStep >= 3 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-blue-600 font-semibold">运营单侧</p>
            <p className="text-2xl font-bold text-blue-700">{formatRevenue(opsTotalGain)}</p>
          </div>
          <div>
            <p className="text-xs text-purple-600 font-semibold">双侧组合效果</p>
            <p className="text-3xl font-bold text-purple-700">{formatRevenue(combinedGain)}</p>
          </div>
          <div>
            <p className="text-xs text-orange-600 font-semibold">业务单侧</p>
            <p className="text-2xl font-bold text-orange-700">{formatRevenue(bizTotalGain)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
