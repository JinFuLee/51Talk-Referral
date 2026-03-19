"use client";

import { formatRate } from "@/lib/utils";

interface TeamSummaryCardProps {
  cc_name: string;
  cc_group: string;
  students: number;
  participation_rate: number;
  registrations: number;
  payments: number;
  revenue_usd: number;
}

export function TeamSummaryCard({
  cc_name,
  cc_group,
  students,
  participation_rate,
  registrations,
  payments,
  revenue_usd,
}: TeamSummaryCardProps) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-[var(--radius-xl)] border border-slate-200/60 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-base font-bold text-slate-900">{cc_name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{cc_group}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-600">{students.toLocaleString()}</div>
          <div className="text-xs text-slate-400">有效学员</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-700">
            {formatRate(participation_rate)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">参与率</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-700">
            {registrations.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">注册数</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-700">
            {payments.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">付费数</div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-50 text-right">
        <span className="text-xs text-slate-400">业绩 </span>
        <span className="text-sm font-semibold text-slate-700">
          ${revenue_usd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  );
}
