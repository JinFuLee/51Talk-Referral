"use client";

import { useDataSources } from "@/lib/hooks";
import { datasourcesAPI } from "@/lib/api";
import { DataSourceGrid } from "@/components/datasources/DataSourceGrid";
import { FileUploadPanel } from "@/components/datasources/FileUploadPanel";
import { Spinner } from "@/components/ui/Spinner";
import { useState } from "react";

export default function DataSourcesPage() {
  const { data: sources, isLoading, mutate } = useDataSources();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await datasourcesAPI.refresh();
      await mutate();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">数据源管理</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {refreshing ? (
            <Spinner size="sm" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          刷新状态
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <DataSourceGrid sources={sources ?? []} showDetail />
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">上传数据文件</h2>
        <FileUploadPanel onSuccess={() => mutate()} />
      </div>
    </div>
  );
}
