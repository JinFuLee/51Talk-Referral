"use client";

import type { DataSourceStatus } from "@/lib/types";

const statusStyle: Record<string, string> = {
  ok: "bg-success/10 text-success",
  missing: "bg-destructive/10 text-destructive",
  outdated: "bg-warning/10 text-warning",
};

const statusLabel: Record<string, string> = {
  ok: "正常",
  missing: "缺失",
  outdated: "过期",
};

interface DataSourceGridProps {
  sources: DataSourceStatus[];
  showDetail?: boolean;
}

export function DataSourceGrid({ sources, showDetail }: DataSourceGridProps) {
  if (sources.length === 0) {
    return <p className="text-xs text-[var(--text-muted)] py-4 text-center">暂无数据源信息</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {sources.map((src) => (
        <div key={src.id} className="rounded-lg border border-slate-200 bg-[var(--bg-surface)] p-3 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-[var(--text-primary)] truncate">{src.name_zh}</span>
            <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium ${statusStyle[src.has_file ? (src.is_fresh ? "ok" : "outdated") : "missing"]}`}>
              {statusLabel[src.has_file ? (src.is_fresh ? "ok" : "outdated") : "missing"]}
            </span>
          </div>
          <div className="text-[var(--text-muted)] space-y-0.5">
            <p>优先级：{src.priority}</p>
            {showDetail && src.latest_date && <p>最新：{src.latest_date}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
