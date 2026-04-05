'use client';

import { useTranslations } from 'next-intl';
import type { Student360DailyLog } from '@/lib/types/cross-analysis';
interface DailyLogTabProps {
  logs: Student360DailyLog[];
}

function Cell({ active, title }: { active: boolean; title: string }) {
  return (
    <div
      title={title}
      className={`w-5 h-5 rounded-sm ${
        active ? 'bg-success-token' : 'bg-subtle border border-subtle-token'
      }`}
    />
  );
}

export function DailyLogTab({ logs }: DailyLogTabProps) {
  const t = useTranslations('DailyLogTab');

  if (!logs || logs.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-token">{t('noData')}</div>;
  }

  // 取最近 30 天
  const recent = logs.slice(-30);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs text-secondary-token">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-success-token inline-block" /> {t('hasActivity')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-subtle border border-subtle-token inline-block" />{' '}
          {t('noActivity')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="bg-subtle text-xs font-semibold text-muted-token uppercase tracking-wider">
              <th className="text-left pr-3 py-1.5 whitespace-nowrap w-20">{t('date')}</th>
              <th className="px-1 py-1.5">CC</th>
              <th className="px-1 py-1.5">SS</th>
              <th className="px-1 py-1.5">LP</th>
              <th className="px-1 py-1.5">{t('checkin')}</th>
              <th className="px-2 py-1.5 text-right">{t('reg')}</th>
              <th className="px-2 py-1.5 text-right">{t('attend')}</th>
              <th className="px-2 py-1.5 text-right">{t('paid')}</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((log) => (
              <tr key={log.date} className="hover:bg-subtle">
                <td className="pr-3 py-0.5 text-secondary-token whitespace-nowrap font-mono">
                  {log.date}
                </td>
                <td className="px-1 py-0.5">
                  <Cell
                    active={log.cc_connected}
                    title={log.cc_connected ? t('ccConnected') : t('ccNotConnected')}
                  />
                </td>
                <td className="px-1 py-0.5">
                  <Cell
                    active={log.ss_connected}
                    title={log.ss_connected ? t('ssConnected') : t('ssNotConnected')}
                  />
                </td>
                <td className="px-1 py-0.5">
                  <Cell
                    active={log.lp_connected}
                    title={log.lp_connected ? t('lpConnected') : t('lpNotConnected')}
                  />
                </td>
                <td className="px-1 py-0.5">
                  <Cell
                    active={log.valid_checkin}
                    title={log.valid_checkin ? t('checkinDone') : t('checkinNone')}
                  />
                </td>
                <td className="px-2 py-0.5 text-right font-mono tabular-nums">
                  {log.new_reg || '—'}
                </td>
                <td className="px-2 py-0.5 text-right font-mono tabular-nums">
                  {log.new_attend || '—'}
                </td>
                <td className="px-2 py-0.5 text-right font-mono tabular-nums">
                  {log.new_paid || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
