"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatRevenue } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";

interface EnhancedProfile {
  name?: string;
  cc_name?: string;
  rank?: number;
  composite_score?: number;
  registrations?: number;
  payments?: number;
  revenue_usd?: number;
  contact_rate?: number;
  reserve_rate?: number;
  attend_rate?: number;
  total_leads?: number;
}

type SortKey = keyof EnhancedProfile;

const MOCK_DATA: EnhancedProfile[] = [
  { name: "王芳", rank: 1, composite_score: 87.3, registrations: 42, payments: 18, revenue_usd: 3240, contact_rate: 0.78, reserve_rate: 0.65, attend_rate: 0.52, total_leads: 56 },
  { name: "李明", rank: 2, composite_score: 81.5, registrations: 38, payments: 15, revenue_usd: 2700, contact_rate: 0.72, reserve_rate: 0.61, attend_rate: 0.48, total_leads: 49 },
  { name: "张伟", rank: 3, composite_score: 76.2, registrations: 31, payments: 12, revenue_usd: 2160, contact_rate: 0.68, reserve_rate: 0.55, attend_rate: 0.43, total_leads: 41 },
  { name: "刘洋", rank: 4, composite_score: 71.8, registrations: 27, payments: 10, revenue_usd: 1800, contact_rate: 0.63, reserve_rate: 0.49, attend_rate: 0.38, total_leads: 35 },
  { name: "陈静", rank: 5, composite_score: 68.4, registrations: 24, payments: 9, revenue_usd: 1620, contact_rate: 0.59, reserve_rate: 0.46, attend_rate: 0.35, total_leads: 31 },
];

const COLUMNS: { key: SortKey; label: string; blue?: boolean; fmt?: (v: EnhancedProfile) => string }[] = [
  { key: "rank", label: "排名" },
  { key: "name", label: "CC 姓名" },
  { key: "composite_score", label: "综合得分" },
  { key: "registrations", label: "注册数" },
  { key: "payments", label: "付费单量" },
  { key: "revenue_usd", label: "收入", fmt: (p) => formatRevenue(p.revenue_usd) },
  { key: "reserve_rate", label: "预约率", blue: true, fmt: (p) => p.reserve_rate !== undefined ? `${(p.reserve_rate * 100).toFixed(1)}%` : "—" },
  { key: "attend_rate", label: "出席率", blue: true, fmt: (p) => p.attend_rate !== undefined ? `${(p.attend_rate * 100).toFixed(1)}%` : "—" },
  { key: "contact_rate", label: "转化率", fmt: (p) => p.contact_rate !== undefined ? `${(p.contact_rate * 100).toFixed(1)}%` : "—" },
];

function getCellValue(p: EnhancedProfile, key: SortKey): string | number {
  const col = COLUMNS.find((c) => c.key === key);
  if (col?.fmt) return col.fmt(p);
  const v = p[key];
  if (v === undefined || v === null) return "—";
  if (key === "rank") return `#${v}`;
  if (key === "composite_score") return (v as number).toFixed(1);
  return v as string | number;
}

export function EnhancedRankingTable() {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  const { data, isLoading, error } = useSWR(
    "cc-ranking-enhanced",
    () =>
      fetch("/api/analysis/cc-ranking-enhanced?top_n=20")
        .then((r) => r.json())
        .catch(() => null),
    { refreshInterval: 60000 }
  );

  // Normalize: backend may return cc_name instead of name
  const isMock = !data?.profiles;
  const rawProfiles: EnhancedProfile[] =
    data?.profiles ?? (error || !isLoading ? MOCK_DATA : []);
  const profiles: EnhancedProfile[] = rawProfiles.map((p) => ({
    ...p,
    name: p.name ?? p.cc_name,
  }));

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false); // default desc for numeric cols
    }
  }

  const sorted = [...profiles].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    if (typeof av === "string" && typeof bv === "string") {
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortAsc
      ? (av as number) - (bv as number)
      : (bv as number) - (av as number);
  });

  const maxScore = Math.max(...profiles.map((p) => p.composite_score ?? 0), 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      {isMock && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded text-xs mb-2">
          ⚠ 当前显示模拟数据（API 数据不可用）
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`px-4 py-3 text-left text-xs font-semibold whitespace-nowrap cursor-pointer select-none transition-colors hover:bg-slate-100 ${
                  col.blue ? "text-blue-600" : "text-slate-500"
                } ${sortKey === col.key ? "bg-slate-100" : ""}`}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1 text-slate-400">{sortAsc ? "↑" : "↓"}</span>
                )}
                {col.blue && <span className="ml-1 text-blue-400 text-[10px]">NEW</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-slate-400 text-xs">
                暂无排名数据，请先运行分析
              </td>
            </tr>
          ) : (
            sorted.map((p, i) => {
              const score = p.composite_score ?? 0;
              const pct = Math.round((score / maxScore) * 100);
              return (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  {COLUMNS.map((col) => {
                    const isScore = col.key === "composite_score";
                    const isBlue = col.blue;
                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3 whitespace-nowrap ${
                          isBlue ? "text-blue-700 font-medium" : "text-slate-700"
                        }`}
                      >
                        {isScore ? (
                          <div className="flex items-center gap-2">
                            <div className="relative w-20 h-4 bg-slate-100 rounded overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 bg-blue-400 rounded"
                                style={{ width: `${pct}%` }}
                              />
                              <span className="relative text-[10px] font-semibold text-slate-700 pl-1 leading-4">
                                {score.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          getCellValue(p, col.key)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
