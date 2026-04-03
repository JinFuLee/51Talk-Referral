'use client';

import { useLocale } from 'next-intl';
import type { StudentBrief } from '@/lib/types/member';

const I18N = {
  zh: {
    noData: '暂无学员数据，上传数据文件后自动刷新或调整筛选条件',
    colId: 'ID',
    colName: '姓名',
    colEnclosure: '围场',
    colLifecycle: '生命周期',
    colCC: 'CC',
    colReg: '注册',
    colAppt: '预约',
    colAttend: '出席',
    colPaid: '付费',
    colCheckin: '打卡天',
    colCheckinTitle: '本月打卡天数（转介绍活跃度）',
    colLesson: '课耗',
    colLessonTitle: '本月课耗（学员活跃度）',
    colCode: '转码',
    colCodeTitle: '本月转码次数（分享活跃度）',
    colReward: '奖励状态',
    colRewardTitle: '推荐奖励领取状态',
    colExpiry: '卡到期',
    colExpiryTitle: '次卡距到期天数（流失风险）',
    colLastCall: '末次拨打',
    colLastCallTitle: 'CC末次拨打日期（触达及时性）',
    pagination: (page: number, totalPages: number, total: number) =>
      `第 ${page} / ${totalPages} 页，共 ${total} 条`,
    prevPage: '上一页',
    nextPage: '下一页',
  },
  'zh-TW': {
    noData: '暫無學員數據，上傳數據文件後自動刷新或調整篩選條件',
    colId: 'ID',
    colName: '姓名',
    colEnclosure: '圍場',
    colLifecycle: '生命週期',
    colCC: 'CC',
    colReg: '注冊',
    colAppt: '預約',
    colAttend: '出席',
    colPaid: '付費',
    colCheckin: '打卡天',
    colCheckinTitle: '本月打卡天數（轉介紹活躍度）',
    colLesson: '課耗',
    colLessonTitle: '本月課耗（學員活躍度）',
    colCode: '轉碼',
    colCodeTitle: '本月轉碼次數（分享活躍度）',
    colReward: '獎勵狀態',
    colRewardTitle: '推薦獎勵領取狀態',
    colExpiry: '卡到期',
    colExpiryTitle: '次卡距到期天數（流失風險）',
    colLastCall: '末次撥打',
    colLastCallTitle: 'CC末次撥打日期（觸達及時性）',
    pagination: (page: number, totalPages: number, total: number) =>
      `第 ${page} / ${totalPages} 頁，共 ${total} 條`,
    prevPage: '上一頁',
    nextPage: '下一頁',
  },
  en: {
    noData: 'No student data. Upload a data file or adjust filters.',
    colId: 'ID',
    colName: 'Name',
    colEnclosure: 'Enclosure',
    colLifecycle: 'Lifecycle',
    colCC: 'CC',
    colReg: 'Reg',
    colAppt: 'Appt',
    colAttend: 'Attend',
    colPaid: 'Paid',
    colCheckin: 'Check-ins',
    colCheckinTitle: 'This month check-in days (referral activity)',
    colLesson: 'Lessons',
    colLessonTitle: 'This month lesson consumption (student activity)',
    colCode: 'Codes',
    colCodeTitle: 'This month referral codes (share activity)',
    colReward: 'Reward',
    colRewardTitle: 'Referral reward claim status',
    colExpiry: 'Expiry',
    colExpiryTitle: 'Days until card expiry (churn risk)',
    colLastCall: 'Last Call',
    colLastCallTitle: 'CC last call date (outreach timeliness)',
    pagination: (page: number, totalPages: number, total: number) =>
      `Page ${page} / ${totalPages}, ${total} total`,
    prevPage: 'Prev',
    nextPage: 'Next',
  },
  th: {
    noData: 'ไม่มีข้อมูลนักเรียน อัปโหลดไฟล์ข้อมูลหรือปรับตัวกรอง',
    colId: 'ID',
    colName: 'ชื่อ',
    colEnclosure: 'คอก',
    colLifecycle: 'วงจรชีวิต',
    colCC: 'CC',
    colReg: 'ลงทะเบียน',
    colAppt: 'นัดหมาย',
    colAttend: 'เข้าร่วม',
    colPaid: 'ชำระ',
    colCheckin: 'เช็คอิน',
    colCheckinTitle: 'เช็คอินเดือนนี้ (กิจกรรมการแนะนำ)',
    colLesson: 'บทเรียน',
    colLessonTitle: 'บทเรียนเดือนนี้ (กิจกรรมนักเรียน)',
    colCode: 'โค้ด',
    colCodeTitle: 'โค้ดแนะนำเดือนนี้ (กิจกรรมแชร์)',
    colReward: 'รางวัล',
    colRewardTitle: 'สถานะรับรางวัลการแนะนำ',
    colExpiry: 'หมดอายุ',
    colExpiryTitle: 'วันก่อนบัตรหมดอายุ (ความเสี่ยงสูญเสียลูกค้า)',
    colLastCall: 'โทรล่าสุด',
    colLastCallTitle: 'วันโทรล่าสุดของ CC (ความทันเวลา)',
    pagination: (page: number, totalPages: number, total: number) =>
      `หน้า ${page} / ${totalPages}, รวม ${total} รายการ`,
    prevPage: 'ก่อนหน้า',
    nextPage: 'ถัดไป',
  },
} as const;

type Locale = keyof typeof I18N;

function useT() {
  const locale = useLocale();
  return I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];
}

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
  const t = useT();
  const totalPages = Math.ceil(total / pageSize);

  if (items.length === 0) {
    return <div className="text-center py-8 text-sm text-[var(--text-muted)]">{t.noData}</div>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row text-xs">
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">{t.colId}</th>
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">{t.colName}</th>
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">{t.colEnclosure}</th>
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">{t.colLifecycle}</th>
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap min-w-[100px]">
                {t.colCC}
              </th>
              <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">{t.colReg}</th>
              <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">{t.colAppt}</th>
              <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">{t.colAttend}</th>
              <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">{t.colPaid}</th>
              <th
                className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                title={t.colCheckinTitle}
              >
                {t.colCheckin}
              </th>
              <th
                className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                title={t.colLessonTitle}
              >
                {t.colLesson}
              </th>
              <th
                className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                title={t.colCodeTitle}
              >
                {t.colCode}
              </th>
              <th
                className="py-1.5 px-2 border-0 text-left whitespace-nowrap"
                title={t.colRewardTitle}
              >
                {t.colReward}
              </th>
              <th
                className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                title={t.colExpiryTitle}
              >
                {t.colExpiry}
              </th>
              <th
                className="py-1.5 px-2 border-0 text-left whitespace-nowrap"
                title={t.colLastCallTitle}
              >
                {t.colLastCall}
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
          {t.pagination(page, totalPages, total)}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-sm disabled:opacity-40 hover:bg-[var(--bg-subtle)] transition-colors"
          >
            {t.prevPage}
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-sm disabled:opacity-40 hover:bg-[var(--bg-subtle)] transition-colors"
          >
            {t.nextPage}
          </button>
        </div>
      </div>
    </>
  );
}
