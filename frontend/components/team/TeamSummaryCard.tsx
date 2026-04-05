'use client';

import { useLocale } from 'next-intl';
import { formatRate } from '@/lib/utils';
import { BrandDot } from '@/components/ui/BrandDot';

const I18N = {
  zh: {
    students: '有效学员',
    studentsTooltip: '已付费且次卡在有效期内的学员',
    participationRate: '参与率',
    participationTooltip: '带来≥1注册的学员 / 有效学员',
    registrations: '注册数',
    payments: '付费数',
    checkinRate: '打卡率',
    checkinTooltip: '转码且分享的学员 / 有效学员',
    ccReach: 'CC触达率',
    ccReachTooltip: '有效通话(≥120s)学员 / 有效学员',
    revenue: '业绩',
  },
  'zh-TW': {
    students: '有效學員',
    studentsTooltip: '已付費且次卡在有效期內的學員',
    participationRate: '參與率',
    participationTooltip: '帶來≥1註冊的學員 / 有效學員',
    registrations: '註冊數',
    payments: '付費數',
    checkinRate: '打卡率',
    checkinTooltip: '轉碼且分享的學員 / 有效學員',
    ccReach: 'CC觸達率',
    ccReachTooltip: '有效通話(≥120s)學員 / 有效學員',
    revenue: '業績',
  },
  en: {
    students: 'Active Students',
    studentsTooltip: 'Paid students with valid course credits',
    participationRate: 'Participation',
    participationTooltip: 'Students who brought ≥1 registration / active students',
    registrations: 'Registrations',
    payments: 'Payments',
    checkinRate: 'Check-in Rate',
    checkinTooltip: 'Students who transcoded and shared / active students',
    ccReach: 'CC Reach',
    ccReachTooltip: 'Students with valid calls (≥120s) / active students',
    revenue: 'Revenue',
  },
  th: {
    students: 'นักเรียนที่ใช้งาน',
    studentsTooltip: 'นักเรียนที่ชำระเงินแล้วและมีคอร์สที่ยังใช้งานได้',
    participationRate: 'การมีส่วนร่วม',
    participationTooltip: 'นักเรียนที่นำ≥1 การลงทะเบียน / นักเรียนที่ใช้งาน',
    registrations: 'ลงทะเบียน',
    payments: 'ชำระเงิน',
    checkinRate: 'เช็คอิน',
    checkinTooltip: 'นักเรียนที่แชร์ / นักเรียนที่ใช้งาน',
    ccReach: 'CC เข้าถึง',
    ccReachTooltip: 'นักเรียนที่โทรสำเร็จ (≥120s) / นักเรียนที่ใช้งาน',
    revenue: 'รายได้',
  },
} as const;

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
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] ?? I18N.zh;

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
              {t.students} <BrandDot tooltip={t.studentsTooltip} />
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
            {t.participationRate} <BrandDot tooltip={t.participationTooltip} />
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-primary-token">
            {registrations.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-token mt-0.5">{t.registrations}</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-primary-token">
            {payments.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-token mt-0.5">{t.payments}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-default-token">
        <div className="text-center">
          <div className="text-sm font-semibold text-primary-token">
            {formatRate(checkin_rate ?? 0)}
          </div>
          <div className="text-[10px] text-muted-token mt-0.5">
            {t.checkinRate} <BrandDot tooltip={t.checkinTooltip} />
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-primary-token">
            {formatRate(cc_reach_rate ?? 0)}
          </div>
          <div className="text-[10px] text-muted-token mt-0.5">
            {t.ccReach} <BrandDot tooltip={t.ccReachTooltip} />
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-default-token flex items-baseline justify-end gap-1.5">
        <span className="text-xs text-muted-token">{t.revenue}</span>
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
