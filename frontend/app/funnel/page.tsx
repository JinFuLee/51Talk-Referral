"use client";

import useSWR from "swr";
import { swrFetcher, formatRate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { FunnelResult, ScenarioResult } from "@/lib/types/funnel";
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

const GAP_COLORS: Record<string, string> = {
  positive: "#10b981",
  negative: "#ef4444",
  neutral: "#94a3b8",
};

function gapColor(gap: number) {
  if (gap > 0) return GAP_COLORS.positive;
  if (gap < 0) return GAP_COLORS.negative;
  return GAP_COLORS.neutral;
}

interface FunnelResponse {
  funnel: FunnelResult;
  scenario: ScenarioResult[];
}

export default function FunnelPage() {
  const { data: funnelData, isLoading: fLoading, error: fError } =
    useSWR<FunnelResult>("/api/funnel", swrFetcher);
  const { data: scenarioData, isLoading: sLoading } =
    useSWR<ScenarioResult[]>("/api/funnel/scenario", swrFetcher);

  const isLoading = fLoading || sLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (fError) {
    return (
      <EmptyState
        title="数据加载失败"
        description="无法获取漏斗数据，请检查后端服务"
      />
    );
  }

  const stages = funnelData?.stages ?? [];
  const scenarios = scenarioData ?? [];

  const conversionChartData = stages
    .filter((s) => s.conversion_rate !== undefined)
    .map((s) => ({
      name: s.name,
      actual: Number(((s.conversion_rate ?? 0) * 100).toFixed(1)),
      target: Number(((s.target_rate ?? 0) * 100).toFixed(1)),
      gap: s.rate_gap ?? 0,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">漏斗分析</h1>
        <p className="text-sm text-slate-500 mt-1">各环节目标 vs 实际 · 场景推演</p>
      </div>

      {/* 漏斗环节表格 */}
      <Card title="漏斗各环节达成">
        {stages.length === 0 ? (
          <EmptyState title="暂无漏斗数据" description="上传数据后自动刷新" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-4">环节</th>
                  <th className="py-2 pr-4 text-right">目标</th>
                  <th className="py-2 pr-4 text-right">实际</th>
                  <th className="py-2 pr-4 text-right">差距</th>
                  <th className="py-2 pr-4 text-right">达成率</th>
                  <th className="py-2 text-right">转化率</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s) => (
                  <tr key={s.name} className="border-b border-slate-50">
                    <td className="py-2.5 pr-4 font-medium">{s.name}</td>
                    <td className="py-2.5 pr-4 text-right text-slate-500">
                      {s.target.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold">
                      {s.actual.toLocaleString()}
                    </td>
                    <td
                      className={`py-2.5 pr-4 text-right font-medium ${
                        s.gap >= 0 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {s.gap >= 0 ? "+" : ""}
                      {s.gap.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <span
                        className={`font-medium ${
                          s.achievement_rate >= 1
                            ? "text-green-600"
                            : s.achievement_rate >= 0.8
                            ? "text-yellow-600"
                            : "text-red-500"
                        }`}
                      >
                        {formatRate(s.achievement_rate)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-slate-500">
                      {s.conversion_rate !== undefined
                        ? formatRate(s.conversion_rate)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 转化率柱状图 */}
      {conversionChartData.length > 0 && (
        <Card title="各环节转化率对比">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={conversionChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
              />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="actual" name="实际" radius={[4, 4, 0, 0]}>
                {conversionChartData.map((entry, i) => (
                  <Cell key={i} fill={gapColor(entry.gap)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* 场景推演表格 */}
      <Card title="场景推演：提升转化率影响">
        {scenarios.length === 0 ? (
          <EmptyState
            title="暂无场景数据"
            description="场景推演需要漏斗基础数据"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-4">环节</th>
                  <th className="py-2 pr-4 text-right">当前转化率</th>
                  <th className="py-2 pr-4 text-right">场景转化率</th>
                  <th className="py-2 pr-4 text-right">影响注册数</th>
                  <th className="py-2 pr-4 text-right">影响付费数</th>
                  <th className="py-2 text-right">影响业绩</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.stage} className="border-b border-slate-50">
                    <td className="py-2.5 pr-4 font-medium">{s.stage}</td>
                    <td className="py-2.5 pr-4 text-right text-slate-500">
                      {formatRate(s.current_rate)}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-blue-600 font-medium">
                      {formatRate(s.scenario_rate)}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      +{s.impact_registrations.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      +{s.impact_payments.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right text-green-600 font-medium">
                      +${s.impact_revenue.toLocaleString()}
                    </td>
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
