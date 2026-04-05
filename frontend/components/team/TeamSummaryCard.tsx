'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('TeamSummaryCard');

  return (
    <div className="card-interactive" style={{ cursor: 'default' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-base font-bold text-primary-token">{cc_name}</p>
          <p className="text-xs text-muted-token mt-0.5">{cc_group}</p>
        </div>
        <div className="text-right">
          <div
            className="inline-flex flex-col items-end px-2.5 py-1.5 rounded-lg"
            style={{ background: 'var(--color-action-surface)' }}
          >
            <div className="text-lg font-bold" style={{ color: 'var(--brand-p2)' }}>
              {students.toLocaleString()}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--n-500)' }}>
              {t('students')} <BrandDot tooltip={t('studentsTooltip')} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-default-token">
        <div className="text-center">
          <div className="text-sm font-semibold text-primary-token">
            {formatRate(participation_rate)}
          </div>
          <div className="text-[10px] text-muted-token mt-0.5">
            {t('participationRate')} <BrandDot tooltip={t('participationTooltip')} />
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-primary-token">
            {registrations.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-token mt-0.5">{t('registrations')}</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-primary-token">
            {payments.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-token mt-0.5">{t('payments')}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-default-token">
        <div className="text-center">
          <div className="text-sm font-semibold text-primary-token">
            {formatRate(checkin_rate ?? 0)}
          </div>
          <div className="text-[10px] text-muted-token mt-0.5">
            {t('checkinRate')} <BrandDot tooltip={t('checkinTooltip')} />
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-primary-token">
            {formatRate(cc_reach_rate ?? 0)}
          </div>
          <div className="text-[10px] text-muted-token mt-0.5">
            {t('ccReach')} <BrandDot tooltip={t('ccReachTooltip')} />
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-default-token flex items-baseline justify-end gap-1.5">
        <span className="text-xs text-muted-token">{t('revenue')}</span>
        <span className="text-base font-bold text-primary-token">
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
