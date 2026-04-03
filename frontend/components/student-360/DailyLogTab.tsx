'use client';

import { useLocale } from 'next-intl';
import type { Student360DailyLog } from '@/lib/types/cross-analysis';

const I18N = {
  zh: {
    noData: '暂无日报记录',
    hasActivity: '有接通/打卡',
    noActivity: '无',
    date: '日期',
    checkin: '打卡',
    reg: '注册',
    attend: '出席',
    paid: '付费',
    ccConnected: 'CC已接通',
    ccNotConnected: 'CC未接通',
    ssConnected: 'SS已接通',
    ssNotConnected: 'SS未接通',
    lpConnected: 'LP已接通',
    lpNotConnected: 'LP未接通',
    checkinDone: '已打卡',
    checkinNone: '未打卡',
  },
  'zh-TW': {
    noData: '暫無日報記錄',
    hasActivity: '有接通/打卡',
    noActivity: '無',
    date: '日期',
    checkin: '打卡',
    reg: '注冊',
    attend: '出席',
    paid: '付費',
    ccConnected: 'CC已接通',
    ccNotConnected: 'CC未接通',
    ssConnected: 'SS已接通',
    ssNotConnected: 'SS未接通',
    lpConnected: 'LP已接通',
    lpNotConnected: 'LP未接通',
    checkinDone: '已打卡',
    checkinNone: '未打卡',
  },
  en: {
    noData: 'No daily log records',
    hasActivity: 'Connected/Checked-in',
    noActivity: 'None',
    date: 'Date',
    checkin: 'Check-in',
    reg: 'Reg',
    attend: 'Attend',
    paid: 'Paid',
    ccConnected: 'CC Connected',
    ccNotConnected: 'CC Not Connected',
    ssConnected: 'SS Connected',
    ssNotConnected: 'SS Not Connected',
    lpConnected: 'LP Connected',
    lpNotConnected: 'LP Not Connected',
    checkinDone: 'Checked In',
    checkinNone: 'Not Checked In',
  },
  th: {
    noData: 'ไม่มีบันทึกรายวัน',
    hasActivity: 'มีการติดต่อ/เช็คอิน',
    noActivity: 'ไม่มี',
    date: 'วันที่',
    checkin: 'เช็คอิน',
    reg: 'ลงทะเบียน',
    attend: 'เข้าร่วม',
    paid: 'ชำระ',
    ccConnected: 'CC ติดต่อได้',
    ccNotConnected: 'CC ติดต่อไม่ได้',
    ssConnected: 'SS ติดต่อได้',
    ssNotConnected: 'SS ติดต่อไม่ได้',
    lpConnected: 'LP ติดต่อได้',
    lpNotConnected: 'LP ติดต่อไม่ได้',
    checkinDone: 'เช็คอินแล้ว',
    checkinNone: 'ยังไม่เช็คอิน',
  },
} as const;

type Locale = keyof typeof I18N;

function useT() {
  const locale = useLocale();
  return I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];
}

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
  const t = useT();

  if (!logs || logs.length === 0) {
    return <div className="py-8 text-center text-sm text-[var(--text-muted)]">{t.noData}</div>;
  }

  // 取最近 30 天
  const recent = logs.slice(-30);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> {t.hasActivity}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-[var(--bg-subtle)] border border-[var(--border-subtle)] inline-block" />{' '}
          {t.noActivity}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              <th className="text-left pr-3 py-1.5 whitespace-nowrap w-20">{t.date}</th>
              <th className="px-1 py-1.5">CC</th>
              <th className="px-1 py-1.5">SS</th>
              <th className="px-1 py-1.5">LP</th>
              <th className="px-1 py-1.5">{t.checkin}</th>
              <th className="px-2 py-1.5 text-right">{t.reg}</th>
              <th className="px-2 py-1.5 text-right">{t.attend}</th>
              <th className="px-2 py-1.5 text-right">{t.paid}</th>
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
                    title={log.cc_connected ? t.ccConnected : t.ccNotConnected}
                  />
                </td>
                <td className="px-1 py-0.5">
                  <Cell
                    active={log.ss_connected}
                    title={log.ss_connected ? t.ssConnected : t.ssNotConnected}
                  />
                </td>
                <td className="px-1 py-0.5">
                  <Cell
                    active={log.lp_connected}
                    title={log.lp_connected ? t.lpConnected : t.lpNotConnected}
                  />
                </td>
                <td className="px-1 py-0.5">
                  <Cell
                    active={log.valid_checkin}
                    title={log.valid_checkin ? t.checkinDone : t.checkinNone}
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
