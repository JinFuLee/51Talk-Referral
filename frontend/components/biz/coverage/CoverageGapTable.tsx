"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function coverageColor(rate: number): string {
  if (rate >= 0.8) return "hsl(var(--success))";
  if (rate >= 0.6) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

interface GradeRow {
  grade: string;
  total: number;
  covered: number;
  uncovered: number;
  covered_rate: number;
  connect_rate: number;
  attendance_rate: number;
}

interface CCRow {
  cc_name: string;
  team: string | null;
  total: number;
  covered: number;
  connected: number;
  attended: number;
  call_rate: number;
  connect_rate: number;
  attendance_rate: number;
}

interface CoverageGapTableProps {
  by_grade: GradeRow[];
  by_cc: CCRow[];
  activeTab: "grade" | "cc";
  onTabChange: (tab: "grade" | "cc") => void;
}

export default function CoverageGapTable({
  by_grade,
  by_cc,
  activeTab,
  onTabChange,
}: CoverageGapTableProps) {
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["grade", "cc"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-4 py-1.5 text-sm rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-500 focus-visible:outline-none ${
              activeTab === tab
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            {tab === "grade" ? "评级分布" : "CC 覆盖排名"}
          </button>
        ))}
      </div>

      {activeTab === "grade" && (
        <div>
          {by_grade.length === 0 ? (
            <p className="text-sm text-slate-400">暂无评级分组数据</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div style={{ minWidth: 480 }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={by_grade}
                      margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="grade"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v: number) => pct(v)}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 1]}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          pct(value),
                          name === "covered_rate"
                            ? "外呼覆盖率"
                            : name === "connect_rate"
                            ? "接通率"
                            : "出席率",
                        ]}
                      />
                      <Bar dataKey="covered_rate" name="covered_rate" radius={[3, 3, 0, 0]}>
                        {by_grade.map((entry, idx) => (
                          <Cell key={idx} fill={coverageColor(entry.covered_rate)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <table className="w-full text-xs mt-4 border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="text-left py-2 px-2">评级</th>
                    <th className="text-right py-2 px-2">总人数</th>
                    <th className="text-right py-2 px-2">已外呼</th>
                    <th className="text-right py-2 px-2">未外呼</th>
                    <th className="text-right py-2 px-2">覆盖率</th>
                    <th className="text-right py-2 px-2">接通率</th>
                    <th className="text-right py-2 px-2">出席率</th>
                  </tr>
                </thead>
                <tbody>
                  {by_grade.map((row) => (
                    <tr key={row.grade} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 px-2 font-medium text-slate-700">{row.grade}</td>
                      <td className="py-2 px-2 text-right text-slate-600">
                        {row.total.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right text-success">
                        {row.covered.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right text-destructive">
                        {row.uncovered.toLocaleString()}
                      </td>
                      <td
                        className="py-2 px-2 text-right font-semibold"
                        style={{ color: coverageColor(row.covered_rate) }}
                      >
                        {pct(row.covered_rate)}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-600">
                        {pct(row.connect_rate)}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-600">
                        {pct(row.attendance_rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {activeTab === "cc" && (
        <div>
          {by_cc.length === 0 ? (
            <p className="text-sm text-slate-400">暂无 CC 覆盖数据</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="text-left py-2 px-2">排名</th>
                  <th className="text-left py-2 px-2">CC 姓名</th>
                  <th className="text-left py-2 px-2">组别</th>
                  <th className="text-right py-2 px-2">总课次</th>
                  <th className="text-right py-2 px-2">已外呼</th>
                  <th className="text-right py-2 px-2">覆盖率</th>
                  <th className="text-right py-2 px-2">接通率</th>
                  <th className="text-right py-2 px-2">出席率</th>
                </tr>
              </thead>
              <tbody>
                {by_cc.map((row, idx) => (
                  <tr key={row.cc_name} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 px-2 text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-2 font-medium text-slate-700">{row.cc_name}</td>
                    <td className="py-2 px-2 text-slate-500">{row.team ?? "—"}</td>
                    <td className="py-2 px-2 text-right text-slate-600">
                      {row.total.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600">
                      {row.covered.toLocaleString()}
                    </td>
                    <td
                      className="py-2 px-2 text-right font-semibold"
                      style={{ color: coverageColor(row.call_rate) }}
                    >
                      {pct(row.call_rate)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600">
                      {pct(row.connect_rate)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600">
                      {pct(row.attendance_rate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
