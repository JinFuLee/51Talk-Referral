"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { AlertTriangle, AlertCircle } from "lucide-react";

interface RiskRadarSlideProps {
  revealStep: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface AnomalyItem {
  metric: string;
  current_value: number | string;
  deviation_pct?: number;
  severity: "critical" | "warning" | "normal";
  suggestion?: string;
  unit?: string;
}

function formatValue(value: number | string, unit?: string): string {
  if (typeof value === "string") return value;
  if (unit === "%") return `${(value * 100).toFixed(1)}%`;
  if (unit === "usd") return `$${value.toLocaleString()}`;
  return value.toLocaleString();
}

function RiskItem({
  item,
  visible,
  delay,
}: {
  item: AnomalyItem;
  visible: boolean;
  delay: number;
}) {
  const isCritical = item.severity === "critical";
  const colors = isCritical
    ? { bg: "bg-red-50", border: "border-red-200", icon: "text-red-500", badge: "bg-red-100 text-red-700" }
    : { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-500", badge: "bg-amber-100 text-amber-700" };

  return (
    <div
      className={clsx("rounded-xl border p-4 transition-all duration-500", colors.bg, colors.border)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-12px)",
        transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
      }}
    >
      <div className="flex items-start gap-3">
        {isCritical ? (
          <AlertCircle className={clsx("w-5 h-5 mt-0.5 shrink-0", colors.icon)} />
        ) : (
          <AlertTriangle className={clsx("w-5 h-5 mt-0.5 shrink-0", colors.icon)} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-base font-semibold text-slate-700">{item.metric}</p>
            {item.deviation_pct !== undefined && (
              <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", colors.badge)}>
                偏离 {item.deviation_pct > 0 ? "+" : ""}
                {item.deviation_pct.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {formatValue(item.current_value, item.unit)}
          </p>
          {item.suggestion && (
            <p className="text-sm text-slate-500 mt-1">{item.suggestion}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function RiskRadarSlide({ revealStep }: RiskRadarSlideProps) {
  const { data: anomalyData, isLoading: anomalyLoading } = useSWR(
    "/api/analysis/anomalies",
    fetcher
  );
  const { data: summaryData, isLoading: summaryLoading } = useSWR(
    "/api/analysis/summary",
    fetcher
  );

  const isLoading = anomalyLoading || summaryLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  // Build anomaly list from API or derive from summary gaps
  const rawAnomalies: AnomalyItem[] = anomalyData?.data ?? anomalyData?.anomalies ?? [];

  // If no anomalies from dedicated endpoint, derive from summary
  let anomalies = rawAnomalies;
  if (anomalies.length === 0 && summaryData?.data) {
    const s = summaryData.data;
    const candidates: AnomalyItem[] = [
      {
        metric: "注册数",
        current_value: s.registrations?.actual ?? 0,
        deviation_pct: s.registrations?.gap != null ? s.registrations.gap * 100 : undefined,
        severity: (s.registrations?.gap ?? 0) < -0.05 ? "critical" : (s.registrations?.gap ?? 0) < 0 ? "warning" : "normal",
        suggestion: "加强 CC 外呼和跟进力度",
      },
      {
        metric: "付费单量",
        current_value: s.payments?.actual ?? 0,
        deviation_pct: s.payments?.gap != null ? s.payments.gap * 100 : undefined,
        severity: (s.payments?.gap ?? 0) < -0.05 ? "critical" : (s.payments?.gap ?? 0) < 0 ? "warning" : "normal",
        suggestion: "提升约课-出席-转化链路",
      },
      {
        metric: "打卡率",
        current_value: s.checkin_rate?.actual ?? 0,
        unit: "%",
        deviation_pct: s.checkin_rate?.gap != null ? s.checkin_rate.gap * 100 : undefined,
        severity: (s.checkin_rate?.gap ?? 0) < -0.05 ? "critical" : (s.checkin_rate?.gap ?? 0) < 0 ? "warning" : "normal",
        suggestion: "增强打卡活动激励",
      },
      {
        metric: "转介绍业绩",
        current_value: s.revenue?.actual ?? 0,
        unit: "usd",
        deviation_pct: s.revenue?.gap != null ? s.revenue.gap * 100 : undefined,
        severity: (s.revenue?.gap ?? 0) < -0.05 ? "critical" : (s.revenue?.gap ?? 0) < 0 ? "warning" : "normal",
        suggestion: "聚焦 CC 新单转介绍渠道",
      },
      {
        metric: "注册→付费转化率",
        current_value: s.conversion_rate?.actual ?? 0,
        unit: "%",
        deviation_pct: s.conversion_rate?.gap != null ? s.conversion_rate.gap * 100 : undefined,
        severity: (s.conversion_rate?.gap ?? 0) < -0.03 ? "critical" : (s.conversion_rate?.gap ?? 0) < 0 ? "warning" : "normal",
        suggestion: "优化试课体验和跟进节奏",
      },
    ];
    anomalies = candidates.filter((a) => a.severity !== "normal");
  }

  const critical = anomalies.filter((a) => a.severity === "critical");
  const warnings = anomalies.filter((a) => a.severity === "warning");

  return (
    <div className="flex h-full gap-6">
      {/* Left: critical */}
      <div
        className="flex-1 flex flex-col gap-3"
        style={{
          opacity: revealStep >= 1 ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <h3 className="text-xl font-bold text-red-600">红色预警</h3>
          <span className="ml-1 text-sm bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
            {critical.length} 项
          </span>
        </div>
        {critical.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-lg rounded-xl border border-dashed border-slate-200">
            暂无红色预警
          </div>
        ) : (
          critical.map((item, i) => (
            <RiskItem
              key={item.metric}
              item={item}
              visible={revealStep >= 1}
              delay={i * 0.1}
            />
          ))
        )}
      </div>

      {/* Right: warnings */}
      <div
        className="flex-1 flex flex-col gap-3"
        style={{
          opacity: revealStep >= 2 ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-xl font-bold text-amber-600">黄色关注</h3>
          <span className="ml-1 text-sm bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            {warnings.length} 项
          </span>
        </div>
        {warnings.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-lg rounded-xl border border-dashed border-slate-200">
            暂无黄色关注
          </div>
        ) : (
          warnings.map((item, i) => (
            <RiskItem
              key={item.metric}
              item={item}
              visible={revealStep >= 2}
              delay={i * 0.1}
            />
          ))
        )}
      </div>
    </div>
  );
}
