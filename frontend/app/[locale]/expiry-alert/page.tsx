'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ExpiryAlertSummary, ExpiryAlertItem } from '@/lib/types/enclosure-ss-lp';

// ── I18N ──────────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    pageTitle: '次卡到期预警',
    pageSubtitle: '30 天内次卡即将到期学员 · 按紧急度分层展示',
    urgent: '紧急',
    urgentRange: '≤7天',
    warning: '预警',
    warningRange: '8~14天',
    watch: '关注',
    watchRange: '15~30天',
    cardSuffix: '名学员次卡即将到期',
    noContact: '无记录',
    riskHigh: '高风险',
    riskMedium: '中风险',
    riskLow: '低风险',
    emptyTable: '30天内无到期学员',
    emptyTableDesc: '目前没有次卡即将到期的学员，请定期检查',
    colRisk: '风险',
    colStudentId: '学员 ID',
    colEnclosure: '围场段',
    colCC: 'CC',
    colDaysLeft: '剩余天数',
    colContactDays: '失联天数',
    colCards: '当前次卡',
    colMonthlyReg: '本月注册',
    colMonthlyPay: '本月付费',
    daysUnit: '天',
    loadError: '数据加载失败',
    loadErrorDesc: '请检查后端服务是否正常运行，或数据源是否已上传',
    retry: '重试',
    cardTitle: (total: number) => `到期学员明细（30天内，共 ${total} 人）`,
  },
  'zh-TW': {
    pageTitle: '次卡到期預警',
    pageSubtitle: '30 天內次卡即將到期學員 · 按緊急度分層展示',
    urgent: '緊急',
    urgentRange: '≤7天',
    warning: '預警',
    warningRange: '8~14天',
    watch: '關注',
    watchRange: '15~30天',
    cardSuffix: '名學員次卡即將到期',
    noContact: '無記錄',
    riskHigh: '高風險',
    riskMedium: '中風險',
    riskLow: '低風險',
    emptyTable: '30天內無到期學員',
    emptyTableDesc: '目前沒有次卡即將到期的學員，請定期檢查',
    colRisk: '風險',
    colStudentId: '學員 ID',
    colEnclosure: '圍場段',
    colCC: 'CC',
    colDaysLeft: '剩餘天數',
    colContactDays: '失聯天數',
    colCards: '當前次卡',
    colMonthlyReg: '本月註冊',
    colMonthlyPay: '本月付費',
    daysUnit: '天',
    loadError: '資料載入失敗',
    loadErrorDesc: '請檢查後端服務是否正常運行，或資料來源是否已上傳',
    retry: '重試',
    cardTitle: (total: number) => `到期學員明細（30天內，共 ${total} 人）`,
  },
  en: {
    pageTitle: 'Subscription Expiry Alert',
    pageSubtitle: 'Students with subscriptions expiring within 30 days · Tiered by urgency',
    urgent: 'Urgent',
    urgentRange: '≤7 days',
    warning: 'Warning',
    warningRange: '8–14 days',
    watch: 'Watch',
    watchRange: '15–30 days',
    cardSuffix: "students' subscriptions expiring soon",
    noContact: 'No record',
    riskHigh: 'High risk',
    riskMedium: 'Medium risk',
    riskLow: 'Low risk',
    emptyTable: 'No expiring students in 30 days',
    emptyTableDesc: 'No students have subscriptions expiring soon. Check back regularly.',
    colRisk: 'Risk',
    colStudentId: 'Student ID',
    colEnclosure: 'Enclosure',
    colCC: 'CC',
    colDaysLeft: 'Days Left',
    colContactDays: 'Days Since Contact',
    colCards: 'Current Cards',
    colMonthlyReg: 'Monthly Reg.',
    colMonthlyPay: 'Monthly Pay.',
    daysUnit: 'd',
    loadError: 'Failed to load data',
    loadErrorDesc: 'Please check if the backend service is running and data has been uploaded',
    retry: 'Retry',
    cardTitle: (total: number) => `Expiring Students (within 30 days, ${total} total)`,
  },
  th: {
    pageTitle: 'แจ้งเตือนการหมดอายุ',
    pageSubtitle: 'นักเรียนที่ซับสคริปชันหมดอายุภายใน 30 วัน · แบ่งตามระดับความเร่งด่วน',
    urgent: 'เร่งด่วน',
    urgentRange: '≤7 วัน',
    warning: 'เตือน',
    warningRange: '8–14 วัน',
    watch: 'ติดตาม',
    watchRange: '15–30 วัน',
    cardSuffix: 'นักเรียนที่ซับสคริปชันกำลังหมดอายุ',
    noContact: 'ไม่มีบันทึก',
    riskHigh: 'ความเสี่ยงสูง',
    riskMedium: 'ความเสี่ยงปานกลาง',
    riskLow: 'ความเสี่ยงต่ำ',
    emptyTable: 'ไม่มีนักเรียนหมดอายุใน 30 วัน',
    emptyTableDesc: 'ไม่มีนักเรียนที่ซับสคริปชันกำลังหมดอายุ กรุณาตรวจสอบเป็นประจำ',
    colRisk: 'ความเสี่ยง',
    colStudentId: 'รหัสนักเรียน',
    colEnclosure: 'ระยะเวลา',
    colCC: 'CC',
    colDaysLeft: 'วันที่เหลือ',
    colContactDays: 'วันที่ขาดการติดต่อ',
    colCards: 'คอร์สปัจจุบัน',
    colMonthlyReg: 'ลงทะเบียนเดือนนี้',
    colMonthlyPay: 'ชำระเดือนนี้',
    daysUnit: 'วัน',
    loadError: 'โหลดข้อมูลล้มเหลว',
    loadErrorDesc: 'กรุณาตรวจสอบว่าบริการแบ็กเอนด์ทำงานอยู่ และข้อมูลได้รับการอัปโหลดแล้ว',
    retry: 'ลองใหม่',
    cardTitle: (total: number) => `รายละเอียดนักเรียนหมดอายุ (ภายใน 30 วัน รวม ${total} คน)`,
  },
};

/* ── 紧急度分层颜色 ──────────────────────────────────────── */

function urgencyLevel(days: number | null): 'urgent' | 'warning' | 'watch' {
  if (days === null) return 'watch';
  if (days <= 7) return 'urgent';
  if (days <= 14) return 'warning';
  return 'watch';
}

/* ── 摘要卡片区 ──────────────────────────────────────────── */

function SummaryCards({ summary, t }: { summary: ExpiryAlertSummary; t: (typeof I18N)['zh'] }) {
  const URGENCY_CONFIG = {
    urgent: {
      label: t.urgent,
      sub: t.urgentRange,
      bg: 'bg-[var(--color-danger-surface)] border-[var(--color-danger)]',
      text: 'text-[var(--color-danger)]',
      count: 'text-[var(--color-danger)]',
      badge: 'bg-[var(--color-danger-surface)] text-[var(--color-danger)]',
    },
    warning: {
      label: t.warning,
      sub: t.warningRange,
      bg: 'bg-[var(--color-warning-surface)] border-[var(--color-warning)]',
      text: 'text-[var(--color-warning)]',
      count: 'text-[var(--color-warning)]',
      badge: 'bg-[var(--color-warning-surface)] text-[var(--color-warning)]',
    },
    watch: {
      label: t.watch,
      sub: t.watchRange,
      bg: 'bg-[var(--color-success-surface)] border-[var(--color-success)]',
      text: 'text-[var(--color-success)]',
      count: 'text-[var(--color-success)]',
      badge: 'bg-[var(--color-success-surface)] text-[var(--color-success)]',
    },
  } as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {(['urgent', 'warning', 'watch'] as const).map((level) => {
        const cfg = URGENCY_CONFIG[level];
        const count =
          level === 'urgent'
            ? summary.urgent_count
            : level === 'warning'
              ? summary.warning_count
              : summary.watch_count;
        return (
          <div key={level} className={`rounded-lg border p-4 flex flex-col gap-1 ${cfg.bg}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                {cfg.sub}
              </span>
            </div>
            <div className={`text-3xl font-bold font-mono tabular-nums ${cfg.count}`}>
              {(count ?? 0).toLocaleString()}
            </div>
            <div className={`text-xs ${cfg.text} opacity-70`}>{t.cardSuffix}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── 失联天数颜色 ──────────────────────────────────────────── */

function contactDaysBadge(days: number | null, daysUnit: string, noContact: string) {
  if (days === null) return <span className="text-[var(--text-muted)]">{noContact}</span>;
  if (days <= 7)
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[var(--color-success-surface)] text-[var(--color-success)]">
        {days}
        {daysUnit}
      </span>
    );
  if (days <= 14)
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[var(--color-warning-surface)] text-[var(--color-warning)]">
        {days}
        {daysUnit}
      </span>
    );
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[var(--color-danger-surface)] text-[var(--color-danger)]">
      {days}
      {daysUnit}
    </span>
  );
}

/* ── 到期预警表格 ──────────────────────────────────────────── */

function ExpiryTable({ items, t }: { items: ExpiryAlertItem[]; t: (typeof I18N)['zh'] }) {
  if (items.length === 0) {
    return <EmptyState title={t.emptyTable} description={t.emptyTableDesc} />;
  }

  const URGENCY_CONFIG = {
    urgent: { badge: 'bg-[var(--color-danger-surface)] text-[var(--color-danger)]' },
    warning: { badge: 'bg-[var(--color-warning-surface)] text-[var(--color-warning)]' },
    watch: { badge: 'bg-[var(--color-success-surface)] text-[var(--color-success)]' },
  } as const;

  const RISK_BADGE: Record<string, string> = {
    high: 'bg-[var(--color-danger-surface)] text-[var(--color-danger)]',
    medium: 'bg-orange-100 text-orange-700',
    low: 'bg-[var(--color-success-surface)] text-[var(--color-success)]',
  };
  const RISK_LABEL: Record<string, string> = {
    high: t.riskHigh,
    medium: t.riskMedium,
    low: t.riskLow,
  };

  const sorted = [...items].sort((a, b) => (a.days_to_expiry ?? 999) - (b.days_to_expiry ?? 999));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="slide-thead-row">
            <th className="slide-th slide-th-left py-2 px-2">{t.colRisk}</th>
            <th className="slide-th slide-th-left py-2 px-2">{t.colStudentId}</th>
            <th className="slide-th slide-th-left py-2 px-2">{t.colEnclosure}</th>
            <th className="slide-th slide-th-left py-2 px-2">{t.colCC}</th>
            <th className="slide-th slide-th-right py-2 px-2">{t.colDaysLeft}</th>
            <th className="slide-th slide-th-right py-2 px-2">{t.colContactDays}</th>
            <th className="slide-th slide-th-right py-2 px-2">{t.colCards}</th>
            <th className="slide-th slide-th-right py-2 px-2">{t.colMonthlyReg}</th>
            <th className="slide-th slide-th-right py-2 px-2">{t.colMonthlyPay}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, i) => {
            const level = urgencyLevel(item.days_to_expiry);
            const cfg = URGENCY_CONFIG[level];
            const rl = item.risk_level ?? 'low';
            return (
              <tr
                key={`${item.stdt_id}-${i}`}
                className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
              >
                <td className="slide-td py-1.5 px-2">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${RISK_BADGE[rl] ?? ''}`}
                  >
                    {RISK_LABEL[rl] ?? '—'}
                  </span>
                </td>
                <td className="slide-td py-1.5 px-2 font-mono">{item.stdt_id}</td>
                <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                  {item.enclosure ?? '—'}
                </td>
                <td className="slide-td py-1.5 px-2 font-medium">{item.cc_name ?? '—'}</td>
                <td className="slide-td py-1.5 px-2 text-right">
                  {item.days_to_expiry !== null ? (
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${cfg.badge}`}
                    >
                      {item.days_to_expiry}
                      {t.daysUnit}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="slide-td py-1.5 px-2 text-right">
                  {contactDaysBadge(item.days_since_last_contact ?? null, t.daysUnit, t.noContact)}
                </td>
                <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                  {item.current_cards ?? '—'}
                </td>
                <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                  {item.monthly_referral_registrations ?? '—'}
                </td>
                <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                  {item.monthly_referral_payments ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── 主页面 ───────────────────────────────────────────────── */

export default function ExpiryAlertPage() {
  usePageDimensions({ country: true, enclosure: true, team: true });
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    mutate: mutateSummary,
  } = useFilteredSWR<ExpiryAlertSummary>('/api/students/expiry-alert/summary');

  const {
    data: items,
    isLoading: itemsLoading,
    error: itemsError,
    mutate: mutateItems,
  } = useFilteredSWR<ExpiryAlertItem[]>('/api/students/expiry-alert?days=30');

  const isLoading = summaryLoading || itemsLoading;
  const error = summaryError || itemsError;
  function handleRetry() {
    void mutateSummary();
    void mutateItems();
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="page-title">{t.pageTitle}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{t.pageSubtitle}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <EmptyState
          title={t.loadError}
          description={t.loadErrorDesc}
          action={{ label: t.retry, onClick: handleRetry }}
        />
      ) : (
        <>
          {summary && <SummaryCards summary={summary} t={t} />}

          <Card title={t.cardTitle(summary?.total ?? 0)}>
            <ExpiryTable items={items ?? []} t={t} />
          </Card>
        </>
      )}
    </div>
  );
}
