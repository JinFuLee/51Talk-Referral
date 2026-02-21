"use client";

import React from "react";

type RoleTab = "CC" | "SS" | "LP";

interface RankingTableProps {
  data: Record<string, unknown>[];
  role: RoleTab;
}

function RankingTableBase({ data, role }: RankingTableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
        暂无 {role} 排名数据，请先运行分析
      </div>
    );
  }

  const columns = ["rank", "name", "composite_score", "registrations", "payments", "contact_rate", "checkin_rate"];
  const colLabel: Record<string, string> = {
    rank: "排名",
    name: "姓名",
    composite_score: "综合得分",
    registrations: "注册",
    payments: "付费",
    contact_rate: "触达率",
    checkin_rate: "打卡率",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                  {colLabel[col] ?? col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                {columns.map((col) => {
                  const val = row[col];
                  const formatted =
                    typeof val === "number"
                      ? col.includes("rate")
                        ? `${(val * 100).toFixed(1)}%`
                        : val.toLocaleString()
                      : (val as string) ?? "—";
                  return (
                    <td key={col} className={`px-4 py-3 ${col === "rank" ? "font-bold text-slate-800" : "text-slate-600"}`}>
                      {col === "rank" ? `#${formatted}` : formatted}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const RankingTable = React.memo(RankingTableBase);
