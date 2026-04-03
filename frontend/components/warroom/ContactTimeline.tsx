'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import type { WarroomTimeline } from '@/lib/types/cross-analysis';

const I18N = {
  zh: {
    loading: '加载联系记录...',
    error: '无法加载联系记录',
    title: '联系时间轴（近30天）',
    enclosure: '围场',
    highPotential: '高潜学员',
    normalStudent: '普通学员',
    checkinRowLabel: '卡',
    connected: '已接通',
    notConnected: '未接通',
    validCheckin: '有效打卡',
    notCheckin: '未打卡',
    legendConnected: '已接通',
    legendNotConnected: '未接通',
    legendCheckin: '有效打卡',
  },
  'zh-TW': {
    loading: '載入聯繫記錄...',
    error: '無法載入聯繫記錄',
    title: '聯繫時間軸（近30天）',
    enclosure: '圍場',
    highPotential: '高潛學員',
    normalStudent: '普通學員',
    checkinRowLabel: '卡',
    connected: '已接通',
    notConnected: '未接通',
    validCheckin: '有效打卡',
    notCheckin: '未打卡',
    legendConnected: '已接通',
    legendNotConnected: '未接通',
    legendCheckin: '有效打卡',
  },
  en: {
    loading: 'Loading contact records...',
    error: 'Failed to load contact records',
    title: 'Contact Timeline (Last 30 Days)',
    enclosure: 'Enclosure',
    highPotential: 'High Potential',
    normalStudent: 'Normal',
    checkinRowLabel: 'CKI',
    connected: 'Connected',
    notConnected: 'Not connected',
    validCheckin: 'Valid check-in',
    notCheckin: 'No check-in',
    legendConnected: 'Connected',
    legendNotConnected: 'Not connected',
    legendCheckin: 'Valid check-in',
  },
  th: {
    loading: 'กำลังโหลดบันทึกการติดต่อ...',
    error: 'ไม่สามารถโหลดบันทึกการติดต่อได้',
    title: 'ไทม์ไลน์การติดต่อ (30 วันล่าสุด)',
    enclosure: 'Enclosure',
    highPotential: 'ศักยภาพสูง',
    normalStudent: 'ปกติ',
    checkinRowLabel: 'CKI',
    connected: 'ติดต่อได้',
    notConnected: 'ไม่ได้ติดต่อ',
    validCheckin: 'เช็คอินสำเร็จ',
    notCheckin: 'ไม่ได้เช็คอิน',
    legendConnected: 'ติดต่อได้',
    legendNotConnected: 'ไม่ได้ติดต่อ',
    legendCheckin: 'เช็คอินสำเร็จ',
  },
} as const;

interface ContactTimelineProps {
  stdtId: string;
}

const ROLES = [
  { key: 'cc_connected' as const, label: 'CC' },
  { key: 'ss_connected' as const, label: 'SS' },
  { key: 'lp_connected' as const, label: 'LP' },
];

function DotCell({
  connected,
  labelConnected,
  labelNot,
}: {
  connected: boolean;
  labelConnected: string;
  labelNot: string;
}) {
  return (
    <div className="flex items-center justify-center h-5 w-5">
      <span
        className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
        title={connected ? labelConnected : labelNot}
      />
    </div>
  );
}

export function ContactTimeline({ stdtId }: ContactTimelineProps) {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] ?? I18N.zh;

  const { data, isLoading, error } = useFilteredSWR<WarroomTimeline>(
    `/api/high-potential/${stdtId}/timeline`
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner size="sm" />
        <span className="ml-2 text-xs text-[var(--text-muted)]">{t.loading}</span>
      </div>
    );
  }

  if (error || !data) {
    return <div className="py-4 text-center text-xs text-[var(--text-muted)]">{t.error}</div>;
  }

  const logs = data.daily_log.slice(-30);

  return (
    <div className="mt-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3">
      <div className="flex items-center gap-3 mb-2 text-xs text-[var(--text-muted)]">
        <span className="font-medium text-[var(--text-secondary)]">{t.title}</span>
        <span>
          {t.enclosure}：{data.profile.enclosure}
        </span>
        <span
          className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium ${
            data.is_high_potential
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {data.is_high_potential ? t.highPotential : t.normalStudent}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: `${Math.max(logs.length * 28, 200)}px` }}>
          {/* Date labels */}
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

          {/* CC / SS / LP rows */}
          {ROLES.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-0.5 mb-1">
              <div className="w-8 shrink-0 text-[10px] font-semibold text-[var(--text-secondary)]">
                {label}
              </div>
              {logs.map((d) => (
                <div key={d.date} className="flex-1 flex items-center justify-center">
                  <DotCell
                    connected={d[key]}
                    labelConnected={t.connected}
                    labelNot={t.notConnected}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Check-in row */}
          <div className="flex items-center gap-0.5 mt-1">
            <div className="w-8 shrink-0 text-[10px] font-semibold text-[var(--text-secondary)]">
              {t.checkinRowLabel}
            </div>
            {logs.map((d) => (
              <div key={d.date} className="flex-1 flex items-center justify-center">
                <div className="flex items-center justify-center h-5 w-5">
                  <span
                    className={`w-3 h-3 rounded ${
                      d.valid_checkin ? 'bg-action-accent-muted' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    title={d.valid_checkin ? t.validCheckin : t.notCheckin}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-2 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
              {t.legendConnected}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
              {t.legendNotConnected}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-action-accent-muted inline-block" />
              {t.legendCheckin}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
