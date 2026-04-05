import { useTranslations } from 'next-intl';
import type { ChannelMetrics } from '@/lib/types/channel';
import { formatRate } from '@/lib/utils';
interface ChannelFunnelTableProps {
  channels: ChannelMetrics[];
}

const STAGES = ['registrations', 'appointments', 'attendance', 'payments'] as const;

export function ChannelFunnelTable({ channels }: ChannelFunnelTableProps) {
  const t = useTranslations('ChannelFunnelTable');
  const STAGE_LABELS: Record<(typeof STAGES)[number], string> = {
    registrations: t('stageRegistrations'),
    appointments: t('stageAppointments'),
    attendance: t('stageAttendance'),
    payments: t('stagePayments'),
  };
  if (channels.length === 0) {
    return <p className="text-sm text-muted-token text-center py-6">{t('empty')}</p>;
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
            <th className="py-1.5 px-2 border-0 text-left">{t('colChannel')}</th>
            {STAGES.map((s) => (
              <th key={s} className="py-1.5 px-2 border-0 text-right">
                {STAGE_LABELS[s]}
              </th>
            ))}
            <th className="py-1.5 px-2 border-0 text-right">{t('colRegToAppt')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('colApptToShow')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('colShowToPay')}</th>
          </tr>
        </thead>
        <tbody>
          {channels.map((c) => (
            <tr key={c.channel} className="even:bg-subtle">
              <td className="py-1 px-2 text-xs font-medium text-primary-token">{c.channel}</td>
              {STAGES.map((s) => (
                <td
                  key={s}
                  className="py-1 px-2 text-xs text-right font-mono tabular-nums text-primary-token"
                >
                  {c[s] != null ? c[s]!.toLocaleString() : '—'}
                </td>
              ))}
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-secondary-token">
                {convRate(c.appointments, c.registrations)}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-secondary-token">
                {convRate(c.attendance, c.appointments)}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-secondary-token">
                {convRate(c.payments, c.attendance)}
              </td>
            </tr>
          ))}
          {/* Totals row */}
          <tr className="bg-subtle font-semibold border-t border-subtle-token">
            <td className="py-1 px-2 text-xs text-primary-token">{t('total')}</td>
            {STAGES.map((s) => (
              <td
                key={s}
                className="py-1 px-2 text-xs text-right font-mono tabular-nums text-primary-token"
              >
                {totals[s].toLocaleString()}
              </td>
            ))}
            <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-secondary-token">
              {convRate(totals.appointments, totals.registrations)}
            </td>
            <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-secondary-token">
              {convRate(totals.attendance, totals.appointments)}
            </td>
            <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-secondary-token">
              {convRate(totals.payments, totals.attendance)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
