'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MemberDetailDrawer } from '@/components/members/MemberDetailDrawer';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';
import type { StudentBrief } from '@/lib/types/member';
import { BrandDot } from '@/components/ui/BrandDot';

interface MembersResponse {
  items: StudentBrief[];
  total: number;
  page: number;
  size: number;
}

function DetailDrawerWrapper({
  memberId,
  onClose,
}: {
  memberId: string | number;
  onClose: () => void;
}) {
  const { data, isLoading } = useFilteredSWR<Record<string, unknown>>(`/api/members/${memberId}`);

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={onClose}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <MemberDetailDrawer
      student={(data as Record<string, unknown> & { id: string }) ?? null}
      open={true}
      onClose={onClose}
    />
  );
}

// Options are built dynamically using t inside the component

export default function MembersPage() {
  usePageDimensions({ country: true, dataRole: true, enclosure: true, team: true });
  const locale = useLocale();
  const t = useTranslations('members');

  const CONTACT_DAY_OPTIONS = [
    { value: '', label: t('filterContactAll') },
    { value: 'le7', label: t('filterContactLe7') },
    { value: '8to14', label: t('filterContact8to14') },
    { value: 'ge15', label: t('filterContactGe15') },
  ];

  const CARD_HEALTH_OPTIONS = [
    { value: '', label: t('filterCardAll') },
    { value: 'healthy', label: t('filterCardHealthy') },
    { value: 'watch', label: t('filterCardWatch') },
    { value: 'risk', label: t('filterCardRisk') },
  ];

  const [page, setPage] = useState(1);
  const [enclosureFilter, setEnclosureFilter] = useState('');
  const [ccFilter, setCcFilter] = useState('');
  const [contactDaysFilter, setContactDaysFilter] = useState('');
  const [cardHealthFilter, setCardHealthFilter] = useState('');
  const [hasReferralFilter, setHasReferralFilter] = useState(false);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const { exportCSV } = useExport();

  const qs = new URLSearchParams({
    page: String(page),
    size: '20',
    ...(enclosureFilter ? { enclosure: enclosureFilter } : {}),
    ...(ccFilter ? { cc: ccFilter } : {}),
    ...(contactDaysFilter ? { contact_days: contactDaysFilter } : {}),
    ...(cardHealthFilter ? { card_health: cardHealthFilter } : {}),
    ...(hasReferralFilter ? { has_referral: 'true' } : {}),
  });

  const { data, isLoading, error, mutate } = useFilteredSWR<MembersResponse>(
    `/api/members?${qs.toString()}`
  );

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  function handleExport() {
    const items = data?.items ?? [];
    const today = new Date().toISOString().slice(0, 10);
    exportCSV(
      items as unknown as Record<string, unknown>[],
      [
        { key: 'id', label: t('exportId') },
        { key: 'enclosure', label: t('exportEnclosure') },
        { key: 'lifecycle', label: t('exportLifecycle') },
        { key: 'cc_name', label: t('exportCC') },
        { key: 'registrations', label: t('exportReg') },
        { key: 'appointments', label: t('exportAppt') },
        { key: 'attendance', label: t('exportAttend') },
        { key: 'payments', label: t('exportPay') },
        { key: 'checkin_this_month', label: t('exportCheckin') },
        { key: 'lesson_consumed_this_month', label: t('exportLesson') },
        { key: 'referral_code_count_this_month', label: t('exportCoding') },
        { key: 'referral_reward_status', label: t('exportReward') },
        { key: 'days_until_card_expiry', label: t('exportExpiry') },
        { key: 'cc_last_call_date', label: t('exportLastCall') },
      ],
      `学员明细_${today}`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">{t('pageTitle')}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t('pageSubtitle')}</p>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{t('pageDesc')}</p>
        </div>
        <ExportButton onExportCsv={handleExport} />
      </div>

      {/* 筛选器 */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="text"
          placeholder={t('filterEnclosure')}
          value={enclosureFilter}
          onChange={(e) => {
            setEnclosureFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-action w-40"
        />
        <input
          type="text"
          placeholder={t('filterCC')}
          value={ccFilter}
          onChange={(e) => {
            setCcFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-action w-36"
        />
        <select
          value={contactDaysFilter}
          onChange={(e) => {
            setContactDaysFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-action bg-[var(--bg-surface)] text-[var(--text-primary)]"
        >
          {CONTACT_DAY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={cardHealthFilter}
          onChange={(e) => {
            setCardHealthFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-action bg-[var(--bg-surface)] text-[var(--text-primary)]"
        >
          {CARD_HEALTH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasReferralFilter}
            onChange={(e) => {
              setHasReferralFilter(e.target.checked);
              setPage(1);
            }}
            className="w-3.5 h-3.5"
          />
          {t('filterHasReferral')}
        </label>
        {(enclosureFilter ||
          ccFilter ||
          contactDaysFilter ||
          cardHealthFilter ||
          hasReferralFilter) && (
          <button
            onClick={() => {
              setEnclosureFilter('');
              setCcFilter('');
              setContactDaysFilter('');
              setCardHealthFilter('');
              setHasReferralFilter(false);
              setPage(1);
            }}
            className="px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {t('clearFilter')}
          </button>
        )}
      </div>

      <Card
        title={`${t('cardTitle')}${data ? ` (${t('cardTitleTotal')} ${data.total} ${t('cardTitleSuffix')})` : ''}`}
      >
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState
            title={t('loadFailed')}
            description={t('loadFailedDesc')}
            action={{ label: t('retry'), onClick: () => mutate() }}
          />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="slide-thead-row text-xs">
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">
                      {t('colId')}
                    </th>
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">
                      {t('colEnclosure')} <BrandDot tooltip={t('enclosureTooltip')} />
                    </th>
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">
                      {t('colLifecycle')}
                    </th>
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">
                      {t('colCC')}
                    </th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">
                      {t('colReg')} <BrandDot tooltip={t('regTooltip')} />
                    </th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">
                      {t('colAppt')}
                    </th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">
                      {t('colAttend')}
                    </th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">
                      {t('colPay')} <BrandDot tooltip={t('payTooltip')} />
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                      title={t('checkinTitle')}
                    >
                      {t('colCheckin')}
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                      title={t('lessonTitle')}
                    >
                      {t('colLesson')}
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                      title={t('codingTitle')}
                    >
                      {t('colCoding')}
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-left whitespace-nowrap"
                      title={t('rewardTitle')}
                    >
                      {t('colReward')}
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                      title={t('expiryTitle')}
                    >
                      {t('colExpiry')}
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-left whitespace-nowrap"
                      title={t('lastCallTitle')}
                    >
                      {t('colLastCall')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((m) => {
                    const daysExpiry = m.days_until_card_expiry;
                    const expiryColor =
                      daysExpiry === null || daysExpiry === undefined
                        ? ''
                        : daysExpiry <= 0
                          ? 'text-[var(--color-danger)] font-semibold'
                          : daysExpiry <= 30
                            ? 'text-orange-500'
                            : 'text-[var(--text-secondary)]';

                    return (
                      <tr
                        key={m.id}
                        onClick={() => setSelectedId(m.id)}
                        className="even:bg-[var(--bg-subtle)] cursor-pointer hover:bg-action-surface transition-colors"
                      >
                        <td className="py-2 px-2 text-xs text-action-accent font-medium font-mono tabular-nums whitespace-nowrap">
                          {m.id}
                        </td>
                        <td className="py-2 px-2 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                          {m.enclosure}
                        </td>
                        <td className="py-2 px-2 text-xs whitespace-nowrap">
                          <span className="px-1.5 py-0.5 bg-[var(--bg-subtle)] rounded text-xs">
                            {m.lifecycle}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-xs whitespace-nowrap">{m.cc_name}</td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                          {m.registrations ?? '—'}
                        </td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                          {m.appointments ?? '—'}
                        </td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                          {m.attendance ?? '—'}
                        </td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums font-medium">
                          {m.payments ?? '—'}
                        </td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                          {m.checkin_this_month ?? '—'}
                        </td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                          {m.lesson_consumed_this_month ?? '—'}
                        </td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                          {m.referral_code_count_this_month ?? '—'}
                        </td>
                        <td
                          className="py-2 px-2 text-xs whitespace-nowrap max-w-[120px] truncate"
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
                        <td className="py-2 px-2 text-xs whitespace-nowrap text-[var(--text-secondary)]">
                          {m.cc_last_call_date || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-muted)]">
                {t('pageLabel')} {page} {t('pageMid')} {totalPages} {t('pageSuffix')}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-sm disabled:opacity-40 hover:bg-[var(--bg-subtle)]"
                >
                  {t('prevPage')}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-sm disabled:opacity-40 hover:bg-[var(--bg-subtle)]"
                >
                  {t('nextPage')}
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* 详情抽屉 — 使用 MemberDetailDrawer 展示全部 59 字段 */}
      {selectedId !== null && (
        <DetailDrawerWrapper memberId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
