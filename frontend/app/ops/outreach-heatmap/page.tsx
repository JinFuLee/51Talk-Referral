"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/hooks";
import { CCOutreachHeatmap } from "@/components/ops/CCOutreachHeatmap";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

interface HeatmapCell {
  cc_name: string;
  date: string;
  calls: number;
  connects: number;
  effective: number;
  effective_rate: number;
}

interface HeatmapSummary {
  total_calls: number;
  avg_daily: number;
  top_cc: string;
}

interface HeatmapData {
  dates: string[];
  cc_names: string[];
  data: HeatmapCell[];
  summary: HeatmapSummary;
}

export default function CCOutreachHeatmapPage() {
  const { t } = useTranslation();
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/analysis/outreach-heatmap")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: HeatmapData) => {
        setHeatmap(d);
        setError(null);
      })
      .catch((e: Error) => {
        setError(e.message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-none space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-none space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{t("ops.outreach-heatmap.title")}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{t("ops.outreach-heatmap.subtitle")}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {t("ops.outreach-heatmap.label.loadFailed")} {error}
        </div>
      </div>
    );
  }

  const summary = heatmap?.summary ?? { total_calls: 0, avg_daily: 0, top_cc: "" };

  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t("ops.outreach-heatmap.title")}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{t("ops.outreach-heatmap.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">{t("ops.outreach-heatmap.card.monthly")}</div>
          <div className="mt-1 text-2xl font-bold text-blue-700">
            {summary.total_calls.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">{t("ops.outreach-heatmap.card.daily")}</div>
          <div className="mt-1 text-2xl font-bold text-blue-600">
            {summary.avg_daily.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">{t("ops.outreach-heatmap.card.topCC")}</div>
          <div className="mt-1 text-2xl font-bold text-indigo-700 truncate">
            {summary.top_cc || "—"}
          </div>
        </div>
      </div>

      <ErrorBoundary>
        <Card title={t("ops.outreach-heatmap.card.heatmap")}>
          <CCOutreachHeatmap
            dates={heatmap?.dates ?? []}
            cc_names={heatmap?.cc_names ?? []}
            data={heatmap?.data ?? []}
          />
        </Card>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{t("ops.outreach-heatmap.label.colorLegend")}</span>
          <span className="rounded px-2 py-0.5 bg-slate-50 border border-slate-200">0</span>
          <span className="rounded px-2 py-0.5 bg-slate-100">低</span>
          <span className="rounded px-2 py-0.5 bg-blue-100 text-blue-700">中低</span>
          <span className="rounded px-2 py-0.5 bg-blue-300 text-white">中</span>
          <span className="rounded px-2 py-0.5 bg-blue-500 text-white">中高</span>
          <span className="rounded px-2 py-0.5 bg-blue-700 text-white">高</span>
        </div>
      </ErrorBoundary>
    </div>
  );
}
