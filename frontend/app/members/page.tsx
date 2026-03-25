'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MemberDetailDrawer } from '@/components/members/MemberDetailDrawer';
import type { StudentBrief } from '@/lib/types/member';

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
  const { data, isLoading } = useSWR(`/api/members/${memberId}`, swrFetcher);

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

  return <MemberDetailDrawer student={data ?? null} open={true} onClose={onClose} />;
}

const CONTACT_DAY_OPTIONS = [
  { value: '', label: '全部失联天数' },
  { value: 'le7', label: '≤7天（活跃）' },
  { value: '8to14', label: '8-14天（关注）' },
  { value: 'ge15', label: '15天+（失联）' },
];

const CARD_HEALTH_OPTIONS = [
  { value: '', label: '全部次卡健康度' },
  { value: 'healthy', label: '健康（>30天）' },
  { value: 'watch', label: '关注（15-30天）' },
  { value: 'risk', label: '高风险（≤14天）' },
];

export default function MembersPage() {
  const [page, setPage] = useState(1);
  const [enclosureFilter, setEnclosureFilter] = useState('');
  const [ccFilter, setCcFilter] = useState('');
  const [contactDaysFilter, setContactDaysFilter] = useState('');
  const [cardHealthFilter, setCardHealthFilter] = useState('');
  const [hasReferralFilter, setHasReferralFilter] = useState(false);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  const qs = new URLSearchParams({
    page: String(page),
    size: '20',
    ...(enclosureFilter ? { enclosure: enclosureFilter } : {}),
    ...(ccFilter ? { cc: ccFilter } : {}),
    ...(contactDaysFilter ? { contact_days: contactDaysFilter } : {}),
    ...(cardHealthFilter ? { card_health: cardHealthFilter } : {}),
    ...(hasReferralFilter ? { has_referral: 'true' } : {}),
  });

  const { data, isLoading, error } = useSWR<MembersResponse>(
    `/api/members?${qs.toString()}`,
    swrFetcher
  );

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">学员明细</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          有效学员列表 · 点击行查看 59 字段详情
        </p>
      </div>

      {/* 筛选器 */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="text"
          placeholder="围场筛选（如 0-30）"
          value={enclosureFilter}
          onChange={(e) => {
            setEnclosureFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 w-40"
        />
        <input
          type="text"
          placeholder="CC 筛选"
          value={ccFilter}
          onChange={(e) => {
            setCcFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 w-36"
        />
        <select
          value={contactDaysFilter}
          onChange={(e) => {
            setContactDaysFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-[var(--bg-surface)] text-[var(--text-primary)]"
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
          className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-[var(--bg-surface)] text-[var(--text-primary)]"
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
          仅有带新记录
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
            清除筛选
          </button>
        )}
      </div>

      <Card title={`学员列表${data ? ` (共 ${data.total} 条)` : ''}`}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState title="加载失败" description="请检查后端服务" />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="暂无学员数据" description="上传数据文件后自动刷新，或调整筛选条件" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="slide-thead-row text-xs">
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">ID</th>
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">围场</th>
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">生命周期</th>
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">CC</th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">注册</th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">预约</th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">出席</th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">付费</th>
                    <th
                      className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                      title="本月打卡天数"
                    >
                      打卡天
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                      title="本月课耗"
                    >
                      课耗
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                      title="本月转码次数"
                    >
                      转码
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-left whitespace-nowrap"
                      title="推荐奖励领取状态"
                    >
                      奖励状态
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                      title="次卡距到期天数"
                    >
                      卡到期
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-left whitespace-nowrap"
                      title="CC末次拨打日期"
                    >
                      末次拨打
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
                          ? 'text-red-600 font-semibold'
                          : daysExpiry <= 30
                            ? 'text-orange-500'
                            : 'text-[var(--text-secondary)]';

                    return (
                      <tr
                        key={m.id}
                        onClick={() => setSelectedId(m.id)}
                        className="even:bg-[var(--bg-subtle)] cursor-pointer hover:bg-brand-50 transition-colors"
                      >
                        <td className="py-1 px-2 text-xs text-navy-500 font-medium font-mono tabular-nums whitespace-nowrap">
                          {m.id}
                        </td>
                        <td className="py-1 px-2 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                          {m.enclosure}
                        </td>
                        <td className="py-1 px-2 text-xs whitespace-nowrap">
                          <span className="px-1.5 py-0.5 bg-[var(--bg-subtle)] rounded text-xs">
                            {m.lifecycle}
                          </span>
                        </td>
                        <td className="py-1 px-2 text-xs whitespace-nowrap">{m.cc_name}</td>
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
                        <td className="py-1 px-2 text-xs whitespace-nowrap text-[var(--text-secondary)]">
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
                第 {page} / {totalPages} 页
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-sm disabled:opacity-40 hover:bg-[var(--bg-subtle)]"
                >
                  上一页
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-sm disabled:opacity-40 hover:bg-[var(--bg-subtle)]"
                >
                  下一页
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
