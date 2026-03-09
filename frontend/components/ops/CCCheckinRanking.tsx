"use client";

import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface CCCheckinRow {
  cc_name: string;
  team?: string | null;
  checkin_24h_rate?: number | null;
  checkin_24h_target?: number | null;
  achievement_rate?: number | null;
  referral_coefficient?: number | null;
}

interface CCCheckinRankingProps {
  byCC: CCCheckinRow[];
  achievedCount: number;
  totalCC: number;
  target?: number;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color =
    pct >= 100 ? "bg-success" : pct >= 80 ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 w-10 text-right">
        {(value * 100).toFixed(1)}%
      </span>
    </div>
  );
}

export function CCCheckinRanking({
  byCC,
  achievedCount,
  totalCC,
  target = 0,
}: CCCheckinRankingProps) {
  const achievedPct = totalCC > 0 ? Math.round((achievedCount / totalCC) * 100) : 0;

  const gaugeData = [
    {
      name: "达标率",
      value: achievedPct,
      fill:
        achievedPct >= 80
          ? "hsl(var(--success))"
          : achievedPct >= 60
          ? "hsl(var(--warning))"
          : "hsl(var(--destructive))",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Radial gauge — top */}
      <div className="flex items-center gap-6">
        <div style={{ width: 120, height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="60%"
              outerRadius="100%"
              data={gaugeData}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar dataKey="value" cornerRadius={6} background />
              <Tooltip
                formatter={(v) => [`${v}%`, "团队达标率"]}
                contentStyle={{ fontSize: 12 }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-3xl font-bold text-slate-800">{achievedPct}%</p>
          <p className="text-sm text-slate-500">团队达标率</p>
          <p className="text-xs text-slate-400 mt-1">
            {achievedCount}/{totalCC} 人达标 · 目标 {(target * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Table */}
      {byCC.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
          暂无打卡率数据
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["排名", "CC 姓名", "团队", "24H 打卡率", "达标", "带新系数"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {byCC.map((row, i) => {
                const rate = row.checkin_24h_rate ?? 0;
                const achieved = target > 0 ? rate >= target : false;
                return (
                  <tr
                    key={`${row.cc_name}-${i}`}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-3 py-2 text-xs text-slate-400 font-mono">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {row.cc_name}
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs">
                      {row.team ?? "—"}
                    </td>
                    <td className="px-3 py-2 w-40">
                      <ProgressBar value={rate} max={Math.max(target, 1)} />
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
                          achieved
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {achieved ? "达标" : "未达"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 text-xs">
                      {row.referral_coefficient != null
                        ? row.referral_coefficient.toFixed(2)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
