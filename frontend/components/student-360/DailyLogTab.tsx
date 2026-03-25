'use client';

import type { Student360DailyLog } from '@/lib/types/cross-analysis';

interface DailyLogTabProps {
  logs: Student360DailyLog[];
}

function Cell({ active, title }: { active: boolean; title: string }) {
  return (
    <div
      title={title}
      className={`w-5 h-5 rounded-sm ${
        active ? 'bg-green-500' : 'bg-[var(--bg-subtle)] border border-[var(--border-subtle)]'
      }`}
    />
  );
}

export function DailyLogTab({ logs }: DailyLogTabProps) {
  if (!logs || logs.length === 0) {
    return <div className="py-8 text-center text-sm text-[var(--text-muted)]">暂无日报记录</div>;
  }

  // 取最近 30 天
  const recent = logs.slice(-30);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> 有接通/打卡
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-[var(--bg-subtle)] border border-[var(--border-subtle)] inline-block" />{' '}
          无
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              <th className="text-left pr-3 py-1.5 whitespace-nowrap w-20">日期</th>
              <th className="px-1 py-1.5">CC</th>
              <th className="px-1 py-1.5">SS</th>
              <th className="px-1 py-1.5">LP</th>
              <th className="px-1 py-1.5">打卡</th>
              <th className="px-2 py-1.5 text-right">注册</th>
              <th className="px-2 py-1.5 text-right">出席</th>
              <th className="px-2 py-1.5 text-right">付费</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((log) => (
              <tr key={log.date} className="hover:bg-[var(--bg-subtle)]">
                <td className="pr-3 py-0.5 text-[var(--text-secondary)] whitespace-nowrap font-mono">
                  {log.date}
                </td>
                <td className="px-1 py-0.5">
                  <Cell
                    active={log.cc_connected}
                    title={log.cc_connected ? 'CC已接通' : 'CC未接通'}
                  />
                </td>
                <td className="px-1 py-0.5">
                  <Cell
                    active={log.ss_connected}
                    title={log.ss_connected ? 'SS已接通' : 'SS未接通'}
                  />
                </td>
                <td className="px-1 py-0.5">
                  <Cell
                    active={log.lp_connected}
                    title={log.lp_connected ? 'LP已接通' : 'LP未接通'}
                  />
                </td>
                <td className="px-1 py-0.5">
                  <Cell
                    active={log.valid_checkin}
                    title={log.valid_checkin ? '已打卡' : '未打卡'}
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
