"use client";

import React, { useMemo } from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";

interface CohortSlideProps {
  revealStep: number;
}

interface CohortRow {
  cohort: string; // e.g. "2025-10"
  periods: (number | null)[]; // retention rates per period
}

function getHeatColor(rate: number | null): string {
  if (rate === null || rate === undefined) return "bg-slate-100 text-slate-300";
  if (rate >= 0.8) return "bg-emerald-600 text-white";
  if (rate >= 0.6) return "bg-emerald-400 text-white";
  if (rate >= 0.4) return "bg-lime-300 text-slate-700";
  if (rate >= 0.2) return "bg-amber-300 text-slate-700";
  if (rate >= 0.1) return "bg-orange-400 text-white";
  return "bg-red-500 text-white";
}

export function CohortSlide({ revealStep }: CohortSlideProps) {
  const { data: cohortData, isLoading: cohortLoading } = useSWR(
    "/api/analysis/cohort",
    swrFetcher
  );
  const { data: decayData, isLoading: decayLoading } = useSWR(
    "/api/analysis/cohort-decay",
    swrFetcher
  );

  const isLoading = cohortLoading && decayLoading;

  // Parse cohort rows from either endpoint
  const { rows, maxPeriods } = useMemo(() => {
    const rawCohort = cohortData?.data ?? cohortData ?? {};
    const rawDecay = decayData?.data ?? decayData ?? {};
    let parsedRows: CohortRow[] = [];
    let parsedMax = 6;
    if (rawCohort.rows && Array.isArray(rawCohort.rows)) {
      parsedRows = rawCohort.rows as CohortRow[];
      parsedMax = rawCohort.max_periods ?? 6;
    } else if (rawDecay.cohort_matrix && Array.isArray(rawDecay.cohort_matrix)) {
      parsedRows = rawDecay.cohort_matrix as CohortRow[];
      parsedMax = parsedRows[0]?.periods?.length ?? 6;
    } else if (Array.isArray(rawCohort)) {
      parsedRows = rawCohort as CohortRow[];
    } else if (Array.isArray(rawDecay)) {
      parsedRows = rawDecay as CohortRow[];
    }
    return { rows: parsedRows, maxPeriods: parsedMax };
  }, [cohortData, decayData]);

  // Build period headers
  const periodHeaders = useMemo(
    () => Array.from({ length: maxPeriods }, (_, i) => `M${i}`),
    [maxPeriods]
  );

  // Key insights: average M1 retention, average M3 retention
  const { avgM1, avgM3 } = useMemo(() => {
    const m1Rates = rows.map((r) => r.periods[1] ?? null).filter((v): v is number => v !== null);
    const m3Rates = rows.map((r) => r.periods[3] ?? null).filter((v): v is number => v !== null);
    return {
      avgM1: m1Rates.length > 0 ? m1Rates.reduce((a, b) => a + b, 0) / m1Rates.length : null,
      avgM3: m3Rates.length > 0 ? m3Rates.reduce((a, b) => a + b, 0) / m3Rates.length : null,
    };
  }, [rows]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Heatmap table */}
      <div
        className="flex-1 overflow-auto"
        style={{
          opacity: revealStep >= 1 ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        {rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400 text-lg">
            暂无 Cohort 数据，请先积累历史快照
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-sm font-semibold text-slate-500 pb-3 pr-4 whitespace-nowrap">
                  入组月份
                </th>
                {periodHeaders.map((h) => (
                  <th
                    key={h}
                    className="text-center text-sm font-semibold text-slate-500 pb-3 px-1 min-w-[52px]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={row.cohort}>
                  <td className="pr-4 py-1.5 text-sm font-medium text-slate-600 whitespace-nowrap">
                    {row.cohort}
                  </td>
                  {periodHeaders.map((_, colIdx) => {
                    const rate = row.periods[colIdx] ?? null;
                    const colorClass = getHeatColor(rate);
                    return (
                      <td key={colIdx} className="px-1 py-1.5">
                        <div
                          className={clsx(
                            "rounded-lg text-center py-2 text-sm font-semibold transition-all duration-500",
                            colorClass
                          )}
                          style={{
                            opacity: revealStep >= 1 ? 1 : 0,
                            transitionDelay: `${(rowIdx * periodHeaders.length + colIdx) * 0.01}s`,
                          }}
                        >
                          {rate !== null ? `${(rate * 100).toFixed(0)}%` : "—"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Color legend + insights */}
      <div
        className="rounded-xl bg-slate-50 border border-slate-200 px-6 py-4 flex items-center gap-6 shrink-0"
        style={{
          opacity: revealStep >= 2 ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        {/* Color scale */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 mr-1">留存率</span>
          {[
            { label: "≥80%", cls: "bg-emerald-600" },
            { label: "≥60%", cls: "bg-emerald-400" },
            { label: "≥40%", cls: "bg-lime-300" },
            { label: "≥20%", cls: "bg-amber-300" },
            { label: "≥10%", cls: "bg-orange-400" },
            { label: "<10%", cls: "bg-red-500" },
          ].map(({ label, cls }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={clsx("w-4 h-4 rounded", cls)} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </div>

        {/* Key stats */}
        <div className="border-l border-slate-200 pl-6 flex gap-6">
          {avgM1 !== null && (
            <div>
              <p className="text-xs text-slate-400">平均 M1 留存</p>
              <p className="text-xl font-bold text-indigo-700">{(avgM1 * 100).toFixed(1)}%</p>
            </div>
          )}
          {avgM3 !== null && (
            <div>
              <p className="text-xs text-slate-400">平均 M3 留存</p>
              <p className="text-xl font-bold text-indigo-700">{(avgM3 * 100).toFixed(1)}%</p>
            </div>
          )}
          {rows.length > 0 && (
            <div>
              <p className="text-xs text-slate-400">队列数</p>
              <p className="text-xl font-bold text-slate-700">{rows.length}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
