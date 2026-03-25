'use client';

import { formatRate } from '@/lib/utils';
import { BrandDot } from '@/components/ui/BrandDot';

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
    <div className="card-interactive" style={{ cursor: 'default' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-base font-bold text-[var(--text-primary)]">{cc_name}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{cc_group}</p>
        </div>
        {/* 学员数：金色背景块衬托 */}
        <div className="text-right">
          <div
            className="inline-flex flex-col items-end px-2.5 py-1.5 rounded-lg"
            style={{ background: 'var(--color-action-surface)' }}
          >
            <div className="text-lg font-bold" style={{ color: 'var(--brand-p2)' }}>
              {students.toLocaleString()}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--n-500)' }}>
              有效学员 <BrandDot tooltip="已付费且次卡在有效期内的学员" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border-default)]">
        <div className="text-center">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {formatRate(participation_rate)}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
            参与率 <BrandDot tooltip="带来≥1注册的学员 / 有效学员" />
          </div>
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

      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--border-default)]">
        <div className="text-center">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {formatRate(checkin_rate ?? 0)}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
            打卡率 <BrandDot tooltip="转码且分享的学员 / 有效学员" />
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {formatRate(cc_reach_rate ?? 0)}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
            CC触达率 <BrandDot tooltip="有效通话(≥120s)学员 / 有效学员" />
          </div>
        </div>
      </div>

      {/* 业绩行：底部分隔 + 深色强调 */}
      <div className="mt-3 pt-2.5 border-t border-[var(--border-default)] flex items-baseline justify-end gap-1.5">
        <span className="text-xs text-[var(--text-muted)]">业绩</span>
        <span className="text-base font-bold text-[var(--text-primary)]">
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
