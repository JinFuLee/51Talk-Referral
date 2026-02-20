"use client";

import type { DataSourceStatus } from "@/lib/types";

const statusStyle: Record<string, string> = {
  ok: "bg-green-100 text-green-700",
  missing: "bg-red-100 text-red-600",
  outdated: "bg-yellow-100 text-yellow-700",
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
    return <p className="text-xs text-slate-400 py-4 text-center">暂无数据源信息</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {sources.map((src) => (
        <div key={src.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-slate-700 truncate">{src.name_zh}</span>
            <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium ${statusStyle[src.has_file ? (src.is_t1 ? "ok" : "outdated") : "missing"]}`}>
              {statusLabel[src.has_file ? (src.is_t1 ? "ok" : "outdated") : "missing"]}
            </span>
          </div>
          <div className="text-slate-400 space-y-0.5">
            <p>优先级：{src.priority}</p>
            {showDetail && src.latest_date && <p>最新：{src.latest_date}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
