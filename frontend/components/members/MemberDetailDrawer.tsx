'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { formatRate } from '@/lib/utils';

const I18N = {
  zh: {
    drawerLabel: '学员详情',
    titlePrefix: '学员 #',
    titleFallback: '学员详情',
    notFound: '未找到学员信息',
    close: '关闭',
    fullArchive: '完整档案（全部',
    fullArchiveSuffix: '列）',
    otherFields: '其他字段',
    groups: {
      基本信息: '基本信息',
      跟进人员: '跟进人员',
      转介绍漏斗: '转介绍漏斗',
      活跃度: '活跃度',
    },
    fields: {
      id: '学员 ID',
      name: '姓名',
      region: '区域',
      country: '国家',
      enclosure: '围场段',
      lifecycle: '生命周期',
      teacher_level: '菲教级别',
      first_paid_date: '首次付费日期',
      cc_name: 'CC 姓名',
      cc_group: 'CC 组别',
      ss_name: 'SS 姓名',
      ss_group: 'SS 组别',
      lp_name: 'LP 姓名',
      lp_group: 'LP 组别',
      cc_last_call_date: 'CC 末次拨打日期',
      registrations: '注册数',
      appointments: '预约数',
      attendance: '出席数',
      payments: '付费数',
      total_revenue_usd: '业绩 (USD)',
      checkin_last_month: '上月打卡天数',
      checkin_this_month: '本月打卡天数',
      lesson_consumed_this_month: '本月课耗',
      referral_code_count_this_month: '本月转码次数',
      referral_reward_status: '推荐奖励状态',
      days_until_card_expiry: '次卡距到期天数',
    },
  },
  'zh-TW': {
    drawerLabel: '學員詳情',
    titlePrefix: '學員 #',
    titleFallback: '學員詳情',
    notFound: '未找到學員資訊',
    close: '關閉',
    fullArchive: '完整檔案（全部',
    fullArchiveSuffix: '列）',
    otherFields: '其他欄位',
    groups: {
      基本信息: '基本資訊',
      跟进人员: '跟進人員',
      转介绍漏斗: '轉介紹漏斗',
      活跃度: '活躍度',
    },
    fields: {
      id: '學員 ID',
      name: '姓名',
      region: '區域',
      country: '國家',
      enclosure: '圍場段',
      lifecycle: '生命週期',
      teacher_level: '菲教級別',
      first_paid_date: '首次付費日期',
      cc_name: 'CC 姓名',
      cc_group: 'CC 組別',
      ss_name: 'SS 姓名',
      ss_group: 'SS 組別',
      lp_name: 'LP 姓名',
      lp_group: 'LP 組別',
      cc_last_call_date: 'CC 末次撥打日期',
      registrations: '注冊數',
      appointments: '預約數',
      attendance: '出席數',
      payments: '付費數',
      total_revenue_usd: '業績 (USD)',
      checkin_last_month: '上月打卡天數',
      checkin_this_month: '本月打卡天數',
      lesson_consumed_this_month: '本月課耗',
      referral_code_count_this_month: '本月轉碼次數',
      referral_reward_status: '推薦獎勵狀態',
      days_until_card_expiry: '次卡距到期天數',
    },
  },
  en: {
    drawerLabel: 'Student Detail',
    titlePrefix: 'Student #',
    titleFallback: 'Student Detail',
    notFound: 'Student not found',
    close: 'Close',
    fullArchive: 'Full Archive (',
    fullArchiveSuffix: ' columns)',
    otherFields: 'Other Fields',
    groups: {
      基本信息: 'Basic Info',
      跟进人员: 'Assigned Staff',
      转介绍漏斗: 'Referral Funnel',
      活跃度: 'Activity',
    },
    fields: {
      id: 'Student ID',
      name: 'Name',
      region: 'Region',
      country: 'Country',
      enclosure: 'Enclosure',
      lifecycle: 'Lifecycle',
      teacher_level: 'Teacher Level',
      first_paid_date: 'First Paid Date',
      cc_name: 'CC Name',
      cc_group: 'CC Group',
      ss_name: 'SS Name',
      ss_group: 'SS Group',
      lp_name: 'LP Name',
      lp_group: 'LP Group',
      cc_last_call_date: 'CC Last Call Date',
      registrations: 'Registrations',
      appointments: 'Appointments',
      attendance: 'Attendance',
      payments: 'Payments',
      total_revenue_usd: 'Revenue (USD)',
      checkin_last_month: 'Last Month Check-ins',
      checkin_this_month: 'This Month Check-ins',
      lesson_consumed_this_month: 'This Month Lessons',
      referral_code_count_this_month: 'This Month Referral Codes',
      referral_reward_status: 'Referral Reward Status',
      days_until_card_expiry: 'Days Until Card Expiry',
    },
  },
  th: {
    drawerLabel: 'รายละเอียดนักเรียน',
    titlePrefix: 'นักเรียน #',
    titleFallback: 'รายละเอียดนักเรียน',
    notFound: 'ไม่พบข้อมูลนักเรียน',
    close: 'ปิด',
    fullArchive: 'ข้อมูลทั้งหมด (',
    fullArchiveSuffix: ' คอลัมน์)',
    otherFields: 'ฟิลด์อื่นๆ',
    groups: {
      基本信息: 'ข้อมูลพื้นฐาน',
      跟进人员: 'เจ้าหน้าที่ดูแล',
      转介绍漏斗: 'ช่องทางแนะนำ',
      活跃度: 'ความกระตือรือร้น',
    },
    fields: {
      id: 'รหัสนักเรียน',
      name: 'ชื่อ',
      region: 'ภูมิภาค',
      country: 'ประเทศ',
      enclosure: 'คอก',
      lifecycle: 'วงจรชีวิต',
      teacher_level: 'ระดับครู',
      first_paid_date: 'วันชำระครั้งแรก',
      cc_name: 'ชื่อ CC',
      cc_group: 'กลุ่ม CC',
      ss_name: 'ชื่อ SS',
      ss_group: 'กลุ่ม SS',
      lp_name: 'ชื่อ LP',
      lp_group: 'กลุ่ม LP',
      cc_last_call_date: 'วันโทรล่าสุดของ CC',
      registrations: 'จำนวนลงทะเบียน',
      appointments: 'จำนวนนัดหมาย',
      attendance: 'จำนวนเข้าร่วม',
      payments: 'จำนวนชำระ',
      total_revenue_usd: 'รายได้ (USD)',
      checkin_last_month: 'เช็คอินเดือนที่แล้ว',
      checkin_this_month: 'เช็คอินเดือนนี้',
      lesson_consumed_this_month: 'บทเรียนเดือนนี้',
      referral_code_count_this_month: 'โค้ดแนะนำเดือนนี้',
      referral_reward_status: 'สถานะรางวัลการแนะนำ',
      days_until_card_expiry: 'วันก่อนบัตรหมดอายุ',
    },
  },
} as const;

type Locale = keyof typeof I18N;

function useT() {
  const locale = useLocale();
  return I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];
}

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
  fields: [string, keyof (typeof I18N)['zh']['fields']][];
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
  t: ReturnType<typeof useT>;
}) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(extra);

  return (
    <section>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 hover:text-[var(--text-secondary)] transition-colors"
        aria-expanded={expanded}
      >
        <span>
          {t.fullArchive}
          {entries.length}
          {t.fullArchiveSuffix}
        </span>
        <span className="text-base leading-none">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="rounded-md border border-[var(--border-subtle)] overflow-x-auto">
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
  const t = useT();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t.drawerLabel}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div
        className="absolute right-0 top-0 h-full w-[480px] bg-[var(--bg-surface)] shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-[var(--bg-surface)] z-10">
          <h2 className="font-semibold text-[var(--text-primary)]">
            {student ? `${t.titlePrefix}${student.id}` : t.titleFallback}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-subtle)] transition-colors"
            aria-label={t.close}
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!student ? (
            <div className="text-center py-8 text-sm text-[var(--text-muted)]">{t.notFound}</div>
          ) : (
            <>
              {FIELD_GROUP_DEFS.map((group) => (
                <section key={group.titleKey}>
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                    {t.groups[group.titleKey]}
                  </h3>
                  <dl className="space-y-2">
                    {group.fields.map(([key, fieldKey]) => (
                      <div key={key} className="flex items-start justify-between gap-3">
                        <dt className="text-xs text-[var(--text-muted)] shrink-0 w-32">
                          {t.fields[fieldKey]}
                        </dt>
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
                      {t.otherFields}
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
                <ExtraSection extra={student.extra as Record<string, unknown>} t={t} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
