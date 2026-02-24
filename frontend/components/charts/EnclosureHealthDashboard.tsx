"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

interface EnclosureHealthSegment {
  enclosure: string;
  health_score: number;
  status: "green" | "yellow" | "red";
  active_students: number;
  conversion_rate: number;
  participation_rate: number;
  followup_rate: number;
  monthly_paid: number;
  channel_efficiency?: Record<string, any>;
  followup_detail?: Record<string, any>;
}

interface EnclosureHealthData {
  segments: EnclosureHealthSegment[];
  overall_followup_rate: number;
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

const STATUS_CONFIG = {
  green: {
    ring: "hsl(var(--success))",
    bg: "bg-emerald-50 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    label: "健康",
    bar: "bg-emerald-500",
  },
  yellow: {
    ring: "hsl(var(--chart-amber))",
    bg: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    label: "预警",
    bar: "bg-amber-500",
  },
  red: {
    ring: "hsl(var(--chart-rose))",
    bg: "bg-rose-50 border-rose-200",
    badge: "bg-rose-100 text-rose-700",
    label: "危险",
    bar: "bg-rose-500",
  },
} as const;

/** SVG circular gauge for health score (0–100 scale) */
function GaugeArc({ score, color }: { score: number; color: string }) {
  const r = 28;
  const cx = 36;
  const cy = 36;
  const circumference = 2 * Math.PI * r;
  // Only draw top 270° (start from 135° to 405°) — common gauge style
  const arcLen = circumference * 0.75;
  const filled = arcLen * Math.min(score / 100, 1);
  // Rotation so gap is at bottom-center
  const rotation = 135;

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-label={`健康度 ${score}`}>
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth="7"
        strokeDasharray={`${arcLen} ${circumference}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(${rotation} ${cx} ${cy})`}
      />
      {/* Fill */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={`${filled} ${circumference}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(${rotation} ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      {/* Score text */}
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="14"
        fontWeight="700"
        fill={color}
      >
        {score}
      </text>
    </svg>
  );
}

interface MiniBarProps {
  label: string;
  value: number;
  barClass: string;
}

function MiniBar({ label, value, barClass }: MiniBarProps) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
        <span>{label}</span>
        <span className="font-semibold">{pct(value)}</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${Math.min(value * 100, 100)}%`, transition: "width 0.5s ease" }}
        />
      </div>
    </div>
  );
}

export function EnclosureHealthDashboard() {
  const { data: d, isLoading, error } = useSWR<EnclosureHealthData>(
    "/api/analysis/enclosure-health",
    swrFetcher,
    { shouldRetryOnError: false }
  );

  const hasData = d && d.segments && d.segments.length > 0;

  return (
    <Card title="围场健康度仪表盘 (F7+F8+D3)">
      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <Spinner />
        </div>
      )}
      {!isLoading && !hasData && (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
          <p className="text-sm font-medium text-slate-600 mb-1">由于当前 A2/F7 分析数据未就绪，暂无围场健康度</p>
          <p className="text-xs text-slate-400">请确保执行了全量 Loader 跑批并生成了围场底层快照</p>
        </div>
      )}
      {!isLoading && hasData && d && (
        <>
          {/* Overall followup rate banner */}
          <div className="flex items-center gap-3 mb-5 px-4 py-2.5 bg-white/95 backdrop-blur-md border border-border/40 shadow-flash rounded-2xl">
            <span className="text-xs text-slate-500">全局付费用户跟进率 (F7)</span>
            <span className="ml-auto text-base font-bold text-slate-700">
              {pct(d.overall_followup_rate)}
            </span>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <span className="text-xs text-slate-400">健康状态：</span>
            {(["green", "yellow", "red"] as const).map((s) => (
              <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[s].badge}`}>
                {STATUS_CONFIG[s].label}
                <span className="ml-1 opacity-60">
                  {s === "green" ? "≥15" : s === "yellow" ? "8–14" : "<8"}
                </span>
              </span>
            ))}
          </div>

          {/* Segment cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {d.segments.map((seg) => {
              const cfg = STATUS_CONFIG[seg.status];
              return (
                <div
                  key={seg.enclosure}
                  className={`rounded-2xl border p-4 shadow-flash hover:shadow-flash-lg hover:-translate-y-1 transition-all duration-500 flex flex-col gap-3 ${cfg.bg} border-border/40`}
                >
                  {/* Header: enclosure label + status badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">
                      {seg.enclosure} 天
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Gauge */}
                  <div className="flex justify-center">
                    <GaugeArc score={seg.health_score} color={cfg.ring} />
                  </div>

                  {/* Sub-metric bars */}
                  <div className="space-y-2">
                    <MiniBar label="转化率" value={seg.conversion_rate} barClass={cfg.bar} />
                    <MiniBar label="参与率" value={seg.participation_rate} barClass={cfg.bar} />
                    <MiniBar label="跟进率" value={seg.followup_rate} barClass={cfg.bar} />
                  </div>

                  {/* A2 Channel breakdown & F8 Follow-up */}
                  <div className="text-[10px] space-y-1 mt-1 p-2 bg-white/50 border border-border/40 rounded-lg">
                    <div className="font-semibold text-slate-500 mb-1 flex items-center justify-between">
                      <span>渠道效率 (A2)</span>
                      <span className="text-slate-400 font-normal border px-1 rounded-sm">参 | 转</span>
                    </div>
                    {["CC窄口径", "SS窄口径", "LP窄口径"].map((ch) => {
                      const chData = seg.channel_efficiency?.[ch];
                      if (!chData) return null;
                      return (
                        <div key={ch} className="flex justify-between text-slate-600">
                          <span>{ch.replace("窄口径", "")}</span>
                          <span>
                            {pct(chData["参与率"] || 0)} | {pct(chData["围场转率"] || 0)}
                          </span>
                        </div>
                      );
                    })}
                    <div className="border-t border-border/40 my-1"></div>
                    <div className="flex justify-between text-slate-600">
                      <span className="font-semibold text-slate-500">有效覆盖 (F8)</span>
                      <span>
                        {pct(
                          seg.followup_detail?.summary?.effective_coverage ||
                            seg.followup_detail?.effective_coverage ||
                            0
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Footer counts */}
                  <div className="grid grid-cols-2 gap-1 mt-auto">
                    <div className="bg-white/60 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-slate-400">活跃学员</p>
                      <p className="text-sm font-bold text-slate-700">
                        {seg.active_students.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-slate-400">本月付费</p>
                      <p className="text-sm font-bold text-slate-700">
                        {seg.monthly_paid.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-slate-400 mt-3">
            健康度 = 转化率×40% + 参与率×30% + 跟进率×30% × 100 · 数据源：F7 全局跟进 / F8 围场覆盖 / D3 围场概览 / A2 围场分布
          </p>
        </>
      )}
    </Card>
  );
}
