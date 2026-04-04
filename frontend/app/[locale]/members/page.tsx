'use client';

import { useLocale } from 'next-intl';
import { useState } from 'react';

const I18N = {
  zh: {
    pageTitle: '学员明细',
    pageSubtitle: '有效学员列表 · 点击行查看 59 字段详情',
    pageDesc: '有效学员 = 已付费且次卡在有效期内的学员，不含过期或未付费用户',
    filterEnclosure: '围场筛选（如 0M / 6M / 12M+）',
    filterCC: 'CC 筛选',
    filterContactAll: '全部失联天数',
    filterContactLe7: '≤7天（活跃）',
    filterContact8to14: '8-14天（关注）',
    filterContactGe15: '15天+（失联）',
    filterCardAll: '全部次卡健康度',
    filterCardHealthy: '健康（>30天）',
    filterCardWatch: '关注（15-30天）',
    filterCardRisk: '高风险（≤14天）',
    filterHasReferral: '仅有带新记录',
    clearFilter: '清除筛选',
    cardTitle: '学员列表',
    cardTitleTotal: '共',
    cardTitleSuffix: '条',
    loadFailed: '加载失败',
    loadFailedDesc: '请检查后端服务',
    retry: '重试',
    emptyTitle: '暂无学员数据',
    emptyDesc: '上传数据文件后自动刷新，或调整筛选条件',
    colId: 'ID',
    colEnclosure: '围场',
    enclosureTooltip: '学员付费起算天数分段（M0~M12+，每30天一段）',
    colLifecycle: '生命周期',
    colCC: 'CC',
    colReg: '注册',
    regTooltip: '该学员带来的转介绍注册数',
    colAppt: '预约',
    colAttend: '出席',
    colPay: '付费',
    payTooltip: '该学员带来的转介绍付费数',
    colCheckin: '打卡天',
    checkinTitle: '本月打卡天数',
    colLesson: '课耗',
    lessonTitle: '本月课耗',
    colCoding: '转码',
    codingTitle: '本月转码次数',
    colReward: '奖励状态',
    rewardTitle: '推荐奖励领取状态',
    colExpiry: '卡到期',
    expiryTitle: '次卡距到期天数',
    colLastCall: '末次拨打',
    lastCallTitle: 'CC末次拨打日期',
    pageLabel: '第',
    pageMid: '/',
    pageSuffix: '页',
    prevPage: '上一页',
    nextPage: '下一页',
    exportId: '学员ID',
    exportEnclosure: '围场',
    exportLifecycle: '生命周期',
    exportCC: 'CC',
    exportReg: '注册',
    exportAppt: '预约',
    exportAttend: '出席',
    exportPay: '付费',
    exportCheckin: '打卡天',
    exportLesson: '课耗',
    exportCoding: '转码',
    exportReward: '奖励状态',
    exportExpiry: '卡到期天数',
    exportLastCall: '末次拨打',
  },
  'zh-TW': {
    pageTitle: '學員明細',
    pageSubtitle: '有效學員列表 · 點擊行查看 59 字段詳情',
    pageDesc: '有效學員 = 已付費且次卡在有效期內的學員，不含過期或未付費用戶',
    filterEnclosure: '圍場篩選（如 0M / 6M / 12M+）',
    filterCC: 'CC 篩選',
    filterContactAll: '全部失聯天數',
    filterContactLe7: '≤7天（活躍）',
    filterContact8to14: '8-14天（關注）',
    filterContactGe15: '15天+（失聯）',
    filterCardAll: '全部次卡健康度',
    filterCardHealthy: '健康（>30天）',
    filterCardWatch: '關注（15-30天）',
    filterCardRisk: '高風險（≤14天）',
    filterHasReferral: '僅有帶新記錄',
    clearFilter: '清除篩選',
    cardTitle: '學員列表',
    cardTitleTotal: '共',
    cardTitleSuffix: '條',
    loadFailed: '載入失敗',
    loadFailedDesc: '請檢查後端服務',
    retry: '重試',
    emptyTitle: '暫無學員資料',
    emptyDesc: '上傳資料文件後自動刷新，或調整篩選條件',
    colId: 'ID',
    colEnclosure: '圍場',
    enclosureTooltip: '學員付費起算天數分段（M0~M12+，每30天一段）',
    colLifecycle: '生命週期',
    colCC: 'CC',
    colReg: '註冊',
    regTooltip: '該學員帶來的轉介紹註冊數',
    colAppt: '預約',
    colAttend: '出席',
    colPay: '付費',
    payTooltip: '該學員帶來的轉介紹付費數',
    colCheckin: '打卡天',
    checkinTitle: '本月打卡天數',
    colLesson: '課耗',
    lessonTitle: '本月課耗',
    colCoding: '轉碼',
    codingTitle: '本月轉碼次數',
    colReward: '獎勵狀態',
    rewardTitle: '推薦獎勵領取狀態',
    colExpiry: '卡到期',
    expiryTitle: '次卡距到期天數',
    colLastCall: '末次撥打',
    lastCallTitle: 'CC末次撥打日期',
    pageLabel: '第',
    pageMid: '/',
    pageSuffix: '頁',
    prevPage: '上一頁',
    nextPage: '下一頁',
    exportId: '學員ID',
    exportEnclosure: '圍場',
    exportLifecycle: '生命週期',
    exportCC: 'CC',
    exportReg: '註冊',
    exportAppt: '預約',
    exportAttend: '出席',
    exportPay: '付費',
    exportCheckin: '打卡天',
    exportLesson: '課耗',
    exportCoding: '轉碼',
    exportReward: '獎勵狀態',
    exportExpiry: '卡到期天數',
    exportLastCall: '末次撥打',
  },
  en: {
    pageTitle: 'Member Details',
    pageSubtitle: 'Active Member List · Click row for 59-field details',
    pageDesc:
      'Active member = paid and within card validity period, excludes expired or unpaid users',
    filterEnclosure: 'Enclosure filter (e.g. 0M / 6M / 12M+)',
    filterCC: 'CC filter',
    filterContactAll: 'All contact days',
    filterContactLe7: '≤7 days (Active)',
    filterContact8to14: '8-14 days (Watch)',
    filterContactGe15: '15+ days (Lost)',
    filterCardAll: 'All card health',
    filterCardHealthy: 'Healthy (>30 days)',
    filterCardWatch: 'Watch (15-30 days)',
    filterCardRisk: 'At Risk (≤14 days)',
    filterHasReferral: 'Has referral records only',
    clearFilter: 'Clear Filters',
    cardTitle: 'Member List',
    cardTitleTotal: 'total',
    cardTitleSuffix: '',
    loadFailed: 'Load Failed',
    loadFailedDesc: 'Please check the backend service',
    retry: 'Retry',
    emptyTitle: 'No Member Data',
    emptyDesc: 'Will refresh automatically after data upload, or adjust filters',
    colId: 'ID',
    colEnclosure: 'Enclosure',
    enclosureTooltip: 'Days since first payment (M0~M12+, ~30 days per segment)',
    colLifecycle: 'Lifecycle',
    colCC: 'CC',
    colReg: 'Reg',
    regTooltip: 'Referral registrations brought by this student',
    colAppt: 'Appt',
    colAttend: 'Attend',
    colPay: 'Pay',
    payTooltip: 'Referral payments brought by this student',
    colCheckin: 'Check-in',
    checkinTitle: 'Check-in days this month',
    colLesson: 'Lessons',
    lessonTitle: 'Lessons consumed this month',
    colCoding: 'Coding',
    codingTitle: 'Referral codings this month',
    colReward: 'Reward',
    rewardTitle: 'Referral reward claim status',
    colExpiry: 'Expiry',
    expiryTitle: 'Days until card expiry',
    colLastCall: 'Last Call',
    lastCallTitle: 'CC last call date',
    pageLabel: 'Page',
    pageMid: '/',
    pageSuffix: '',
    prevPage: 'Prev',
    nextPage: 'Next',
    exportId: 'StudentID',
    exportEnclosure: 'Enclosure',
    exportLifecycle: 'Lifecycle',
    exportCC: 'CC',
    exportReg: 'Registrations',
    exportAppt: 'Appointments',
    exportAttend: 'Attendance',
    exportPay: 'Payments',
    exportCheckin: 'Check-in Days',
    exportLesson: 'Lessons',
    exportCoding: 'Codings',
    exportReward: 'Reward Status',
    exportExpiry: 'Days to Expiry',
    exportLastCall: 'Last Call Date',
  },
  th: {
    pageTitle: 'รายละเอียดนักเรียน',
    pageSubtitle: 'รายชื่อนักเรียนที่ใช้งานอยู่ · คลิกแถวเพื่อดู 59 ช่องข้อมูล',
    pageDesc:
      'นักเรียนที่ใช้งานอยู่ = ชำระเงินแล้วและบัตรยังอยู่ในช่วงเวลาที่ถูกต้อง ไม่รวมผู้ที่หมดอายุหรือยังไม่ชำระเงิน',
    filterEnclosure: 'กรองระยะเวลา (เช่น 0M / 6M / 12M+)',
    filterCC: 'กรอง CC',
    filterContactAll: 'วันที่ขาดการติดต่อทั้งหมด',
    filterContactLe7: '≤7 วัน (ใช้งานอยู่)',
    filterContact8to14: '8-14 วัน (ติดตาม)',
    filterContactGe15: '15+ วัน (ขาดการติดต่อ)',
    filterCardAll: 'สุขภาพบัตรทั้งหมด',
    filterCardHealthy: 'ดี (>30 วัน)',
    filterCardWatch: 'ติดตาม (15-30 วัน)',
    filterCardRisk: 'เสี่ยง (≤14 วัน)',
    filterHasReferral: 'เฉพาะที่มีบันทึกการแนะนำ',
    clearFilter: 'ล้างตัวกรอง',
    cardTitle: 'รายชื่อนักเรียน',
    cardTitleTotal: 'ทั้งหมด',
    cardTitleSuffix: 'รายการ',
    loadFailed: 'โหลดล้มเหลว',
    loadFailedDesc: 'กรุณาตรวจสอบบริการ backend',
    retry: 'ลองใหม่',
    emptyTitle: 'ไม่มีข้อมูลนักเรียน',
    emptyDesc: 'จะรีเฟรชอัตโนมัติหลังอัปโหลดข้อมูล หรือปรับตัวกรอง',
    colId: 'ID',
    colEnclosure: 'ระยะเวลา',
    enclosureTooltip: 'วันนับจากวันชำระเงินแรก (M0~M12+, ~30 วันต่อช่วง)',
    colLifecycle: 'วงจรชีวิต',
    colCC: 'CC',
    colReg: 'ลงทะเบียน',
    regTooltip: 'จำนวนการลงทะเบียนแนะนำที่นักเรียนคนนี้นำมา',
    colAppt: 'นัดหมาย',
    colAttend: 'เข้าร่วม',
    colPay: 'ชำระเงิน',
    payTooltip: 'จำนวนการชำระเงินแนะนำที่นักเรียนคนนี้นำมา',
    colCheckin: 'เช็คอิน',
    checkinTitle: 'วันเช็คอินเดือนนี้',
    colLesson: 'บทเรียน',
    lessonTitle: 'บทเรียนที่ใช้เดือนนี้',
    colCoding: 'โค้ด',
    codingTitle: 'การแปลงรหัสแนะนำเดือนนี้',
    colReward: 'รางวัล',
    rewardTitle: 'สถานะการรับรางวัลการแนะนำ',
    colExpiry: 'หมดอายุ',
    expiryTitle: 'วันที่เหลือก่อนบัตรหมดอายุ',
    colLastCall: 'โทรล่าสุด',
    lastCallTitle: 'วันที่ CC โทรล่าสุด',
    pageLabel: 'หน้า',
    pageMid: '/',
    pageSuffix: '',
    prevPage: 'ก่อนหน้า',
    nextPage: 'ถัดไป',
    exportId: 'ID นักเรียน',
    exportEnclosure: 'ระยะเวลา',
    exportLifecycle: 'วงจรชีวิต',
    exportCC: 'CC',
    exportReg: 'ลงทะเบียน',
    exportAppt: 'นัดหมาย',
    exportAttend: 'เข้าร่วม',
    exportPay: 'ชำระเงิน',
    exportCheckin: 'วันเช็คอิน',
    exportLesson: 'บทเรียน',
    exportCoding: 'โค้ดแนะนำ',
    exportReward: 'สถานะรางวัล',
    exportExpiry: 'วันถึงหมดอายุ',
    exportLastCall: 'วันโทรล่าสุด',
  },
} as const;
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
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

  const CONTACT_DAY_OPTIONS = [
    { value: '', label: t.filterContactAll },
    { value: 'le7', label: t.filterContactLe7 },
    { value: '8to14', label: t.filterContact8to14 },
    { value: 'ge15', label: t.filterContactGe15 },
  ];

  const CARD_HEALTH_OPTIONS = [
    { value: '', label: t.filterCardAll },
    { value: 'healthy', label: t.filterCardHealthy },
    { value: 'watch', label: t.filterCardWatch },
    { value: 'risk', label: t.filterCardRisk },
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
        { key: 'id', label: t.exportId },
        { key: 'enclosure', label: t.exportEnclosure },
        { key: 'lifecycle', label: t.exportLifecycle },
        { key: 'cc_name', label: t.exportCC },
        { key: 'registrations', label: t.exportReg },
        { key: 'appointments', label: t.exportAppt },
        { key: 'attendance', label: t.exportAttend },
        { key: 'payments', label: t.exportPay },
        { key: 'checkin_this_month', label: t.exportCheckin },
        { key: 'lesson_consumed_this_month', label: t.exportLesson },
        { key: 'referral_code_count_this_month', label: t.exportCoding },
        { key: 'referral_reward_status', label: t.exportReward },
        { key: 'days_until_card_expiry', label: t.exportExpiry },
        { key: 'cc_last_call_date', label: t.exportLastCall },
      ],
      `学员明细_${today}`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">{t.pageTitle}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t.pageSubtitle}</p>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{t.pageDesc}</p>
        </div>
        <ExportButton onExportCsv={handleExport} />
      </div>

      {/* 筛选器 */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="text"
          placeholder={t.filterEnclosure}
          value={enclosureFilter}
          onChange={(e) => {
            setEnclosureFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-action w-40"
        />
        <input
          type="text"
          placeholder={t.filterCC}
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
          {t.filterHasReferral}
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
            {t.clearFilter}
          </button>
        )}
      </div>

      <Card
        title={`${t.cardTitle}${data ? ` (${t.cardTitleTotal} ${data.total} ${t.cardTitleSuffix})` : ''}`}
      >
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState
            title={t.loadFailed}
            description={t.loadFailedDesc}
            action={{ label: t.retry, onClick: () => mutate() }}
          />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title={t.emptyTitle} description={t.emptyDesc} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="slide-thead-row text-xs">
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">{t.colId}</th>
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">
                      {t.colEnclosure} <BrandDot tooltip={t.enclosureTooltip} />
                    </th>
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">
                      {t.colLifecycle}
                    </th>
                    <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">{t.colCC}</th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">
                      {t.colReg} <BrandDot tooltip={t.regTooltip} />
                    </th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">
                      {t.colAppt}
                    </th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">
                      {t.colAttend}
                    </th>
                    <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">
                      {t.colPay} <BrandDot tooltip={t.payTooltip} />
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                      title={t.checkinTitle}
                    >
                      {t.colCheckin}
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                      title={t.lessonTitle}
                    >
                      {t.colLesson}
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                      title={t.codingTitle}
                    >
                      {t.colCoding}
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-left whitespace-nowrap"
                      title={t.rewardTitle}
                    >
                      {t.colReward}
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-right whitespace-nowrap"
                      title={t.expiryTitle}
                    >
                      {t.colExpiry}
                    </th>
                    <th
                      className="py-1.5 px-2 border-0 text-left whitespace-nowrap"
                      title={t.lastCallTitle}
                    >
                      {t.colLastCall}
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
                {t.pageLabel} {page} {t.pageMid} {totalPages} {t.pageSuffix}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-sm disabled:opacity-40 hover:bg-[var(--bg-subtle)]"
                >
                  {t.prevPage}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-sm disabled:opacity-40 hover:bg-[var(--bg-subtle)]"
                >
                  {t.nextPage}
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
