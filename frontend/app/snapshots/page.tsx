"use client";

import { useState } from "react";
import { useSnapshotStats, useDailyKPI, useCCGrowth, useTranslation } from "@/lib/hooks";
import { snapshotsAPI } from "@/lib/api";
import { DailyKPIChart } from "@/components/charts/DailyKPIChart";
import { CCGrowthChart } from "@/components/charts/CCGrowthChart";
import { SnapshotStatsCard } from "@/components/snapshots/SnapshotStatsCard";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import type { SnapshotStats, DailyKPIPoint } from "@/lib/types";

export default function SnapshotsPage() {
  const { t } = useTranslation();
  const { data: stats } = useSnapshotStats();
  const { data: dailyKPI, isLoading: kpiLoading } = useDailyKPI();
  const [ccName, setCCName] = useState("");
  const [ccInput, setCCInput] = useState("");
  const { data: ccGrowth, isLoading: growthLoading } = useCCGrowth(ccName);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  async function handleImport() {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await snapshotsAPI.importHistory();
      setImportResult(JSON.stringify(res.result, null, 2));
    } catch (e: unknown) {
      setImportResult(e instanceof Error ? e.message : "导入失败");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t("snapshots.title")}</h1>
        <button
          onClick={handleImport}
          disabled={importing}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {importing ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : null}
          {t("snapshots.button.import")}
        </button>
      </div>

      {importResult && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1 font-medium">{t("snapshots.label.importResult")}</p>
          <pre className="text-xs text-slate-700 whitespace-pre-wrap">{importResult}</pre>
        </div>
      )}

      <ErrorBoundary>
        <SnapshotStatsCard stats={stats as SnapshotStats | undefined} />

        <Card title={t("snapshots.card.dailyKpi")}>
          {kpiLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : dailyKPI && dailyKPI.length > 0 ? (
            <DailyKPIChart data={dailyKPI as DailyKPIPoint[]} />
          ) : (
            <EmptyState msg={t("snapshots.label.noDailyKpi")} />
          )}
        </Card>

        <Card title={t("snapshots.card.ccGrowth")}>
          <div className="flex gap-2 mb-4">
            <input
              value={ccInput}
              onChange={(e) => setCCInput(e.target.value)}
              placeholder={t("snapshots.input.ccPlaceholder")}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={() => setCCName(ccInput.trim())}
              disabled={!ccInput.trim()}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {t("common.button.search")}
            </button>
          </div>
          {ccName && (
            growthLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : ccGrowth && ccGrowth.length > 0 ? (
              <CCGrowthChart data={ccGrowth} ccName={ccName} />
            ) : (
              <EmptyState msg={`未找到 "${ccName}" 的成长数据`} />
            )
          )}
        </Card>
      </ErrorBoundary>
    </div>
  );
}

function EmptyState({ msg = "暂无数据" }: { msg?: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
      {msg}
    </div>
  );
}
