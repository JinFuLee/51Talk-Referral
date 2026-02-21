"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { formatRevenue } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface FunnelStage {
  stage: string;
  count: number;
  rate: number;
  estimated_revenue_loss: number | null;
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

interface CoverageData {
  summary: {
    total_records: number;
    total_pre_called: number;
    total_pre_connected: number;
    total_attended: number;
    overall_call_rate: number;
    overall_connect_rate: number;
    overall_attendance_rate: number;
  };
  coverage_gap: {
    uncovered_students: number;
    uncovered_rate: number;
    estimated_lost_attendance: number;
    estimated_lost_paid: number;
    estimated_lost_revenue_usd: number;
  };
  assumptions: {
    avg_order_usd: number;
    attend_to_paid_rate: number;
  };
  funnel: FunnelStage[];
  by_grade: GradeRow[];
  by_cc: CCRow[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function coverageColor(rate: number): string {
  if (rate >= 0.8) return "hsl(var(--success))";
  if (rate >= 0.6) return "#f59e0b";
  return "hsl(var(--destructive))";
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: "red" | "amber" | "green" | "default";
}

function MetricCard({ label, value, sub, highlight = "default" }: MetricCardProps) {
  const bgMap = {
    red: "bg-red-50 border-red-100",
    amber: "bg-amber-50 border-amber-100",
    green: "bg-green-50 border-green-100",
    default: "bg-slate-50 border-slate-100",
  };
  const valMap = {
    red: "text-red-700",
    amber: "text-amber-700",
    green: "text-green-700",
    default: "text-slate-700",
  };
  return (
    <div className={`rounded-xl border px-5 py-4 ${bgMap[highlight]}`}>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-xl font-bold mt-1 ${valMap[highlight]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

interface TooltipPayloadItem {
  payload: FunnelStage;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function FunnelTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-xl shadow-flash p-3 text-xs max-w-xs">
      <p className="font-semibold text-slate-700 mb-1">{item.stage}</p>
      <p className="text-slate-600">人数: <span className="font-medium">{item.count.toLocaleString()}</span></p>
      <p className="text-slate-600">覆盖率: <span className="font-medium">{pct(item.rate)}</span></p>
      {item.estimated_revenue_loss != null && (
        <p className="text-red-600 mt-1">
          覆盖缺口对应损失: <span className="font-medium">{formatRevenue(item.estimated_revenue_loss)}</span>
        </p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function OutreachCoverageGap() {
  const [data, setData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"grade" | "cc">("grade");

  useEffect(() => {
    fetch("/api/analysis/outreach-coverage")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: CoverageData) => {
        setData(json);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        加载中…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
        {error ? `数据加载失败: ${error}` : "暂无覆盖缺口数据，请先运行分析引擎"}
      </div>
    );
  }

  const { summary, coverage_gap, assumptions, funnel, by_grade, by_cc } = data;

  // Funnel chart data — show as horizontal bar (people count)
  const funnelChartData = funnel.map((s) => ({
    ...s,
    fill: coverageColor(s.rate),
  }));

  return (
    <div className="space-y-8">
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="整体外呼覆盖率"
          value={pct(summary.overall_call_rate)}
          sub={`已外呼 ${summary.total_pre_called.toLocaleString()} / 总 ${summary.total_records.toLocaleString()}`}
          highlight={summary.overall_call_rate >= 0.8 ? "green" : summary.overall_call_rate >= 0.6 ? "amber" : "red"}
        />
        <MetricCard
          label="未被外呼学员"
          value={coverage_gap.uncovered_students.toLocaleString()}
          sub={`占比 ${pct(coverage_gap.uncovered_rate)}`}
          highlight="red"
        />
        <MetricCard
          label="预估损失收入"
          value={formatRevenue(coverage_gap.estimated_lost_revenue_usd)}
          sub={`预估损失付费 ${coverage_gap.estimated_lost_paid} 单 · 客单价 $${assumptions.avg_order_usd}`}
          highlight="amber"
        />
      </div>

      {/* ── Loss chain explanation ── */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 text-xs text-amber-800 space-y-1">
        <p className="font-semibold text-amber-700 mb-1">损失推算逻辑</p>
        <p>
          未覆盖学员 <span className="font-medium">{coverage_gap.uncovered_students}</span> 人
          × 平均出席率 <span className="font-medium">{pct(summary.overall_attendance_rate)}</span>
          = 预估损失出席 <span className="font-medium">{coverage_gap.estimated_lost_attendance}</span> 人
        </p>
        <p>
          损失出席 <span className="font-medium">{coverage_gap.estimated_lost_attendance}</span> 人
          × 出席→付费转化率 <span className="font-medium">{pct(assumptions.attend_to_paid_rate)}</span>
          = 预估损失付费 <span className="font-medium">{coverage_gap.estimated_lost_paid}</span> 单
        </p>
        <p>
          损失付费 <span className="font-medium">{coverage_gap.estimated_lost_paid}</span> 单
          × 客单价 <span className="font-medium">${assumptions.avg_order_usd}</span>
          = 预估损失收入 <span className="font-medium">{formatRevenue(coverage_gap.estimated_lost_revenue_usd)}</span>
        </p>
      </div>

      {/* ── Funnel chart ── */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">课前外呼漏斗</h3>
        <div className="overflow-x-auto">
          <div style={{ minWidth: 400 }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                layout="vertical"
                data={funnelChartData}
                margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v.toLocaleString()}
                />
                <YAxis
                  type="category"
                  dataKey="stage"
                  width={72}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<FunnelTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  <LabelList
                    dataKey="rate"
                    position="right"
                    formatter={(v: number) => pct(v)}
                    style={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 600 }}
                  />
                  {funnelChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Tabs: by_grade / by_cc ── */}
      <div>
        <div className="flex gap-2 mb-4">
          {(["grade", "cc"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${
                activeTab === tab
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {tab === "grade" ? "评级分布" : "CC 覆盖排名"}
            </button>
          ))}
        </div>

        {/* by_grade table */}
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
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
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
                        <td className="py-2 px-2 text-right text-slate-600">{row.total.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right text-green-600">{row.covered.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right text-red-500">{row.uncovered.toLocaleString()}</td>
                        <td
                          className="py-2 px-2 text-right font-semibold"
                          style={{ color: coverageColor(row.covered_rate) }}
                        >
                          {pct(row.covered_rate)}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600">{pct(row.connect_rate)}</td>
                        <td className="py-2 px-2 text-right text-slate-600">{pct(row.attendance_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {/* by_cc table */}
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
                      <td className="py-2 px-2 text-right text-slate-600">{row.total.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right text-slate-600">{row.covered.toLocaleString()}</td>
                      <td
                        className="py-2 px-2 text-right font-semibold"
                        style={{ color: coverageColor(row.call_rate) }}
                      >
                        {pct(row.call_rate)}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-600">{pct(row.connect_rate)}</td>
                      <td className="py-2 px-2 text-right text-slate-600">{pct(row.attendance_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
