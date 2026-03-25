'use client';

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
  const totalPages = Math.ceil(total / pageSize);

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-[var(--text-muted)]">
        暂无学员数据，上传数据文件后自动刷新或调整筛选条件
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row text-xs">
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">ID</th>
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">姓名</th>
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">围场</th>
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">生命周期</th>
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap min-w-[100px]">CC</th>
              <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">注册</th>
              <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">预约</th>
              <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">出席</th>
              <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">付费</th>
              <th
                className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                title="本月打卡天数（转介绍活跃度）"
              >
                打卡天
              </th>
              <th
                className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                title="本月课耗（学员活跃度）"
              >
                课耗
              </th>
              <th
                className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                title="本月转码次数（分享活跃度）"
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
                title="次卡距到期天数（流失风险）"
              >
                卡到期
              </th>
              <th
                className="py-1.5 px-2 border-0 text-left whitespace-nowrap"
                title="CC末次拨打日期（触达及时性）"
              >
                末次拨打
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
                    ? 'text-red-600 font-semibold'
                    : daysExpiry <= 30
                      ? 'text-orange-500'
                      : 'text-[var(--text-secondary)]';

              return (
                <tr
                  key={m.id}
                  onClick={() => onRowClick?.(m.id)}
                  className={`even:bg-[var(--bg-subtle)] transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-[var(--bg-subtle)]' : ''
                  }`}
                >
                  <td className="py-1 px-2 text-xs text-action-accent font-medium tabular-nums whitespace-nowrap">
                    {m.id}
                  </td>
                  <td className="py-1 px-2 text-xs whitespace-nowrap">{m.name || '—'}</td>
                  <td className="py-1 px-2 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                    {m.enclosure}
                  </td>
                  <td className="py-1 px-2 text-xs whitespace-nowrap">
                    <span className="px-1.5 py-0.5 bg-[var(--bg-subtle)] rounded text-xs text-[var(--text-secondary)]">
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
                  <td className="py-1 px-2 text-xs whitespace-nowrap text-[var(--text-secondary)]">
                    {m.cc_last_call_date || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
        <span className="text-xs text-[var(--text-muted)]">
          第 {page} / {totalPages} 页，共 {total} 条
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-sm disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            上一页
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-sm disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            下一页
          </button>
        </div>
      </div>
    </>
  );
}
