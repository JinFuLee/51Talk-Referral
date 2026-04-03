import type { ChannelMetrics } from '@/lib/types/channel';
import { formatRate } from '@/lib/utils';

const I18N = {
  zh: {
    empty: '暂无渠道漏斗数据',
    colChannel: '渠道',
    stageRegistrations: '注册',
    stageAppointments: '预约',
    stageAttendance: '出席',
    stagePayments: '付费',
    colRegToAppt: '注→预',
    colApptToShow: '预→出',
    colShowToPay: '出→付',
    total: '合计',
  },
  'zh-TW': {
    empty: '暫無渠道漏斗資料',
    colChannel: '渠道',
    stageRegistrations: '註冊',
    stageAppointments: '預約',
    stageAttendance: '出席',
    stagePayments: '付費',
    colRegToAppt: '註→預',
    colApptToShow: '預→出',
    colShowToPay: '出→付',
    total: '合計',
  },
  en: {
    empty: 'No channel funnel data',
    colChannel: 'Channel',
    stageRegistrations: 'Reg',
    stageAppointments: 'Appt',
    stageAttendance: 'Attend',
    stagePayments: 'Pay',
    colRegToAppt: 'Reg→Appt',
    colApptToShow: 'Appt→Show',
    colShowToPay: 'Show→Pay',
    total: 'Total',
  },
  th: {
    empty: 'ไม่มีข้อมูล Funnel ตามช่องทาง',
    colChannel: 'ช่องทาง',
    stageRegistrations: 'ลงทะเบียน',
    stageAppointments: 'นัดหมาย',
    stageAttendance: 'เข้าร่วม',
    stagePayments: 'ชำระเงิน',
    colRegToAppt: 'ลง→นัด',
    colApptToShow: 'นัด→เข้า',
    colShowToPay: 'เข้า→ชำระ',
    total: 'รวม',
  },
} as const;

interface ChannelFunnelTableProps {
  channels: ChannelMetrics[];
  locale?: string;
}

const STAGES = ['registrations', 'appointments', 'attendance', 'payments'] as const;

export function ChannelFunnelTable({ channels, locale = 'zh' }: ChannelFunnelTableProps) {
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const STAGE_LABELS: Record<(typeof STAGES)[number], string> = {
    registrations: t.stageRegistrations,
    appointments: t.stageAppointments,
    attendance: t.stageAttendance,
    payments: t.stagePayments,
  };
  if (channels.length === 0) {
    return <p className="text-sm text-[var(--text-muted)] text-center py-6">{t.empty}</p>;
  }

  // Compute totals row (null-safe)
  const totals = STAGES.reduce(
    (acc, key) => {
      acc[key] = channels.reduce((sum, c) => sum + (c[key] ?? 0), 0);
      return acc;
    },
    {} as Record<(typeof STAGES)[number], number>
  );

  function convRate(numerator: number | null | undefined, denominator: number | null | undefined) {
    const n = numerator ?? 0;
    const d = denominator ?? 0;
    if (d === 0) return '—';
    return formatRate(n / d);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="slide-thead-row text-xs">
            <th className="py-1.5 px-2 border-0 text-left">{t.colChannel}</th>
            {STAGES.map((s) => (
              <th key={s} className="py-1.5 px-2 border-0 text-right">
                {STAGE_LABELS[s]}
              </th>
            ))}
            <th className="py-1.5 px-2 border-0 text-right">{t.colRegToAppt}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t.colApptToShow}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t.colShowToPay}</th>
          </tr>
        </thead>
        <tbody>
          {channels.map((c) => (
            <tr key={c.channel} className="even:bg-[var(--bg-subtle)]">
              <td className="py-1 px-2 text-xs font-medium text-[var(--text-primary)]">
                {c.channel}
              </td>
              {STAGES.map((s) => (
                <td
                  key={s}
                  className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-primary)]"
                >
                  {c[s] != null ? c[s]!.toLocaleString() : '—'}
                </td>
              ))}
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                {convRate(c.appointments, c.registrations)}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                {convRate(c.attendance, c.appointments)}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                {convRate(c.payments, c.attendance)}
              </td>
            </tr>
          ))}
          {/* Totals row */}
          <tr className="bg-[var(--bg-subtle)] font-semibold border-t border-[var(--border-subtle)]">
            <td className="py-1 px-2 text-xs text-[var(--text-primary)]">{t.total}</td>
            {STAGES.map((s) => (
              <td
                key={s}
                className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-primary)]"
              >
                {totals[s].toLocaleString()}
              </td>
            ))}
            <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
              {convRate(totals.appointments, totals.registrations)}
            </td>
            <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
              {convRate(totals.attendance, totals.appointments)}
            </td>
            <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
              {convRate(totals.payments, totals.attendance)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
