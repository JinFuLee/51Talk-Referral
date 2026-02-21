"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { formatRevenue } from "@/lib/utils";

interface TrendSlideProps {
  revealStep: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TrendPoint {
  date: string;
  registrations?: number;
  payments?: number;
  revenue_usd?: number;
}

interface PeakValley {
  peak_date?: string;
  peak_value?: number;
  valley_date?: string;
  valley_value?: number;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: TrendPoint;
  dataKey?: string;
  peakDate?: string;
  valleyDate?: string;
}

function PeakValleyDot({ cx, cy, payload, dataKey, peakDate, valleyDate }: CustomDotProps) {
  if (!cx || !cy || !payload) return null;
  const date = payload.date;
  const isPeak = date === peakDate;
  const isValley = date === valleyDate;

  if (!isPeak && !isValley) return null;

  const color = isPeak ? "#22c55e" : "#ef4444";
  const label = isPeak ? "Peak" : "Low";

  const valueKey = dataKey as keyof TrendPoint;
  const val = payload[valueKey];

  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={2} />
      <text x={cx} y={cy - 10} textAnchor="middle" fill={color} fontSize={10} fontWeight="600">
        {label}
      </text>
      {val != null && (
        <text x={cx} y={cy - 22} textAnchor="middle" fill={color} fontSize={9}>
          {typeof val === "number" && val > 100
            ? `$${(val as number / 1000).toFixed(0)}k`
            : String(val)}
        </text>
      )}
    </g>
  );
}

export function TrendSlide({ revealStep }: TrendSlideProps) {
  const { data: trendData, isLoading: trendLoading } = useSWR(
    "/api/analysis/trend",
    fetcher
  );
  const { data: histData, isLoading: histLoading } = useSWR(
    "/api/snapshots/history",
    fetcher
  );

  const isLoading = trendLoading && histLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  // Combine data from either endpoint
  const points: TrendPoint[] =
    trendData?.data?.daily ?? trendData?.data ?? histData?.data ?? [];

  const peakValley: PeakValley = trendData?.data?.peak_valley ?? {};

  // Compute peak/valley for registrations (primary metric)
  let revPeak: PeakValley = {};
  let regPeak: PeakValley = {};
  if (points.length > 0) {
    let maxReg = -Infinity, minReg = Infinity;
    let maxRegDate = "", minRegDate = "";
    for (const p of points) {
      if ((p.registrations ?? 0) > maxReg) { maxReg = p.registrations ?? 0; maxRegDate = p.date; }
      if ((p.registrations ?? 0) < minReg) { minReg = p.registrations ?? 0; minRegDate = p.date; }
    }
    regPeak = { peak_date: maxRegDate, valley_date: minRegDate };

    let maxRev = -Infinity, minRev = Infinity;
    let maxRevDate = "", minRevDate = "";
    for (const p of points) {
      if ((p.revenue_usd ?? 0) > maxRev) { maxRev = p.revenue_usd ?? 0; maxRevDate = p.date; }
      if ((p.revenue_usd ?? 0) < minRev) { minRev = p.revenue_usd ?? 0; minRevDate = p.date; }
    }
    revPeak = { peak_date: maxRevDate, valley_date: minRevDate };
  }

  // Use peak_valley from API if present
  const finalPeak = peakValley.peak_date ? peakValley : regPeak;

  // Truncate x-axis labels
  const formatDate = (d: string) => {
    if (!d) return "";
    const parts = d.split("-");
    if (parts.length >= 3) return `${parts[1]}/${parts[2]}`;
    return d;
  };

  const showData = revealStep >= 2;
  const showAnnotations = revealStep >= 3;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Chart area */}
      <div
        className="flex-1 min-h-0"
        style={{
          opacity: revealStep >= 1 ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        {points.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400 text-lg">
            暂无趋势数据，请先积累快照数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="count"
                orientation="left"
                tick={{ fontSize: 11 }}
                label={{ value: "人数", angle: -90, position: "insideLeft", fontSize: 11 }}
              />
              <YAxis
                yAxisId="revenue"
                orientation="right"
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "revenue_usd") return [formatRevenue(value), "收入"];
                  if (name === "registrations") return [value.toLocaleString(), "注册数"];
                  if (name === "payments") return [value.toLocaleString(), "付费数"];
                  return [value, name];
                }}
                labelFormatter={(label) => `日期: ${label}`}
              />
              <Legend
                formatter={(v) =>
                  v === "registrations" ? "注册数" : v === "payments" ? "付费数" : "收入"
                }
              />

              {showData && (
                <>
                  <Line
                    yAxisId="count"
                    type="monotone"
                    dataKey="registrations"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={
                      showAnnotations
                        ? (props) => (
                            <PeakValleyDot
                              {...props}
                              dataKey="registrations"
                              peakDate={regPeak.peak_date}
                              valleyDate={regPeak.valley_date}
                            />
                          )
                        : false
                    }
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    yAxisId="count"
                    type="monotone"
                    dataKey="payments"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue_usd"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    strokeDasharray="5 3"
                    dot={
                      showAnnotations
                        ? (props) => (
                            <PeakValleyDot
                              {...props}
                              dataKey="revenue_usd"
                              peakDate={revPeak.peak_date}
                              valleyDate={revPeak.valley_date}
                            />
                          )
                        : false
                    }
                    activeDot={{ r: 5 }}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Peak/Valley legend */}
      <div
        className="rounded-xl bg-slate-50 border border-slate-200 px-6 py-3 flex gap-6 shrink-0 text-sm"
        style={{
          opacity: showAnnotations ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          <span className="text-slate-500">Peak: 历史最高点</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          <span className="text-slate-500">Low: 历史最低点</span>
        </div>
        {finalPeak.peak_date && (
          <div className="text-slate-500">
            注册高峰:{" "}
            <strong className="text-slate-700">{formatDate(finalPeak.peak_date ?? "")}</strong>
          </div>
        )}
        {finalPeak.valley_date && (
          <div className="text-slate-500">
            注册低谷:{" "}
            <strong className="text-slate-700">{formatDate(finalPeak.valley_date ?? "")}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
