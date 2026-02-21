"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

// ── Types ───────────────────────────────────────────────────────────────────

interface ZeroStudent {
  student_id?: string;
  cc_name?: string;
  team?: string;
  first_paid_date?: string;
  enclosure_segment: string;
  days_since_paid?: number | null;
  monthly_called?: number;
  monthly_connected?: number;
  monthly_effective?: number;
}

interface CCEntry {
  team?: string | null;
  count: number;
}

interface AlertData {
  zero_followup_students: ZeroStudent[];
  total_zero: number;
  total_students: number;
  zero_rate: number;
  by_enclosure: Record<string, number>;
  by_cc: Record<string, CCEntry>;
}

interface ZeroFollowupAlertProps {
  data: AlertData | null;
  isLoading: boolean;
  error: string | null;
}

// ── Enclosure order ─────────────────────────────────────────────────────────

const ENCLOSURE_ORDER = ["0-30", "31-60", "61-90", "91-180", "181+", "未知"];

const ENCLOSURE_COLORS: Record<string, string> = {
  "0-30": "#ef4444",
  "31-60": "#f97316",
  "61-90": "#eab308",
  "91-180": "#84cc16",
  "181+": "#22c55e",
  "未知": "#94a3b8",
};

// ── Component ────────────────────────────────────────────────────────────────

export function ZeroFollowupAlert({ data, isLoading, error }: ZeroFollowupAlertProps) {
  const [showDetail, setShowDetail] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        数据加载失败: {error}。请先运行分析后刷新。
      </div>
    );
  }

  if (!data) return null;

  const { total_zero, total_students, zero_rate, by_enclosure, by_cc, zero_followup_students } = data;

  // Build chart data in order
  const chartData = ENCLOSURE_ORDER.filter((seg) => by_enclosure[seg] !== undefined).map((seg) => ({
    segment: seg,
    count: by_enclosure[seg],
    color: ENCLOSURE_COLORS[seg],
  }));

  // CC ranking sorted by count desc
  const ccRanking = Object.entries(by_cc)
    .map(([cc_name, entry]) => ({ cc_name, ...entry }))
    .sort((a, b) => b.count - a.count);

  // Zero rate color
  const alertColor =
    zero_rate > 0.3
      ? "bg-red-500"
      : zero_rate > 0.15
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div className="space-y-4">
      {/* Alert banner */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-4">
        <div
          className={`flex-shrink-0 w-16 h-16 rounded-full flex flex-col items-center justify-center text-white font-bold ${alertColor}`}
        >
          <span className="text-xl leading-none">{total_zero}</span>
          <span className="text-xs leading-none opacity-80">人</span>
        </div>
        <div>
          <p className="text-base font-semibold text-red-700">
            本月零跟进付费学员预警
          </p>
          <p className="text-sm text-red-600 mt-0.5">
            {total_zero} / {total_students} 名付费学员本月未被拨打（占比{" "}
            <span className="font-bold">{(zero_rate * 100).toFixed(1)}%</span>）
          </p>
          <p className="text-xs text-red-400 mt-1">
            零跟进学员流失风险高，建议优先安排 CC 跟进
          </p>
        </div>
      </div>

      {/* Chart + CC ranking side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Enclosure bar chart */}
        <Card title="按围场段分布（零跟进学员数）">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="segment"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value: number) => [`${value} 人`, "零跟进学员"]}
                  labelFormatter={(label) => `围场段 ${label} 天`}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
              暂无数据
            </div>
          )}
        </Card>

        {/* CC ranking */}
        <Card title="CC 零跟进排名（高→低）">
          {ccRanking.length > 0 ? (
            <div className="overflow-auto max-h-56">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    {["#", "CC", "团队", "零跟进数", "占比"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left text-xs font-semibold text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ccRanking.map((row, i) => {
                    const ccTotal = data.zero_followup_students.filter(
                      (s) => (s.cc_name || "未知") === row.cc_name
                    ).length;
                    const pct = total_students > 0 ? (ccTotal / total_students) * 100 : 0;
                    return (
                      <tr
                        key={row.cc_name}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-3 py-2 text-slate-400 text-xs">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{row.cc_name}</td>
                        <td className="px-3 py-2 text-slate-500 text-xs">{row.team ?? "—"}</td>
                        <td className="px-3 py-2">
                          <span className="font-semibold text-red-600">{row.count}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-500 text-xs">{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
              暂无数据
            </div>
          )}
        </Card>
      </div>

      {/* Detail table (collapsible) */}
      <Card
        title={`零跟进学员明细（${zero_followup_students.length} 人）`}
        actions={
          <button
            onClick={() => setShowDetail((v) => !v)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {showDetail ? "收起" : "展开"}
          </button>
        }
      >
        {showDetail && (
          <>
            {zero_followup_students.length > 0 ? (
              <div className="overflow-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      {["学员ID", "CC", "付费日期", "围场段", "已付费天数"].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left font-semibold text-slate-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {zero_followup_students.map((s, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-3 py-2 text-slate-600 font-mono">
                          {s.student_id ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{s.cc_name ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-500">
                          {s.first_paid_date ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className="px-1.5 py-0.5 rounded text-white text-xs font-medium"
                            style={{
                              backgroundColor:
                                ENCLOSURE_COLORS[s.enclosure_segment] ?? "#94a3b8",
                            }}
                          >
                            {s.enclosure_segment}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {s.days_since_paid != null ? `${s.days_since_paid} 天` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-sm">暂无数据</div>
            )}
          </>
        )}
        {!showDetail && (
          <p className="text-xs text-slate-400 text-center py-2">
            点击「展开」查看学员明细
          </p>
        )}
      </Card>
    </div>
  );
}
