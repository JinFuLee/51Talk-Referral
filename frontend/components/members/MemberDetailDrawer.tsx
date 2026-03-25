'use client';

import { useState } from 'react';
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

const FIELD_GROUPS: { title: string; fields: [string, string][] }[] = [
  {
    title: '基本信息',
    fields: [
      ['id', '学员 ID'],
      ['name', '姓名'],
      ['region', '区域'],
      ['country', '国家'],
      ['enclosure', '围场段'],
      ['lifecycle', '生命周期'],
      ['teacher_level', '菲教级别'],
      ['first_paid_date', '首次付费日期'],
    ],
  },
  {
    title: '跟进人员',
    fields: [
      ['cc_name', 'CC 姓名'],
      ['cc_group', 'CC 组别'],
      ['ss_name', 'SS 姓名'],
      ['ss_group', 'SS 组别'],
      ['lp_name', 'LP 姓名'],
      ['lp_group', 'LP 组别'],
      ['cc_last_call_date', 'CC 末次拨打日期'],
    ],
  },
  {
    title: '转介绍漏斗',
    fields: [
      ['registrations', '注册数'],
      ['appointments', '预约数'],
      ['attendance', '出席数'],
      ['payments', '付费数'],
      ['total_revenue_usd', '业绩 (USD)'],
    ],
  },
  {
    title: '活跃度',
    fields: [
      ['checkin_last_month', '上月打卡天数'],
      ['checkin_this_month', '本月打卡天数'],
      ['lesson_consumed_this_month', '本月课耗'],
      ['referral_code_count_this_month', '本月转码次数'],
      ['referral_reward_status', '推荐奖励状态'],
      ['days_until_card_expiry', '次卡距到期天数'],
    ],
  },
];

const FIXED_KEYS = new Set(FIELD_GROUPS.flatMap((g) => g.fields.map(([k]) => k)).concat(['extra']));

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
    // Large integers (IDs etc) — no decimals
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

function ExtraSection({ extra }: { extra: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(extra);

  return (
    <section>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 hover:text-[var(--text-secondary)] transition-colors"
        aria-expanded={expanded}
      >
        <span>完整档案（全部 {entries.length} 列）</span>
        <span className="text-base leading-none">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="rounded-md border border-[var(--border-subtle)] overflow-hidden">
          <table className="w-full text-xs">
            <tbody>
              {entries.map(([key, val], idx) => (
                <tr
                  key={key}
                  className={
                    idx % 2 === 0 ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-muted,#f9fafb)]'
                  }
                >
                  <td
                    className="py-1.5 px-3 text-[var(--text-muted)] w-1/2 align-top break-words"
                    title={key}
                  >
                    {key}
                  </td>
                  <td className="py-1.5 px-3 text-[var(--text-primary)] text-right align-top break-all">
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
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="学员详情"
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div
        className="absolute right-0 top-0 h-full w-[480px] bg-[var(--bg-surface)] shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-[var(--bg-surface)] z-10">
          <h2 className="font-semibold text-[var(--text-primary)]">
            {student ? `学员 #${student.id}` : '学员详情'}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-subtle)] transition-colors"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!student ? (
            <div className="text-center py-8 text-sm text-[var(--text-muted)]">未找到学员信息</div>
          ) : (
            <>
              {FIELD_GROUPS.map((group) => (
                <section key={group.title}>
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                    {group.title}
                  </h3>
                  <dl className="space-y-2">
                    {group.fields.map(([key, label]) => (
                      <div key={key} className="flex items-start justify-between gap-3">
                        <dt className="text-xs text-[var(--text-muted)] shrink-0 w-32">{label}</dt>
                        <dd className="text-sm font-medium text-[var(--text-primary)] text-right break-all">
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
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                      其他字段
                    </h3>
                    <dl className="space-y-2">
                      {remaining.map(([key, val]) => (
                        <div key={key} className="flex items-start justify-between gap-3">
                          <dt
                            className="text-xs text-[var(--text-muted)] shrink-0 w-32 break-words"
                            title={key}
                          >
                            {key}
                          </dt>
                          <dd className="text-xs text-[var(--text-secondary)] text-right break-all">
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
                <ExtraSection extra={student.extra as Record<string, unknown>} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
