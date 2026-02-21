"use client";

export interface EnclosureCombinedSegment {
  enclosure: string;
  active_students: number | null;
  monthly_b_registrations: number | null;
  monthly_b_paid: number | null;
  monthly_active_referrers: number | null;
  conversion_rate: number | null;
  participation_rate: number | null;
  mobilization_rate: number | null;
  ratio: number | null;
}

export interface EnclosureCombinedTotal {
  active_students: number | null;
  monthly_b_paid: number | null;
  monthly_b_registrations: number | null;
  conversion_rate: number | null;
  participation_rate: number | null;
}

interface Props {
  segments: EnclosureCombinedSegment[];
  total: EnclosureCombinedTotal;
}

const SEGMENT_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  "0-30":   { bg: "bg-indigo-50",  border: "border-indigo-200", text: "text-indigo-700",  badge: "bg-indigo-600" },
  "31-60":  { bg: "bg-violet-50",  border: "border-violet-200", text: "text-violet-700",  badge: "bg-violet-600" },
  "61-90":  { bg: "bg-amber-50",   border: "border-amber-200",  text: "text-amber-700",   badge: "bg-amber-500" },
  "91-180": { bg: "bg-orange-50",  border: "border-orange-200", text: "text-orange-700",  badge: "bg-orange-500" },
  "181+":   { bg: "bg-rose-50",    border: "border-rose-200",   text: "text-rose-700",    badge: "bg-rose-500" },
};

function pct(v: number | null, decimals = 1): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(decimals)}%`;
}

function num(v: number | null): string {
  if (v == null) return "—";
  return v.toLocaleString();
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-700">{value}</span>
    </div>
  );
}

export function EnclosureCombinedOverview({ segments, total }: Props) {
  return (
    <div className="space-y-4">
      {/* 总量汇总卡 */}
      {(total.active_students || total.monthly_b_paid) && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-center">
            <div className="text-lg font-bold text-slate-800">{num(total.active_students)}</div>
            <div className="text-xs text-slate-500 mt-0.5">总活跃学员</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-800">{num(total.monthly_b_registrations)}</div>
            <div className="text-xs text-slate-500 mt-0.5">本月注册</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-700">{num(total.monthly_b_paid)}</div>
            <div className="text-xs text-slate-500 mt-0.5">本月付费</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-800">{pct(total.conversion_rate)}</div>
            <div className="text-xs text-slate-500 mt-0.5">整体转化率</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-800">{pct(total.participation_rate)}</div>
            <div className="text-xs text-slate-500 mt-0.5">整体参与率</div>
          </div>
        </div>
      )}

      {/* 5 个围场段卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {segments.map((seg) => {
          const color = SEGMENT_COLORS[seg.enclosure] ?? {
            bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", badge: "bg-slate-500",
          };
          return (
            <div
              key={seg.enclosure}
              className={`rounded-xl border p-3 ${color.bg} ${color.border}`}
            >
              {/* 围场段标题 */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`w-2 h-2 rounded-full ${color.badge}`} />
                <span className={`text-sm font-semibold ${color.text}`}>
                  {seg.enclosure} 天
                </span>
              </div>

              {/* 学员数（大数字） */}
              <div className="text-2xl font-bold text-slate-800 mb-2">
                {num(seg.active_students)}
              </div>
              <div className="text-xs text-slate-500 mb-2">活跃学员</div>

              {/* 关键指标列表 */}
              <div className="space-y-0">
                <MiniStat label="本月付费" value={num(seg.monthly_b_paid)} />
                <MiniStat label="转化率" value={pct(seg.conversion_rate)} />
                <MiniStat label="参与率" value={pct(seg.participation_rate)} />
                <MiniStat label="动员率" value={pct(seg.mobilization_rate)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 漏斗概览行：活跃学员 → 活跃推荐人 → 注册 → 付费 */}
      {segments.some((s) => s.active_students) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">围场段转化漏斗</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-100">
                  <th className="pb-2 text-slate-500 font-medium">围场段</th>
                  <th className="pb-2 text-slate-500 font-medium text-right">活跃学员</th>
                  <th className="pb-2 text-slate-500 font-medium text-right">活跃推荐人</th>
                  <th className="pb-2 text-slate-500 font-medium text-right">本月注册</th>
                  <th className="pb-2 text-slate-500 font-medium text-right">本月付费</th>
                  <th className="pb-2 text-slate-500 font-medium text-right">转化率</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((seg) => (
                  <tr key={seg.enclosure} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 font-medium text-slate-700">{seg.enclosure} 天</td>
                    <td className="py-2 text-right">{num(seg.active_students)}</td>
                    <td className="py-2 text-right">{num(seg.monthly_active_referrers)}</td>
                    <td className="py-2 text-right">{num(seg.monthly_b_registrations)}</td>
                    <td className="py-2 text-right font-semibold text-emerald-700">
                      {num(seg.monthly_b_paid)}
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={
                          seg.conversion_rate == null
                            ? "text-slate-400"
                            : seg.conversion_rate >= 0.15
                            ? "text-emerald-600 font-medium"
                            : seg.conversion_rate >= 0.08
                            ? "text-amber-600"
                            : "text-rose-600"
                        }
                      >
                        {pct(seg.conversion_rate)}
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
