"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ViewMode = "count" | "rate";

interface TeamRow {
  team: string;
  注册: number;
  预约: number;
  出席: number;
  付费: number;
  conversion_rate: number;
}

interface FunnelApiResponse {
  teams: TeamRow[];
  total_teams: number;
}

const COLORS = {
  注册: "#6366f1",
  预约: "#22d3ee",
  出席: "#f59e0b",
  付费: "#10b981",
};

const RATE_LABELS: Record<string, string> = {
  预约率: "#22d3ee",
  出席率: "#f59e0b",
  付费率: "#10b981",
};

function buildCountData(teams: TeamRow[]) {
  return teams.map((t) => ({
    team: t.team,
    注册: t.注册 ?? 0,
    预约: t.预约 ?? 0,
    出席: t.出席 ?? 0,
    付费: t.付费 ?? 0,
  }));
}

function buildRateData(teams: TeamRow[]) {
  return teams.map((t) => {
    const reg = t.注册 || 1;
    const rsv = t.预约 || 0;
    const att = t.出席 || 0;
    const paid = t.付费 || 0;
    return {
      team: t.team,
      预约率: Math.round((rsv / reg) * 1000) / 10,
      出席率: Math.round((att / (rsv || 1)) * 1000) / 10,
      付费率: Math.round((paid / (att || 1)) * 1000) / 10,
    };
  });
}

export function TeamFunnelComparison() {
  const [view, setView] = useState<ViewMode>("count");

  const { data, isLoading, error } = useSWR<FunnelApiResponse>(
    `${BASE}/api/analysis/funnel/team`,
    fetcher,
    { refreshInterval: 0 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        加载中…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        数据加载失败，请先运行分析
      </div>
    );
  }

  const teams = data.teams ?? [];

  if (teams.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        暂无团队漏斗数据
      </div>
    );
  }

  const chartData =
    view === "count" ? buildCountData(teams) : buildRateData(teams);

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        {(["count", "rate"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setView(mode)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              view === mode
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {mode === "count" ? "数量" : "转化率"}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-auto">
          共 {data.total_teams} 个团队
        </span>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="team"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            unit={view === "rate" ? "%" : ""}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
            formatter={(value: number, name: string) =>
              view === "rate"
                ? [`${value.toFixed(1)}%`, name]
                : [value, name]
            }
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#64748b" }}
          />
          {view === "count"
            ? (Object.keys(COLORS) as Array<keyof typeof COLORS>).map((k) => (
                <Bar
                  key={k}
                  dataKey={k}
                  fill={COLORS[k]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              ))
            : Object.entries(RATE_LABELS).map(([k, color]) => (
                <Bar
                  key={k}
                  dataKey={k}
                  fill={color}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Summary table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["团队", "注册", "预约", "出席", "付费", "转化率"].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((t, i) => (
              <tr
                key={i}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="px-3 py-2 font-medium text-slate-700">
                  {t.team}
                </td>
                <td className="px-3 py-2 text-slate-600">{t.注册 ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{t.预约 ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{t.出席 ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{t.付费 ?? "—"}</td>
                <td className="px-3 py-2 text-indigo-600 font-medium">
                  {t.conversion_rate != null
                    ? `${(t.conversion_rate * 100).toFixed(1)}%`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
