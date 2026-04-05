'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatRate } from '@/lib/utils';
interface StudentDetail {
  id: string | number;
  name?: string;
  enclosure?: string;
  lifecycle?: string;
  cc_name?: string;
  cc_group?: string;
  ss_name?: string;
  ss_group?: string;
  lp_name?: string;
  lp_group?: string;
  registrations?: number;
  appointments?: number;
  attendance?: number;
  payments?: number;
  total_revenue_usd?: number;
  revenue_usd?: number;
  checkin_this_month?: number;
  lesson_consumed_this_month?: number;
  referral_code_count_this_month?: number;
  referral_reward_status?: string;
  days_until_card_expiry?: number;
  cc_last_call_date?: string | null;
  region?: string;
  business_line?: string;
  country?: string;
  teacher_level?: string | number;
  first_paid_date?: string;
  checkin_last_month?: number;
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

interface MemberDetailDrawerProps {
  student: StudentDetail | null;
  open: boolean;
  onClose: () => void;
}

type FieldGroupKey = '基本信息' | '跟进人员' | '转介绍漏斗' | '活跃度';

const FIELD_GROUP_DEFS: {
  titleKey: FieldGroupKey;
  fields: [string, string][];
}[] = [
  {
    titleKey: '基本信息',
    fields: [
      ['id', 'id'],
      ['name', 'name'],
      ['region', 'region'],
      ['country', 'country'],
      ['enclosure', 'enclosure'],
      ['lifecycle', 'lifecycle'],
      ['teacher_level', 'teacher_level'],
      ['first_paid_date', 'first_paid_date'],
    ],
  },
  {
    titleKey: '跟进人员',
    fields: [
      ['cc_name', 'cc_name'],
      ['cc_group', 'cc_group'],
      ['ss_name', 'ss_name'],
      ['ss_group', 'ss_group'],
      ['lp_name', 'lp_name'],
      ['lp_group', 'lp_group'],
      ['cc_last_call_date', 'cc_last_call_date'],
    ],
  },
  {
    titleKey: '转介绍漏斗',
    fields: [
      ['registrations', 'registrations'],
      ['appointments', 'appointments'],
      ['attendance', 'attendance'],
      ['payments', 'payments'],
      ['total_revenue_usd', 'total_revenue_usd'],
    ],
  },
  {
    titleKey: '活跃度',
    fields: [
      ['checkin_last_month', 'checkin_last_month'],
      ['checkin_this_month', 'checkin_this_month'],
      ['lesson_consumed_this_month', 'lesson_consumed_this_month'],
      ['referral_code_count_this_month', 'referral_code_count_this_month'],
      ['referral_reward_status', 'referral_reward_status'],
      ['days_until_card_expiry', 'days_until_card_expiry'],
    ],
  },
];

const FIXED_KEYS = new Set(
  FIELD_GROUP_DEFS.flatMap((g) => g.fields.map(([k]) => k)).concat(['extra'])
);

function isRateKey(key: string): boolean {
  const ratePatterns = ['rate', 'ratio', '率', '比', '系数'];
  return ratePatterns.some((p) => key.toLowerCase().includes(p));
}

function isRevenueKey(key: string): boolean {
  const revenuePatterns = ['revenue', 'usd', '金额', '付费金额'];
  return revenuePatterns.some((p) => key.toLowerCase().includes(p));
}

function formatRawValue(key: string, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'number') {
    if (isNaN(value)) return '—';
    if (isRevenueKey(key)) {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (isRateKey(key)) {
      return formatRate(value);
    }
    if (Number.isInteger(value) || Math.abs(value) >= 1000) {
      return value.toLocaleString();
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(value);
}

function formatValue(key: string, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if ((key === 'total_revenue_usd' || key === 'revenue_usd') && typeof value === 'number') {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return String(value);
}

function ExtraSection({
  extra,
  t,
}: {
  extra: Record<string, unknown>;
  t: (key: string, params?: any) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(extra);

  return (
    <section>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-xs font-semibold text-muted-token uppercase tracking-wider mb-2 hover:text-secondary-token transition-colors"
        aria-expanded={expanded}
      >
        <span>
          {t('fullArchive')}
          {entries.length}
          {t('fullArchiveSuffix')}
        </span>
        <span className="text-base leading-none">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="rounded-md border border-subtle-token overflow-x-auto">
          <table className="w-full text-xs">
            <tbody>
              {entries.map(([key, val], idx) => (
                <tr key={key} className={idx % 2 === 0 ? 'bg-surface' : 'bg-muted-token'}>
                  <td
                    className="py-1.5 px-3 text-muted-token w-1/2 align-top break-words"
                    title={key}
                  >
                    {key}
                  </td>
                  <td className="py-1.5 px-3 text-primary-token text-right align-top break-all">
                    {formatRawValue(key, val)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function MemberDetailDrawer({ student, open, onClose }: MemberDetailDrawerProps) {
  const t = useTranslations('MemberDetailDrawer');

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('drawerLabel')}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div
        className="absolute right-0 top-0 h-full w-[480px] bg-surface shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-surface z-10">
          <h2 className="font-semibold text-primary-token">
            {student ? `${t('titlePrefix')}${student.id}` : t('titleFallback')}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-token hover:text-secondary-token text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-subtle transition-colors"
            aria-label={t('close')}
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!student ? (
            <div className="text-center py-8 text-sm text-muted-token">{t('notFound')}</div>
          ) : (
            <>
              {FIELD_GROUP_DEFS.map((group) => (
                <section key={group.titleKey}>
                  <h3 className="text-xs font-semibold text-muted-token uppercase tracking-wider mb-3">
                    {t(`groups.${group.titleKey}`)}
                  </h3>
                  <dl className="space-y-2">
                    {group.fields.map(([key, fieldKey]) => (
                      <div key={key} className="flex items-start justify-between gap-3">
                        <dt className="text-xs text-muted-token shrink-0 w-32">
                          {t(`fields.${fieldKey}`)}
                        </dt>
                        <dd className="text-sm font-medium text-primary-token text-right break-all">
                          {formatValue(key, student[key])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}

              {/* Top-level fields not in any group and not extra */}
              {(() => {
                const remaining = Object.entries(student).filter(([key]) => !FIXED_KEYS.has(key));
                return remaining.length > 0 ? (
                  <section>
                    <h3 className="text-xs font-semibold text-muted-token uppercase tracking-wider mb-3">
                      {t('otherFields')}
                    </h3>
                    <dl className="space-y-2">
                      {remaining.map(([key, val]) => (
                        <div key={key} className="flex items-start justify-between gap-3">
                          <dt
                            className="text-xs text-muted-token shrink-0 w-32 break-words"
                            title={key}
                          >
                            {key}
                          </dt>
                          <dd className="text-xs text-secondary-token text-right break-all">
                            {formatRawValue(key, val)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ) : null;
              })()}

              {/* Full archive from extra — all original D4 columns */}
              {student.extra && Object.keys(student.extra).length > 0 && (
                <ExtraSection extra={student.extra as Record<string, unknown>} t={t} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
