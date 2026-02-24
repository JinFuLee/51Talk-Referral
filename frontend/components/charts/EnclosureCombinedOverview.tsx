"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
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



/** Returns a carefully curated, premium gradient base on conversion rate tier */
function getRateStyles(rate: number) {
  if (rate >= 0.15) {
    return {
      card: "bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-lg shadow-brand-500/20 border-white/10 hover:shadow-brand-500/40 hover:-translate-y-1 transition-all duration-300",
      legendMark: "bg-gradient-to-br from-brand-600 to-brand-700",
      panel: "bg-white/10 backdrop-blur-md border border-white/10 shadow-inner",
      textSecondary: "text-brand-100",
      barBg: "bg-black/20",
      barFill: "bg-white",
    };
  }
  if (rate >= 0.12) {
    return {
      card: "bg-gradient-to-br from-brand-400 to-brand-500 text-white shadow-lg shadow-brand-400/20 border-white/10 hover:shadow-brand-400/40 hover:-translate-y-1 transition-all duration-300",
      legendMark: "bg-gradient-to-br from-brand-400 to-brand-500",
      panel: "bg-white/15 backdrop-blur-md border border-white/10 shadow-inner",
      textSecondary: "text-brand-50",
      barBg: "bg-black/20",
      barFill: "bg-white",
    };
  }
  if (rate >= 0.09) {
    return {
      card: "bg-gradient-to-br from-brand-300 to-brand-400 text-brand-900 shadow-lg shadow-brand-300/20 border-white/20 hover:shadow-brand-300/30 hover:-translate-y-1 transition-all duration-300",
      legendMark: "bg-gradient-to-br from-brand-300 to-brand-400",
      panel: "bg-white/20 backdrop-blur-md border border-white/20 shadow-inner",
      textSecondary: "text-brand-800",
      barBg: "bg-black/10",
      barFill: "bg-brand-700",
    };
  }
  if (rate >= 0.06) {
    return {
      card: "bg-gradient-to-br from-brand-100 to-brand-200 text-brand-900 shadow-lg shadow-brand-100/30 border-white/20 hover:shadow-brand-100/50 hover:-translate-y-1 transition-all duration-300",
      legendMark: "bg-gradient-to-br from-brand-100 to-brand-200",
      panel: "bg-white/30 backdrop-blur-md border border-white/20 shadow-inner",
      textSecondary: "text-brand-700",
      barBg: "bg-black/10",
      barFill: "bg-brand-600",
    };
  }
  // < 6%
  return {
    card: "bg-gradient-to-b from-slate-50 to-slate-100 text-slate-700 shadow-md border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300",
    legendMark: "bg-gradient-to-b from-slate-200 to-slate-300",
    panel: "bg-white/60 backdrop-blur-sm border border-slate-200/50",
    textSecondary: "text-slate-500",
    barBg: "bg-slate-200",
    barFill: "bg-slate-600",
  };
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
  textSecondaryClass: string;
}

function StatRow({ label, value, sub, textSecondaryClass }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/10 last:border-0">
      <span className={`text-xs ${textSecondaryClass}`}>{label}</span>
      <div className="text-right flex items-baseline gap-1">
        <span className="text-sm font-semibold">{value}</span>
        {sub && <span className={`text-[10px] ${textSecondaryClass}`}>{sub}</span>}
      </div>
    </div>
  );
}

export function EnclosureCombinedOverview() {
  const { data: d, isLoading, error } = useSWR<EnclosureCombinedData>(
    "/api/analysis/enclosure-combined",
    swrFetcher,
    { shouldRetryOnError: false }
  );

  const hasData = d && d.segments && d.segments.length > 0;

  // Compute max values for relative bar sizing
  const maxStudents = hasData ? Math.max(...d.segments.map((s) => s.active_students), 1) : 1;
  const maxPaid = hasData ? Math.max(...d.segments.map((s) => s.monthly_b_paid), 1) : 1;

  // Legend config using the centralized style generator
  const legends = [
    { rate: 0.15, label: "≥15%" },
    { rate: 0.12, label: "12–15%" },
    { rate: 0.09, label: "9–12%" },
    { rate: 0.06, label: "6–9%" },
    { rate: 0.05, label: "<6%" },
  ];

  return (
    <Card title="D4 围场合并总览">
      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <Spinner />
        </div>
      )}
      {!isLoading && !hasData && (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
          <p className="text-sm font-medium text-slate-600 mb-1">D4 围场合并数据暂未就绪</p>
          <p className="text-xs text-slate-400">请先运行分析以生成围场底层数据</p>
        </div>
      )}
      {!isLoading && hasData && d && (
        <>
          {/* Top-level total summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100/50 rounded-2xl px-5 py-4 text-center shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <p className="text-xs text-blue-500 font-medium mb-1">活跃学员总数</p>
              <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">{num(d.total.active_students)}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100/50 rounded-2xl px-5 py-4 text-center shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <p className="text-xs text-emerald-500 font-medium mb-1">当月B端付费</p>
              <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">{num(d.total.monthly_b_paid)}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/50 rounded-2xl px-5 py-4 text-center shadow-sm">
              <p className="text-xs text-slate-500 font-medium mb-1">综合转化率</p>
              <p className="text-3xl font-bold text-slate-800">{pct(d.total.conversion_rate)}</p>
            </div>
          </div>

          {/* Color legend */}
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <span className="text-xs font-medium text-slate-500">转化率深浅：</span>
            {legends.map(({ rate, label }) => {
              const styles = getRateStyles(rate);
              return (
                <span key={label} className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                  <span className={`inline-block w-3 h-3 rounded-full shadow-sm ${styles.legendMark}`} />
                  {label}
                </span>
              );
            })}
          </div>

          {/* Per-segment cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {d.segments.map((seg) => {
              const studentsBar = (seg.active_students / maxStudents) * 100;
              const paidBar = (seg.monthly_b_paid / maxPaid) * 100;
              const styles = getRateStyles(seg.conversion_rate);

              return (
                <div
                  key={seg.enclosure}
                  className={`rounded-2xl p-4 flex flex-col gap-4 relative overflow-hidden ${styles.card}`}
                >
                  {/* Subtle glare effect */}
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/20 blur-xl rounded-full" />
                  
                  {/* Segment label */}
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <h4 className="text-lg font-extrabold tracking-tight">{seg.enclosure} 天</h4>
                      <p className={`text-xs ${styles.textSecondary}`}>围场内</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg">
                      <span className="text-sm font-bold shadow-sm">{pct(seg.conversion_rate)}</span>
                    </div>
                  </div>

                  {/* Mini progress bars */}
                  <div className="space-y-3 relative z-10">
                    <div>
                      <div className={`flex justify-between text-xs font-medium mb-1 ${styles.textSecondary}`}>
                        <span>活跃学员</span>
                        <span className="text-inherit">{num(seg.active_students)}</span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${styles.barBg}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${styles.barFill}`}
                          style={{ width: `${studentsBar}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className={`flex justify-between text-xs font-medium mb-1 ${styles.textSecondary}`}>
                        <span>当月付费</span>
                        <span className="text-inherit">{num(seg.monthly_b_paid)}</span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${styles.barBg}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out delay-150 ${styles.barFill}`}
                          style={{ width: `${paidBar}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Metric rows (Glassmorphic Panel) */}
                  <div className={`rounded-xl p-3 mt-auto relative z-10 space-y-1 ${styles.panel}`}>
                    <StatRow label="B注册" value={num(seg.monthly_b_registrations)} textSecondaryClass={styles.textSecondary} />
                    <StatRow label="活跃带新" value={num(seg.monthly_active_referrers)} textSecondaryClass={styles.textSecondary} />
                    <StatRow label="参与率" value={pct(seg.participation_rate)} textSecondaryClass={styles.textSecondary} />
                    <StatRow label="动员率" value={pct(seg.mobilization_rate)} textSecondaryClass={styles.textSecondary} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-[11px] text-slate-400">
              围场注：用户付费当日起算天数分段 · 颜色深浅反映该围场整体转化率
            </p>
          </div>
        </>
      )}
    </Card>
  );
}

