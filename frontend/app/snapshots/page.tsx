"use client";

import { useState } from "react";
import { useSnapshotStats, useDailyKPI, useCCGrowth } from "@/lib/hooks";
import { snapshotsAPI } from "@/lib/api";
import { DailyKPIChart } from "@/components/charts/DailyKPIChart";
import { CCGrowthChart } from "@/components/charts/CCGrowthChart";
import { SnapshotStatsCard } from "@/components/snapshots/SnapshotStatsCard";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import type { SnapshotStats, DailyKPIPoint } from "@/lib/types";

export default function SnapshotsPage() {
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
        <h1 className="text-2xl font-bold text-slate-800">历史快照</h1>
        <button
          onClick={handleImport}
          disabled={importing}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {importing ? <Spinner size="sm" /> : null}
          导入历史数据
        </button>
      </div>

      {importResult && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1 font-medium">导入结果</p>
          <pre className="text-xs text-slate-700 whitespace-pre-wrap">{importResult}</pre>
        </div>
      )}

      <SnapshotStatsCard stats={stats as SnapshotStats | undefined} />

      <Card title="日级 KPI 曲线">
        {kpiLoading ? (
          <Spinner />
        ) : dailyKPI && dailyKPI.length > 0 ? (
          <DailyKPIChart data={dailyKPI as DailyKPIPoint[]} />
        ) : (
          <EmptyState msg="暂无日级快照（请先导入历史数据）" />
        )}
      </Card>

      <Card title="CC 成长曲线">
        <div className="flex gap-2 mb-4">
          <input
            value={ccInput}
            onChange={(e) => setCCInput(e.target.value)}
            placeholder="输入 CC 姓名查询"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={() => setCCName(ccInput.trim())}
            disabled={!ccInput.trim()}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            查询
          </button>
        </div>
        {ccName && (
          growthLoading ? (
            <Spinner />
          ) : ccGrowth && ccGrowth.length > 0 ? (
            <CCGrowthChart data={ccGrowth} ccName={ccName} />
          ) : (
            <EmptyState msg={`未找到 "${ccName}" 的成长数据`} />
          )
        )}
      </Card>
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
