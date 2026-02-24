"use client";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { swrFetcher } from "@/lib/api";
import useSWR from "swr";
import type { DetailResponse } from "@/lib/types/cohort";





function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export default function CohortDetailTab() {
  const { data, isLoading, error } = useSWR<DetailResponse>(
    `/api/analysis/cohort-detail`,
    swrFetcher
  );

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (error || !data) {
    return <p className="text-sm text-red-500 py-8 text-center">数据加载失败</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">
          共 {data.total_students.toLocaleString()} 条学员级记录 (C6)
        </span>
        <DataSourceBadge source={data.data_source} />
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">月龄留存率 + 流失漏斗</h3>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-3 py-1.5 text-slate-500 font-medium">月龄</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">有效留存率</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">触达率</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">带新率</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">当月新流失</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">累计流失率</th>
              </tr>
            </thead>
            <tbody>
              {data.retention_by_age.map((row) => {
                const churn = data.churn_by_age.find((c) => c.m === row.m);
                const isHighChurn = (churn?.first_churn_rate ?? 0) >= 0.07;
                return (
                  <tr
                    key={row.m}
                    className={`border-b border-slate-50 hover:bg-slate-50 ${
                      isHighChurn ? "bg-red-50/30" : ""
                    }`}
                  >
                    <td className="px-3 py-1.5 font-medium text-slate-700">M{row.m}</td>
                    <td className="px-3 py-1.5 text-center">
                      <span
                        className={`font-medium ${
                          row.valid_rate >= 0.7
                            ? "text-emerald-600"
                            : row.valid_rate >= 0.5
                            ? "text-amber-600"
                            : "text-red-500"
                        }`}
                      >
                        {pct(row.valid_rate)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-center text-slate-600">{pct(row.reach_rate)}</td>
                    <td className="px-3 py-1.5 text-center text-slate-600">{pct(row.bring_new_rate)}</td>
                    <td className="px-3 py-1.5 text-center">
                      {churn ? (
                        <span className={isHighChurn ? "text-red-500 font-medium" : "text-slate-500"}>
                          {churn.first_churn_count} ({pct(churn.first_churn_rate)})
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-center text-slate-500">
                      {churn ? pct(churn.cumulative_churn_rate) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-red-400 mt-2 px-3">红色行 = 高流失月龄，建议在此月龄前加强干预</p>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">CC 真实带新效率排行（C6 学员级）</h3>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-3 py-1.5 text-slate-500 font-medium w-6">#</th>
                <th className="text-left px-3 py-1.5 text-slate-500 font-medium">CC</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">团队</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">学员数</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">有效率</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">触达率</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">带新率</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">带新总数</th>
              </tr>
            </thead>
            <tbody>
              {data.by_cc.map((cc, idx) => (
                <tr key={cc.cc} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-3 py-1.5 text-slate-400">{idx + 1}</td>
                  <td className="px-3 py-1.5 font-medium text-slate-700">{cc.cc}</td>
                  <td className="px-3 py-1.5 text-center text-slate-500">{cc.team}</td>
                  <td className="px-3 py-1.5 text-center text-slate-600">{cc.students}</td>
                  <td className="px-3 py-1.5 text-center text-slate-600">{pct(cc.valid_rate)}</td>
                  <td className="px-3 py-1.5 text-center text-slate-600">{pct(cc.reach_rate)}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span
                      className={`font-medium ${
                        cc.bring_new_rate >= 0.25
                          ? "text-emerald-600"
                          : cc.bring_new_rate >= 0.18
                          ? "text-amber-600"
                          : "text-red-500"
                      }`}
                    >
                      {pct(cc.bring_new_rate)}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-center font-medium text-indigo-600">
                    {cc.bring_new_total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">带新主力学员 Top 5</h3>
        <div className="space-y-2">
          {data.top_bringers.map((s, idx) => (
            <div
              key={s.student_id}
              className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-slate-50"
            >
              <span className="text-xs font-bold text-indigo-400 w-4">#{idx + 1}</span>
              <span className="text-xs font-mono text-slate-500 w-16">{s.student_id}</span>
              <span className="text-xs text-slate-400">{s.team}</span>
              <span className="text-xs text-slate-400">入组: {s.cohort}</span>
              <span className="text-xs text-slate-400">最后活跃: M{s.last_active_m}</span>
              <span className="ml-auto text-xs font-semibold text-emerald-600">
                +{s.total_new} 新注册
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
