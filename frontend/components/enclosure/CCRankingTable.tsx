"use client";

import { useState } from "react";
import { formatRate } from "@/lib/utils";

interface CCRankingItem {
  cc_name: string;
  cc_group: string;
  students?: number;
  participation_rate: number;
  cargo_ratio: number;
  registrations: number;
  payments: number;
  revenue_usd?: number;
}

type SortKey = keyof Pick<CCRankingItem, "participation_rate" | "cargo_ratio" | "registrations" | "payments">;

interface CCRankingTableProps {
  rankings: CCRankingItem[];
}

const COLUMNS: { key: SortKey; label: string; format: (v: number) => string }[] = [
  { key: "participation_rate", label: "参与率", format: (v) => formatRate(v) },
  { key: "cargo_ratio", label: "带货比", format: (v) => formatRate(v) },
  { key: "registrations", label: "注册数", format: (v) => v.toLocaleString() },
  { key: "payments", label: "付费数", format: (v) => v.toLocaleString() },
];

export function CCRankingTable({ rankings }: CCRankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("participation_rate");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...rankings].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortAsc ? diff : -diff;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  if (rankings.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        暂无 CC 排名数据
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
            <th className="py-2 pr-3 font-medium">排名</th>
            <th className="py-2 pr-3 font-medium">CC 姓名</th>
            <th className="py-2 pr-3 font-medium">组别</th>
            {rankings[0]?.students !== undefined && (
              <th className="py-2 pr-3 text-right font-medium">学员数</th>
            )}
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className="py-2 pr-3 text-right font-medium cursor-pointer hover:text-slate-600 select-none"
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1">{sortAsc ? "↑" : "↓"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.cc_name} className="border-b border-slate-50 hover:bg-slate-50">
              <td className="py-2.5 pr-3">
                <span
                  className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0
                      ? "bg-yellow-100 text-yellow-700"
                      : i === 1
                      ? "bg-slate-100 text-slate-600"
                      : i === 2
                      ? "bg-orange-50 text-orange-600"
                      : "text-slate-400 text-xs"
                  }`}
                >
                  {i + 1}
                </span>
              </td>
              <td className="py-2.5 pr-3 font-medium">{r.cc_name}</td>
              <td className="py-2.5 pr-3 text-slate-500 text-xs">{r.cc_group}</td>
              {r.students !== undefined && (
                <td className="py-2.5 pr-3 text-right tabular-nums">{r.students.toLocaleString()}</td>
              )}
              {COLUMNS.map((col) => (
                <td
                  key={col.key}
                  className={`py-2.5 pr-3 text-right tabular-nums ${
                    sortKey === col.key ? "font-semibold text-blue-600" : ""
                  }`}
                >
                  {col.format(r[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
