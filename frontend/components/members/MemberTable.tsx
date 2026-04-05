'use client';

import { useTranslations } from 'next-intl';
import type { StudentBrief } from '@/lib/types/member';
interface MemberTableProps {
  items: StudentBrief[];
  total: number;
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onRowClick?: (id: string | number) => void;
}

export function MemberTable({
  items,
  total,
  page,
  pageSize = 20,
  onPageChange,
  onRowClick,
}: MemberTableProps) {
  const t = useTranslations('MemberTable');
  const totalPages = Math.ceil(total / pageSize);

  if (items.length === 0) {
    return <div className="text-center py-8 text-sm text-muted-token">{t('noData')}</div>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row text-xs">
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">{t('colId')}</th>
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">{t('colName')}</th>
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">{t('colEnclosure')}</th>
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">{t('colLifecycle')}</th>
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap min-w-[100px]">
                {t('colCC')}
              </th>
              <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">{t('colReg')}</th>
              <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">{t('colAppt')}</th>
              <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">{t('colAttend')}</th>
              <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">{t('colPaid')}</th>
              <th
                className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                title={t('colCheckinTitle')}
              >
                {t('colCheckin')}
              </th>
              <th
                className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                title={t('colLessonTitle')}
              >
                {t('colLesson')}
              </th>
              <th
                className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                title={t('colCodeTitle')}
              >
                {t('colCode')}
              </th>
              <th
                className="py-1.5 px-2 border-0 text-left whitespace-nowrap"
                title={t('colRewardTitle')}
              >
                {t('colReward')}
              </th>
              <th
                className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                title={t('colExpiryTitle')}
              >
                {t('colExpiry')}
              </th>
              <th
                className="py-1.5 px-2 border-0 text-left whitespace-nowrap"
                title={t('colLastCallTitle')}
              >
                {t('colLastCall')}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => {
              const daysExpiry = m.days_until_card_expiry;
              const expiryColor =
                daysExpiry === null || daysExpiry === undefined
                  ? ''
                  : daysExpiry <= 0
                    ? 'text-danger-token font-semibold'
                    : daysExpiry <= 30
                      ? 'text-orange-500'
                      : 'text-secondary-token';

              return (
                <tr
                  key={m.id}
                  onClick={() => onRowClick?.(m.id)}
                  className={`even:bg-subtle transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-subtle' : ''
                  }`}
                >
                  <td className="py-1 px-2 text-xs text-action-accent font-medium tabular-nums whitespace-nowrap">
                    {m.id}
                  </td>
                  <td className="py-1 px-2 text-xs whitespace-nowrap">{m.name || '—'}</td>
                  <td className="py-1 px-2 text-xs text-secondary-token whitespace-nowrap">
                    {m.enclosure}
                  </td>
                  <td className="py-1 px-2 text-xs whitespace-nowrap">
                    <span className="px-1.5 py-0.5 bg-subtle rounded text-xs text-secondary-token">
                      {m.lifecycle}
                    </span>
                  </td>
                  <td
                    className="py-1 px-2 text-xs whitespace-nowrap min-w-[100px]"
                    title={m.cc_name ?? ''}
                  >
                    <span className="truncate block max-w-[140px]">{m.cc_name}</span>
                  </td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                    {m.registrations ?? '—'}
                  </td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                    {m.appointments ?? '—'}
                  </td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                    {m.attendance ?? '—'}
                  </td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums font-medium">
                    {m.payments ?? '—'}
                  </td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                    {m.checkin_this_month ?? '—'}
                  </td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                    {m.lesson_consumed_this_month ?? '—'}
                  </td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                    {m.referral_code_count_this_month ?? '—'}
                  </td>
                  <td
                    className="py-1 px-2 text-xs whitespace-nowrap max-w-[120px] truncate"
                    title={m.referral_reward_status ?? ''}
                  >
                    {m.referral_reward_status || '—'}
                  </td>
                  <td
                    className={`py-1 px-2 text-xs text-right font-mono tabular-nums ${expiryColor}`}
                  >
                    {daysExpiry === null || daysExpiry === undefined
                      ? '—'
                      : daysExpiry <= -9000
                        ? '—'
                        : String(Math.round(daysExpiry))}
                  </td>
                  <td className="py-1 px-2 text-xs whitespace-nowrap text-secondary-token">
                    {m.cc_last_call_date || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-subtle-token">
        <span className="text-xs text-muted-token">{t('pagination', { page: page, totalPages, total })}</span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-subtle-token text-sm disabled:opacity-40 hover:bg-subtle transition-colors"
          >
            {t('prevPage')}
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-subtle-token text-sm disabled:opacity-40 hover:bg-subtle transition-colors"
          >
            {t('nextPage')}
          </button>
        </div>
      </div>
    </>
  );
}
