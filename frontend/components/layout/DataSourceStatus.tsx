"use client";

import { DataSourceStatus as DSStatus } from "@/lib/types";

interface DataSourceStatusProps {
  source: DSStatus;
  lang: "zh" | "th";
}

function StatusBadge({ isT1, hasFile }: { isT1: boolean; hasFile: boolean }) {
  if (!hasFile) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
        缺失
      </span>
    );
  }
  if (isT1) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
        T-1
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
      旧
    </span>
  );
}

export function DataSourceStatus({ source, lang }: DataSourceStatusProps) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50">
      <span className="text-xs text-gray-700 truncate flex-1 mr-2">
        {source.name_zh}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <StatusBadge isT1={source.is_t1} hasFile={source.has_file} />
        {source.latest_date && (
          <span className="text-xs text-gray-400">{source.latest_date}</span>
        )}
      </div>
    </div>
  );
}
