"use client";

import { useState } from "react";
import useSWR from "swr";
import { swrFetcher, formatRate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EnclosureCCMetrics } from "@/lib/types/enclosure";

const ENCLOSURE_FILTERS = [
  { label: "全部", value: "" },
  { label: "0~30天", value: "0-30" },
  { label: "31~60天", value: "31-60" },
  { label: "61~90天", value: "61-90" },
  { label: "91~180天", value: "91-180" },
  { label: "181天+", value: "181+" },
];

interface EnclosureResponse {
  data: EnclosureCCMetrics[];
}

interface CCRankingItem {
  cc_name: string;
  cc_group: string;
  participation_rate: number;
  cargo_ratio: number;
  registrations: number;
  payments: number;
}

interface CCRankingResponse {
  rankings: CCRankingItem[];
}

function metricColor(value: number, thresholds: [number, number]) {
  if (value >= thresholds[1]) return "text-green-600 font-semibold";
  if (value >= thresholds[0]) return "text-yellow-600";
  return "text-red-500";
}

export default function EnclosurePage() {
  const [filter, setFilter] = useState("");

  const apiUrl = filter ? `/api/enclosure?enclosure=${encodeURIComponent(filter)}` : "/api/enclosure";
  const { data: enclosureData, isLoading: e1 } = useSWR<EnclosureResponse>(apiUrl, swrFetcher);
  const { data: rankingData, isLoading: e2 } = useSWR<CCRankingResponse>("/api/enclosure/ranking", swrFetcher);

  const isLoading = e1 || e2;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const rows = enclosureData?.data ?? [];
  const rankings = rankingData?.rankings ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">围场分析</h1>
        <p className="text-sm text-slate-500 mt-1">围场分段 × CC 矩阵 · 参与率/带新/带货</p>
      </div>

      {/* 围场筛选器 */}
      <div className="flex flex-wrap gap-2">
        {ENCLOSURE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === f.value
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 围场×CC 表格 */}
      <Card title="围场 × CC 矩阵">
        {rows.length === 0 ? (
          <EmptyState title="暂无围场数据" description="上传数据后自动刷新" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3">围场段</th>
                  <th className="py-2 pr-3">CC</th>
                  <th className="py-2 pr-3 text-right">有效学员</th>
                  <th className="py-2 pr-3 text-right">参与率</th>
                  <th className="py-2 pr-3 text-right">带新系数</th>
                  <th className="py-2 pr-3 text-right">带货比</th>
                  <th className="py-2 pr-3 text-right">打卡率</th>
                  <th className="py-2 text-right">注册数</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2 pr-3 text-slate-500">{r.enclosure}</td>
                    <td className="py-2 pr-3 font-medium">{r.cc_name}</td>
                    <td className="py-2 pr-3 text-right">{r.students.toLocaleString()}</td>
                    <td className={`py-2 pr-3 text-right ${metricColor(r.participation_rate, [0.1, 0.2])}`}>
                      {formatRate(r.participation_rate)}
                    </td>
                    <td className="py-2 pr-3 text-right">{r.new_coefficient.toFixed(2)}</td>
                    <td className={`py-2 pr-3 text-right ${metricColor(r.cargo_ratio, [0.05, 0.1])}`}>
                      {formatRate(r.cargo_ratio)}
                    </td>
                    <td className={`py-2 pr-3 text-right ${metricColor(r.checkin_rate, [0.3, 0.5])}`}>
                      {formatRate(r.checkin_rate)}
                    </td>
                    <td className="py-2 text-right">{r.registrations.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CC 排名表格 */}
      <Card title="CC 排名（按参与率）">
        {rankings.length === 0 ? (
          <EmptyState title="暂无排名数据" description="上传数据后自动刷新" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3">排名</th>
                  <th className="py-2 pr-3">CC</th>
                  <th className="py-2 pr-3">组别</th>
                  <th className="py-2 pr-3 text-right">参与率</th>
                  <th className="py-2 pr-3 text-right">带货比</th>
                  <th className="py-2 pr-3 text-right">注册数</th>
                  <th className="py-2 text-right">付费数</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, i) => (
                  <tr key={r.cc_name} className="border-b border-slate-50">
                    <td className="py-2.5 pr-3">
                      <span
                        className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0
                            ? "bg-yellow-100 text-yellow-700"
                            : i === 1
                            ? "bg-slate-100 text-slate-600"
                            : i === 2
                            ? "bg-orange-50 text-orange-600"
                            : "text-slate-400"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-medium">{r.cc_name}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{r.cc_group}</td>
                    <td className={`py-2.5 pr-3 text-right ${metricColor(r.participation_rate, [0.1, 0.2])}`}>
                      {formatRate(r.participation_rate)}
                    </td>
                    <td className="py-2.5 pr-3 text-right">{formatRate(r.cargo_ratio)}</td>
                    <td className="py-2.5 pr-3 text-right">{r.registrations.toLocaleString()}</td>
                    <td className="py-2.5 text-right">{r.payments.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
