"use client";

export interface CCRankingItem {
  cc_name: string;
  team: string;
  students: number;
  valid_students: number;
  reached_students: number;
  bring_new_total: number;
  bring_new_rate: number;
  reach_rate: number;
}

interface CCBringNewRankingProps {
  data: CCRankingItem[];
}

const MEDAL: Record<number, string> = { 0: "text-yellow-500", 1: "text-slate-400", 2: "text-amber-600" };

function RateBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color =
    value >= 0.28
      ? "bg-success"
      : value >= 0.20
      ? "bg-warning"
      : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span
        className={`text-xs font-medium w-12 text-right ${
          value >= 0.28 ? "text-success" : value >= 0.20 ? "text-warning" : "text-destructive"
        }`}
      >
        {(value * 100).toFixed(1)}%
      </span>
    </div>
  );
}

export function CCBringNewRanking({ data }: CCBringNewRankingProps) {
  if (!data.length) {
    return <p className="text-sm text-slate-400 py-4 text-center">暂无数据</p>;
  }

  const maxRate = Math.max(...data.map((d) => d.bring_new_rate));

  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full min-w-[580px]">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-3 py-2 text-slate-400 font-medium w-8">#</th>
            <th className="text-left px-3 py-2 text-slate-400 font-medium">CC</th>
            <th className="px-3 py-2 text-center text-slate-400 font-medium">团队</th>
            <th className="px-3 py-2 text-center text-slate-400 font-medium">学员数</th>
            <th className="px-3 py-2 text-center text-slate-400 font-medium">有效学员</th>
            <th className="px-3 py-2 text-center text-slate-400 font-medium">带新总数</th>
            <th className="px-3 py-2 text-slate-400 font-medium min-w-[160px]">带新率</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.cc_name}
              className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                idx < 3 ? "bg-slate-50/50" : ""
              }`}
            >
              <td className={`px-3 py-2 font-bold text-sm ${MEDAL[idx] ?? "text-slate-400"}`}>
                {idx < 3 ? ["1st", "2nd", "3rd"][idx] : idx + 1}
              </td>
              <td className="px-3 py-2 font-medium text-slate-700">{row.cc_name}</td>
              <td className="px-3 py-2 text-center">
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium">
                  {row.team}
                </span>
              </td>
              <td className="px-3 py-2 text-center text-slate-600">{row.students.toLocaleString()}</td>
              <td className="px-3 py-2 text-center text-slate-600">{row.valid_students.toLocaleString()}</td>
              <td className="px-3 py-2 text-center font-semibold text-primary">
                {row.bring_new_total}
              </td>
              <td className="px-3 py-2">
                <RateBar value={row.bring_new_rate} max={maxRate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-slate-400 mt-2 px-3">
        带新率 = 带新注册总数 / 有效学员数 | 绿色 ≥28% / 黄色 ≥20% / 红色 &lt;20%
      </p>
    </div>
  );
}
