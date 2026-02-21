"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface TeamStat {
  team: string;
  students: number;
  valid_students: number;
  reached_students: number;
  bring_new_total: number;
  bring_new_rate: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "indigo" | "emerald" | "amber" | "sky";
}

const accentMap: Record<string, { card: string; value: string }> = {
  indigo: { card: "border-l-4 border-l-indigo-500", value: "text-indigo-700" },
  emerald: { card: "border-l-4 border-l-emerald-500", value: "text-emerald-700" },
  amber:  { card: "border-l-4 border-l-amber-500",  value: "text-amber-700"  },
  sky:    { card: "border-l-4 border-l-sky-500",    value: "text-sky-700"    },
};

function StatCard({ label, value, sub, accent = "indigo" }: StatCardProps) {
  const cls = accentMap[accent];
  return (
    <div className={`bg-white rounded-xl border border-slate-100 shadow-sm p-5 ${cls.card}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${cls.value}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

interface CohortStudentOverviewProps {
  totalStudents: number;
  teams: TeamStat[];
}

export function CohortStudentOverview({ totalStudents, teams }: CohortStudentOverviewProps) {
  const totalValid = teams.reduce((s, t) => s + t.valid_students, 0);
  const totalReached = teams.reduce((s, t) => s + t.reached_students, 0);
  const totalBringNew = teams.reduce((s, t) => s + t.bring_new_total, 0);

  const chartData = teams.map((t) => ({
    name: t.team,
    学员数: t.students,
    有效学员: t.valid_students,
    触达学员: t.reached_students,
    带新总数: t.bring_new_total,
  }));

  return (
    <div className="space-y-5">
      {/* 4 summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="总学员数"
          value={totalStudents}
          sub="C6 Cohort"
          accent="indigo"
        />
        <StatCard
          label="有效学员数"
          value={totalValid || "—"}
          sub={totalValid && totalStudents ? `占比 ${((totalValid / totalStudents) * 100).toFixed(1)}%` : undefined}
          accent="emerald"
        />
        <StatCard
          label="触达学员数"
          value={totalReached || "—"}
          sub={totalValid && totalReached ? `触达率 ${((totalReached / totalValid) * 100).toFixed(1)}%` : undefined}
          accent="sky"
        />
        <StatCard
          label="带新注册总数"
          value={totalBringNew || "—"}
          sub={totalValid && totalBringNew ? `带新率 ${((totalBringNew / totalValid) * 100).toFixed(1)}%` : undefined}
          accent="amber"
        />
      </div>

      {/* Team comparison bar chart */}
      {teams.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">团队对比</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="学员数" fill="#c7d2fe" radius={[3, 3, 0, 0]} />
              <Bar dataKey="有效学员" fill="hsl(var(--chart-4))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="触达学员" fill="#38bdf8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="带新总数" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Team table */}
          <div className="overflow-x-auto mt-3">
            <table className="text-xs w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-3 py-1.5 text-slate-400 font-medium">团队</th>
                  <th className="px-3 py-1.5 text-center text-slate-400 font-medium">学员数</th>
                  <th className="px-3 py-1.5 text-center text-slate-400 font-medium">有效学员</th>
                  <th className="px-3 py-1.5 text-center text-slate-400 font-medium">触达学员</th>
                  <th className="px-3 py-1.5 text-center text-slate-400 font-medium">带新总数</th>
                  <th className="px-3 py-1.5 text-center text-slate-400 font-medium">带新率</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.team} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-medium text-slate-700">{t.team}</td>
                    <td className="px-3 py-1.5 text-center text-slate-600">{t.students.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-center text-slate-600">{t.valid_students.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-center text-slate-600">{t.reached_students.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-center font-semibold text-indigo-600">{t.bring_new_total}</td>
                    <td className="px-3 py-1.5 text-center">
                      <span
                        className={`font-medium ${
                          t.bring_new_rate >= 0.25
                            ? "text-emerald-600"
                            : t.bring_new_rate >= 0.18
                            ? "text-amber-600"
                            : "text-rose-500"
                        }`}
                      >
                        {(t.bring_new_rate * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
