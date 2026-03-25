'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import type { WarroomTimeline } from '@/lib/types/cross-analysis';

interface ContactTimelineProps {
  stdtId: string;
}

const ROLES = [
  { key: 'cc_connected' as const, label: 'CC' },
  { key: 'ss_connected' as const, label: 'SS' },
  { key: 'lp_connected' as const, label: 'LP' },
];

function DotCell({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center justify-center h-5 w-5">
      <span
        className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
        title={connected ? '已接通' : '未接通'}
      />
    </div>
  );
}

export function ContactTimeline({ stdtId }: ContactTimelineProps) {
  const { data, isLoading, error } = useSWR<WarroomTimeline>(
    `/api/high-potential/${stdtId}/timeline`,
    swrFetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner size="sm" />
        <span className="ml-2 text-xs text-[var(--text-muted)]">加载联系记录...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-4 text-center text-xs text-[var(--text-muted)]">无法加载联系记录</div>
    );
  }

  const logs = data.daily_log.slice(-30);

  return (
    <div className="mt-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3">
      <div className="flex items-center gap-3 mb-2 text-xs text-[var(--text-muted)]">
        <span className="font-medium text-[var(--text-secondary)]">联系时间轴（近30天）</span>
        <span>围场：{data.profile.enclosure}</span>
        <span
          className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium ${
            data.is_high_potential
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {data.is_high_potential ? '高潜学员' : '普通学员'}
        </span>
      </div>

      {/* 日期行 */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${Math.max(logs.length * 28, 200)}px` }}>
          {/* 日期标签 */}
          <div className="flex gap-0.5 mb-1">
            <div className="w-8 shrink-0" />
            {logs.map((d) => (
              <div
                key={d.date}
                className="flex-1 text-center text-[9px] text-[var(--text-muted)] leading-none"
              >
                {d.date.slice(8)}
              </div>
            ))}
          </div>

          {/* CC / SS / LP 接通行 */}
          {ROLES.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-0.5 mb-1">
              <div className="w-8 shrink-0 text-[10px] font-semibold text-[var(--text-secondary)]">
                {label}
              </div>
              {logs.map((d) => (
                <div key={d.date} className="flex-1 flex items-center justify-center">
                  <DotCell connected={d[key]} />
                </div>
              ))}
            </div>
          ))}

          {/* 打卡行 */}
          <div className="flex items-center gap-0.5 mt-1">
            <div className="w-8 shrink-0 text-[10px] font-semibold text-[var(--text-secondary)]">
              卡
            </div>
            {logs.map((d) => (
              <div key={d.date} className="flex-1 flex items-center justify-center">
                <div className="flex items-center justify-center h-5 w-5">
                  <span
                    className={`w-3 h-3 rounded ${
                      d.valid_checkin ? 'bg-navy-300' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    title={d.valid_checkin ? '有效打卡' : '未打卡'}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 图例 */}
          <div className="flex gap-4 mt-2 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
              已接通
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
              未接通
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-navy-300 inline-block" />
              有效打卡
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
