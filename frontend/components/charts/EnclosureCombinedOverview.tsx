"use client";

import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

interface EnclosureSegmentData {
  enclosure: string;
  active_students: number;
  monthly_b_registrations: number;
  monthly_b_paid: number;
  monthly_active_referrers: number;
  conversion_rate: number;
  participation_rate: number;
  mobilization_rate: number;
}

interface EnclosureTotals {
  active_students: number;
  monthly_b_paid: number;
  conversion_rate: number;
}

interface EnclosureCombinedData {
  segments: EnclosureSegmentData[];
  total: EnclosureTotals;
}

const MOCK_DATA: EnclosureCombinedData = {
  segments: [
    { enclosure: "0-30", active_students: 180, monthly_b_registrations: 25, monthly_b_paid: 13, monthly_active_referrers: 40, conversion_rate: 0.15, participation_rate: 0.30, mobilization_rate: 0.22 },
    { enclosure: "31-60", active_students: 220, monthly_b_registrations: 30, monthly_b_paid: 10, monthly_active_referrers: 35, conversion_rate: 0.12, participation_rate: 0.25, mobilization_rate: 0.18 },
    { enclosure: "61-90", active_students: 170, monthly_b_registrations: 18, monthly_b_paid: 7, monthly_active_referrers: 28, conversion_rate: 0.09, participation_rate: 0.20, mobilization_rate: 0.14 },
    { enclosure: "91-180", active_students: 150, monthly_b_registrations: 12, monthly_b_paid: 4, monthly_active_referrers: 20, conversion_rate: 0.06, participation_rate: 0.15, mobilization_rate: 0.10 },
    { enclosure: "181+", active_students: 80, monthly_b_registrations: 5, monthly_b_paid: 1, monthly_active_referrers: 8, conversion_rate: 0.04, participation_rate: 0.10, mobilization_rate: 0.07 },
  ],
  total: { active_students: 800, monthly_b_paid: 35, conversion_rate: 0.10 },
};

/** Returns a Tailwind bg class scaling from blue-50 (low) to blue-600 (high) based on 0–1 value */
function convRateColor(rate: number): string {
  if (rate >= 0.15) return "bg-blue-600 text-white border-blue-700";
  if (rate >= 0.12) return "bg-blue-400 text-white border-blue-500";
  if (rate >= 0.09) return "bg-blue-200 text-blue-900 border-blue-300";
  if (rate >= 0.06) return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function pct(v: number) {
  if (v == null) return "0.0%";
  return `${(v * 100).toFixed(1)}%`;
}

function num(v: number) {
  if (v == null) return "0";
  return Number(v).toLocaleString();
}

interface StatRowProps {
  label: string;
  value: string;
  sub?: string;
}

function StatRow({ label, value, sub }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="text-right">
        <span className="text-xs font-semibold text-slate-700">{value}</span>
        {sub && <span className="text-[10px] text-slate-400 ml-1">{sub}</span>}
      </div>
    </div>
  );
}

export function EnclosureCombinedOverview() {
  const { data, isLoading, error } = useSWR<EnclosureCombinedData>(
    "enclosure-combined",
    () => fetch("/api/analysis/enclosure-combined").then((r) => r.json()),
    { shouldRetryOnError: false }
  );

  const isMock = !isLoading && (!data || error);
  const d = data ?? MOCK_DATA;

  // Compute max values for relative bar sizing
  const maxStudents = Math.max(...d.segments.map((s) => s.active_students), 1);
  const maxPaid = Math.max(...d.segments.map((s) => s.monthly_b_paid), 1);

  return (
    <Card title="D4 围场合并总览">
      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <Spinner />
        </div>
      )}
      {isMock && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded text-xs mb-2">
          ⚠ 当前显示模拟数据（API 数据不可用）
        </div>
      )}
      {!isLoading && (
        <>
          {/* Top-level total summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-blue-400 font-medium mb-0.5">活跃学员总数</p>
              <p className="text-2xl font-bold text-blue-700">{num(d.total.active_students)}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-emerald-400 font-medium mb-0.5">当月B端付费</p>
              <p className="text-2xl font-bold text-emerald-700">{num(d.total.monthly_b_paid)}</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-slate-400 font-medium mb-0.5">综合转化率</p>
              <p className="text-2xl font-bold text-slate-700">{pct(d.total.conversion_rate)}</p>
            </div>
          </div>

          {/* Color legend */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="text-xs text-slate-400">转化率深浅：</span>
            {[
              { cls: "bg-blue-600", label: "≥15%" },
              { cls: "bg-blue-400", label: "12–15%" },
              { cls: "bg-blue-200", label: "9–12%" },
              { cls: "bg-blue-100", label: "6–9%" },
              { cls: "bg-slate-100", label: "<6%" },
            ].map(({ cls, label }) => (
              <span key={label} className="flex items-center gap-1 text-xs text-slate-500">
                <span className={`inline-block w-3 h-3 rounded ${cls}`} />
                {label}
              </span>
            ))}
          </div>

          {/* Per-segment cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {d.segments.map((seg) => {
              const studentsBar = (seg.active_students / maxStudents) * 100;
              const paidBar = (seg.monthly_b_paid / maxPaid) * 100;

              return (
                <div
                  key={seg.enclosure}
                  className={`rounded-xl border-2 p-4 flex flex-col gap-3 ${convRateColor(seg.conversion_rate)}`}
                >
                  {/* Segment label */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{seg.enclosure} 天</span>
                    <span className="text-xs font-semibold opacity-80">
                      {pct(seg.conversion_rate)}
                    </span>
                  </div>

                  {/* Mini progress bars */}
                  <div className="space-y-1.5">
                    <div>
                      <div className="flex justify-between text-[10px] opacity-70 mb-0.5">
                        <span>活跃学员</span>
                        <span>{num(seg.active_students)}</span>
                      </div>
                      <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-current opacity-60 rounded-full"
                          style={{ width: `${studentsBar}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] opacity-70 mb-0.5">
                        <span>当月付费</span>
                        <span>{num(seg.monthly_b_paid)}</span>
                      </div>
                      <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-current opacity-80 rounded-full"
                          style={{ width: `${paidBar}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Metric rows */}
                  <div className="bg-white/20 rounded-lg p-2 space-y-0 mt-auto">
                    <StatRow label="B注册" value={num(seg.monthly_b_registrations)} />
                    <StatRow label="活跃带新" value={num(seg.monthly_active_referrers)} />
                    <StatRow label="参与率" value={pct(seg.participation_rate)} />
                    <StatRow label="动员率" value={pct(seg.mobilization_rate)} />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-slate-400 mt-3">
            围场 = 用户付费当日起算天数分段 · 颜色深浅反映该围场整体转化率
          </p>
        </>
      )}
    </Card>
  );
}
