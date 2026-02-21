"use client";

import { formatRevenue } from "@/lib/utils";

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: "red" | "amber" | "green" | "default";
}

function MetricCard({ label, value, sub, highlight = "default" }: MetricCardProps) {
  const bgMap = {
    red: "bg-destructive/10 border-destructive/20",
    amber: "bg-warning/10 border-warning/20",
    green: "bg-success/10 border-success/20",
    default: "bg-slate-50 border-slate-100",
  };
  const valMap = {
    red: "text-destructive",
    amber: "text-warning",
    green: "text-success",
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

interface CoverageGapSummaryProps {
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
}

export default function CoverageGapSummary({
  summary,
  coverage_gap,
  assumptions,
}: CoverageGapSummaryProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="整体外呼覆盖率"
          value={pct(summary.overall_call_rate)}
          sub={`已外呼 ${summary.total_pre_called.toLocaleString()} / 总 ${summary.total_records.toLocaleString()}`}
          highlight={
            summary.overall_call_rate >= 0.8
              ? "green"
              : summary.overall_call_rate >= 0.6
              ? "amber"
              : "red"
          }
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

      <div className="bg-warning/10 border border-warning/20 rounded-xl px-5 py-4 text-xs text-warning space-y-1">
        <p className="font-semibold text-warning mb-1">损失推算逻辑</p>
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
          = 预估损失收入{" "}
          <span className="font-medium">
            {formatRevenue(coverage_gap.estimated_lost_revenue_usd)}
          </span>
        </p>
      </div>
    </div>
  );
}
