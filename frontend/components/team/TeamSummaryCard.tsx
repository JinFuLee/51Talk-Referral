'use client';

import { formatRate } from '@/lib/utils';

interface TeamSummaryCardProps {
  cc_name: string;
  cc_group: string;
  students: number;
  participation_rate: number;
  registrations: number;
  payments: number;
  revenue_usd: number;
  checkin_rate?: number;
  cc_reach_rate?: number;
}

export function TeamSummaryCard({
  cc_name,
  cc_group,
  students,
  participation_rate,
  registrations,
  payments,
  revenue_usd,
  checkin_rate,
  cc_reach_rate,
}: TeamSummaryCardProps) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-base font-bold text-[var(--text-primary)]">{cc_name}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{cc_group}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-action-accent">{students.toLocaleString()}</div>
          <div className="text-xs text-[var(--text-muted)]">有效学员</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border-subtle)]">
        <div className="text-center">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {formatRate(participation_rate)}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">参与率</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {registrations.toLocaleString()}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">注册数</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {payments.toLocaleString()}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">付费数</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
        <div className="text-center">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {formatRate(checkin_rate ?? 0)}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">打卡率</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {formatRate(cc_reach_rate ?? 0)}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">CC触达率</div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-50 text-right">
        <span className="text-xs text-[var(--text-muted)]">业绩 </span>
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          $
          {(revenue_usd ?? 0).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </span>
      </div>
    </div>
  );
}
