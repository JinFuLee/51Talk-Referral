'use client';

import { Fragment, useState, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRevenue } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MemberDetailDrawer } from '@/components/members/MemberDetailDrawer';
import { StudentTagBadge } from '@/components/checkin/StudentTagBadge';
import { useWideConfig } from '@/lib/hooks/useWideConfig';

// ── Inline I18N ────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    // GroupFilterBar
    segmentLabel: '分群:',
    exportTsv: '导出 TSV ↓',
    // GroupFilter labels
    filterAll: '全部',
    filterNever: '从未打卡',
    filterWasActive: '曾打卡本月未打',
    filterThisWeek: '本周未打卡',
    filterPartial: '打过今天没打',
    filterCardExpiry: '卡到期≤30天',
    filterDormantHp: '沉睡高潜',
    filterHandover: '即将交接',
    filterRenewalRisk: '续费风险',
    // Table headers
    thRank: '排名',
    thPriority: '🔴优先级',
    thActivation: '激活',
    thStudentId: '学员ID',
    thEnclosure: '围场',
    thCcOwner: 'CC负责',
    thSsOwner: 'SS负责',
    thLpOwner: 'LP负责',
    thCheckinWeekMonth: '本周/月打卡',
    thCheckinLastMonth: '上月打卡',
    thConnStatus: 'CC/SS/LP 接通',
    thTags: '标签',
    thChannel: '渠道',
    thGoldenWindow: '黄金窗口',
    thLesson: '📚课耗(3月均)',
    thReferral: '👥本月推荐',
    thRevenue: '💰历史付费',
    thLastContact: 'CC末次联系',
    thIncentive: '激励',
    thCardExpiry: '卡到期',
    // Row inline
    thisWeekPrefix: '本周',
    thisMonthPrefix: '本月',
    // Expanded row
    expandedTitle: '完整档案 — 全部字段',
    collapseBtn: '收起 ▲',
    fieldStudentId: '学员 ID',
    fieldEnclosure: '围场',
    fieldResponsible: '负责人',
    fieldQualityScore: '质量评分',
    fieldLesson3m: '3月均课耗',
    fieldReferralThisMonth: '本月推荐',
    fieldRevenue: '历史付费',
    fieldLastContact: 'CC末次联系',
    fieldCardExpiry: '卡到期天数',
    // Contact badge
    contactNeedCall: '需联系',
    contactDaysAgo: (d: number) => `${d}天前`,
    // Activation dot title
    activationTitle: (s: number) => `激活概率 ${s}`,
    // Conn status dot title
    connConnected: '已接通',
    connNotConnected: '未接通',
    // Golden window labels
    gwFirstCheckin: '首次打卡',
    gwLeadNoShow: '有B未出席',
    gwRenewalWindow: '续费窗口',
    // Channel labels
    chLine: 'LINE',
    chSms: '短信',
    chPhone: '电话',
    chApp: 'APP',
    // Bottom stats
    statsTotalPrefix: '共',
    statsTotalSuffix: '名未打卡有效学员',
    statsAvgScore: '平均评分',
    statsHighQuality: '高质量(≥70)占比',
    statsHighQualityCount: (n: number) => `${n} 人`,
    // Client tags
    tagFullAttendance: '满勤',
    tagActive: '活跃',
    tagImproving: '进步明显',
    tagDeclining: '在退步',
    tagDormantHp: '沉睡高潜',
    tagSuperConvert: '超级转化',
    // Empty / error states
    emptyTitle: '暂无未打卡学员',
    emptyDesc: '当前筛选条件下无数据，或数据文件尚未上传',
    errorTitle: '加载失败',
    errorDesc: '请检查后端服务是否正常运行',
  },
  'zh-TW': {
    segmentLabel: '分群:',
    exportTsv: '匯出 TSV ↓',
    filterAll: '全部',
    filterNever: '從未打卡',
    filterWasActive: '曾打卡本月未打',
    filterThisWeek: '本週未打卡',
    filterPartial: '打過今天沒打',
    filterCardExpiry: '卡到期≤30天',
    filterDormantHp: '沉睡高潛',
    filterHandover: '即將交接',
    filterRenewalRisk: '續費風險',
    thRank: '排名',
    thPriority: '🔴優先級',
    thActivation: '激活',
    thStudentId: '學員ID',
    thEnclosure: '圍場',
    thCcOwner: 'CC負責',
    thSsOwner: 'SS負責',
    thLpOwner: 'LP負責',
    thCheckinWeekMonth: '本週/月打卡',
    thCheckinLastMonth: '上月打卡',
    thConnStatus: 'CC/SS/LP 接通',
    thTags: '標籤',
    thChannel: '渠道',
    thGoldenWindow: '黃金窗口',
    thLesson: '📚課耗(3月均)',
    thReferral: '👥本月推薦',
    thRevenue: '💰歷史付費',
    thLastContact: 'CC末次聯繫',
    thIncentive: '激勵',
    thCardExpiry: '卡到期',
    thisWeekPrefix: '本週',
    thisMonthPrefix: '本月',
    expandedTitle: '完整檔案 — 全部欄位',
    collapseBtn: '收起 ▲',
    fieldStudentId: '學員 ID',
    fieldEnclosure: '圍場',
    fieldResponsible: '負責人',
    fieldQualityScore: '質量評分',
    fieldLesson3m: '3月均課耗',
    fieldReferralThisMonth: '本月推薦',
    fieldRevenue: '歷史付費',
    fieldLastContact: 'CC末次聯繫',
    fieldCardExpiry: '卡到期天數',
    contactNeedCall: '需聯繫',
    contactDaysAgo: (d: number) => `${d}天前`,
    activationTitle: (s: number) => `激活概率 ${s}`,
    connConnected: '已接通',
    connNotConnected: '未接通',
    gwFirstCheckin: '首次打卡',
    gwLeadNoShow: '有B未出席',
    gwRenewalWindow: '續費窗口',
    chLine: 'LINE',
    chSms: '簡訊',
    chPhone: '電話',
    chApp: 'APP',
    statsTotalPrefix: '共',
    statsTotalSuffix: '名未打卡有效學員',
    statsAvgScore: '平均評分',
    statsHighQuality: '高質量(≥70)佔比',
    statsHighQualityCount: (n: number) => `${n} 人`,
    tagFullAttendance: '滿勤',
    tagActive: '活躍',
    tagImproving: '進步明顯',
    tagDeclining: '在退步',
    tagDormantHp: '沉睡高潛',
    tagSuperConvert: '超級轉化',
    emptyTitle: '暫無未打卡學員',
    emptyDesc: '當前篩選條件下無數據，或數據文件尚未上傳',
    errorTitle: '載入失敗',
    errorDesc: '請檢查後端服務是否正常運行',
  },
  en: {
    segmentLabel: 'Segment:',
    exportTsv: 'Export TSV ↓',
    filterAll: 'All',
    filterNever: 'Never Checked In',
    filterWasActive: 'Was Active / Lapsed',
    filterThisWeek: 'Skipped This Week',
    filterPartial: 'Partial This Month',
    filterCardExpiry: 'Card Expiry ≤30d',
    filterDormantHp: 'Dormant High-Pot',
    filterHandover: 'Upcoming Handover',
    filterRenewalRisk: 'Renewal Risk',
    thRank: 'Rank',
    thPriority: '🔴Priority',
    thActivation: 'Activation',
    thStudentId: 'Student ID',
    thEnclosure: 'Enclosure',
    thCcOwner: 'CC Owner',
    thSsOwner: 'SS Owner',
    thLpOwner: 'LP Owner',
    thCheckinWeekMonth: 'Wk / Mo Check-in',
    thCheckinLastMonth: 'Last Mo Check-in',
    thConnStatus: 'CC/SS/LP Reached',
    thTags: 'Tags',
    thChannel: 'Channel',
    thGoldenWindow: 'Golden Window',
    thLesson: '📚Lessons (3mo avg)',
    thReferral: '👥Referrals (mo)',
    thRevenue: '💰Revenue',
    thLastContact: 'CC Last Contact',
    thIncentive: 'Incentive',
    thCardExpiry: 'Card Expiry',
    thisWeekPrefix: 'Wk',
    thisMonthPrefix: 'Mo',
    expandedTitle: 'Full Profile — All Fields',
    collapseBtn: 'Collapse ▲',
    fieldStudentId: 'Student ID',
    fieldEnclosure: 'Enclosure',
    fieldResponsible: 'Owner',
    fieldQualityScore: 'Quality Score',
    fieldLesson3m: '3-Mo Avg Lessons',
    fieldReferralThisMonth: 'Referrals (Mo)',
    fieldRevenue: 'Revenue',
    fieldLastContact: 'CC Last Contact',
    fieldCardExpiry: 'Card Expiry (days)',
    contactNeedCall: 'Call Now',
    contactDaysAgo: (d: number) => `${d}d ago`,
    activationTitle: (s: number) => `Activation probability ${s}`,
    connConnected: 'Reached',
    connNotConnected: 'Not reached',
    gwFirstCheckin: 'First Check-in',
    gwLeadNoShow: 'Lead No-Show',
    gwRenewalWindow: 'Renewal Window',
    chLine: 'LINE',
    chSms: 'SMS',
    chPhone: 'Phone',
    chApp: 'App',
    statsTotalPrefix: '',
    statsTotalSuffix: 'students not checked in',
    statsAvgScore: 'Avg Score',
    statsHighQuality: 'High-quality (≥70)',
    statsHighQualityCount: (n: number) => `${n} students`,
    tagFullAttendance: 'Full Attendance',
    tagActive: 'Active',
    tagImproving: 'Improving',
    tagDeclining: 'Declining',
    tagDormantHp: 'Dormant High-Pot',
    tagSuperConvert: 'Super Converter',
    emptyTitle: 'No Students to Follow Up',
    emptyDesc: 'No data under current filters, or data file not yet uploaded.',
    errorTitle: 'Load Failed',
    errorDesc: 'Please check if the backend service is running.',
  },
  th: {
    segmentLabel: 'กลุ่ม:',
    exportTsv: 'ส่งออก TSV ↓',
    filterAll: 'ทั้งหมด',
    filterNever: 'ไม่เคยเช็คอิน',
    filterWasActive: 'เคยเช็คอิน/เดือนนี้ไม่เช็ค',
    filterThisWeek: 'ไม่เช็คอินสัปดาห์นี้',
    filterPartial: 'เช็คบางส่วน',
    filterCardExpiry: 'บัตรหมดอายุ ≤30 วัน',
    filterDormantHp: 'ศักยภาพสูงแต่หยุดชะงัก',
    filterHandover: 'ใกล้ส่งต่อ',
    filterRenewalRisk: 'ความเสี่ยงต่ออายุ',
    thRank: 'อันดับ',
    thPriority: '🔴ความสำคัญ',
    thActivation: 'การกระตุ้น',
    thStudentId: 'รหัสนักเรียน',
    thEnclosure: 'คอก',
    thCcOwner: 'CC รับผิดชอบ',
    thSsOwner: 'SS รับผิดชอบ',
    thLpOwner: 'LP รับผิดชอบ',
    thCheckinWeekMonth: 'เช็คอิน สัปดาห์/เดือน',
    thCheckinLastMonth: 'เช็คอินเดือนที่แล้ว',
    thConnStatus: 'ติดต่อ CC/SS/LP',
    thTags: 'แท็ก',
    thChannel: 'ช่องทาง',
    thGoldenWindow: 'ช่วงทอง',
    thLesson: '📚เรียน (เฉลี่ย 3 เดือน)',
    thReferral: '👥แนะนำ (เดือน)',
    thRevenue: '💰รายได้',
    thLastContact: 'CC ติดต่อล่าสุด',
    thIncentive: 'สิ่งจูงใจ',
    thCardExpiry: 'วันหมดอายุบัตร',
    thisWeekPrefix: 'สัปดาห์',
    thisMonthPrefix: 'เดือน',
    expandedTitle: 'โปรไฟล์เต็ม — ทุกฟิลด์',
    collapseBtn: 'ย่อ ▲',
    fieldStudentId: 'รหัสนักเรียน',
    fieldEnclosure: 'คอก',
    fieldResponsible: 'ผู้รับผิดชอบ',
    fieldQualityScore: 'คะแนนคุณภาพ',
    fieldLesson3m: 'เรียนเฉลี่ย 3 เดือน',
    fieldReferralThisMonth: 'แนะนำเดือนนี้',
    fieldRevenue: 'รายได้รวม',
    fieldLastContact: 'CC ติดต่อล่าสุด',
    fieldCardExpiry: 'วันหมดอายุบัตร (วัน)',
    contactNeedCall: 'ต้องติดต่อ',
    contactDaysAgo: (d: number) => `${d} วันที่แล้ว`,
    activationTitle: (s: number) => `ความน่าจะเป็นในการกระตุ้น ${s}`,
    connConnected: 'ติดต่อได้',
    connNotConnected: 'ติดต่อไม่ได้',
    gwFirstCheckin: 'เช็คอินครั้งแรก',
    gwLeadNoShow: 'มี B ไม่มาเรียน',
    gwRenewalWindow: 'ช่วงต่ออายุ',
    chLine: 'LINE',
    chSms: 'SMS',
    chPhone: 'โทรศัพท์',
    chApp: 'แอป',
    statsTotalPrefix: '',
    statsTotalSuffix: 'นักเรียนที่ยังไม่ได้เช็คอิน',
    statsAvgScore: 'คะแนนเฉลี่ย',
    statsHighQuality: 'คุณภาพสูง (≥70)',
    statsHighQualityCount: (n: number) => `${n} คน`,
    tagFullAttendance: 'เต็มพิกัด',
    tagActive: 'กระตือรือร้น',
    tagImproving: 'พัฒนาขึ้น',
    tagDeclining: 'ถดถอย',
    tagDormantHp: 'ศักยภาพสูงแต่หยุดชะงัก',
    tagSuperConvert: 'แปลงสูง',
    emptyTitle: 'ไม่มีนักเรียนที่ต้องติดตาม',
    emptyDesc: 'ไม่มีข้อมูลตามตัวกรองปัจจุบัน หรือยังไม่ได้อัปโหลดไฟล์ข้อมูล',
    errorTitle: 'โหลดล้มเหลว',
    errorDesc: 'กรุณาตรวจสอบว่าบริการ backend ทำงานอยู่หรือไม่',
  },
} as const;

type Locale = keyof typeof I18N;

function useT() {
  const locale = useLocale();
  const lang: Locale = (locale in I18N ? locale : 'zh') as Locale;
  return I18N[lang];
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Role = 'CC' | 'SS' | 'LP' | '运营';

interface FollowupMember {
  rank: number;
  quality_score: number;
  id: string | number;
  enclosure: string;
  responsible: string; // CC 负责人
  lesson_avg_3m: number | null; // 3月均课耗
  referrals_this_month: number | null;
  total_revenue_usd: number | null;
  cc_last_contact_date: string | null; // CC末次联系
  days_until_card_expiry: number | null;
  extra?: Record<string, unknown>; // D4 extra 字段（含本月/上月打卡天数）
  // 新增字段
  ss_name: string | null;
  ss_group: string | null;
  lp_name: string | null;
  lp_group: string | null;
  weeks_active: number;
  days_this_week: number;
  days_this_month: number;
  cc_connected: number;
  ss_connected: number;
  lp_connected: number;
  cc_last_note_date: string | null;
  cc_last_note_content: string | null;
  renewal_days_ago: number | null;
  incentive_status: string | null;
  action_priority_score: number;
  recommended_channel: string;
  golden_window: string[];
  team?: string;
  // allow full D4 extra fields for drawer
  [key: string]: unknown;
}

// 后端原始返回的 student 字段名
interface BackendStudent {
  student_id: string;
  enclosure: string;
  role: string;
  cc_name: string; // 负责人
  team: string;
  quality_score: number;
  lesson_consumption_3m: number | null;
  referral_registrations: number | null;
  referral_payments: number | null;
  cc_last_call_date: string | null;
  card_days_remaining: number | null;
  extra: Record<string, unknown>;
  // 新增字段
  ss_name: string | null;
  ss_group: string | null;
  lp_name: string | null;
  lp_group: string | null;
  weeks_active: number;
  days_this_week: number;
  days_this_month: number;
  cc_connected: number;
  ss_connected: number;
  lp_connected: number;
  cc_last_note_date: string | null;
  cc_last_note_content: string | null;
  renewal_days_ago: number | null;
  incentive_status: string | null;
  action_priority_score: number;
  recommended_channel: string;
  golden_window: string[];
}

interface FollowupResponseRaw {
  students?: BackendStudent[];
  items?: FollowupMember[];
  total: number;
  avg_quality_score?: number;
  high_quality_count?: number;
  teams?: string[];
  score_formula?: string;
}

interface FollowupResponse {
  items: FollowupMember[];
  total: number;
  avg_quality_score: number;
  high_quality_count: number;
  teams: string[];
}

// ── Tag Logic ──────────────────────────────────────────────────────────────────

type GroupFilter =
  | 'all'
  | 'never'
  | 'was_active'
  | 'partial'
  | 'this_week'
  | 'card_expiry'
  | 'dormant_hp'
  | 'handover'
  | 'renewal_risk';

// GROUP_FILTER_LABELS is now derived from t() inside GroupFilterBar (see below)

function computeClientTags(
  daysThis: number,
  daysLast: number,
  lesson: number,
  registrations: number,
  t: ReturnType<typeof useT>
): string[] {
  const tags: string[] = [];
  if (daysThis >= 6) tags.push(t.tagFullAttendance);
  else if (daysThis >= 4) tags.push(t.tagActive);
  const delta = daysThis - daysLast;
  if (delta >= 2 && daysLast > 0) tags.push(t.tagImproving);
  if (delta <= -2) tags.push(t.tagDeclining);
  if (daysThis === 0 && lesson >= 10) tags.push(t.tagDormantHp);
  if (daysThis >= 4 && registrations >= 2) tags.push(t.tagSuperConvert);
  return tags;
}

function computeActivationScore(daysLast: number, lesson: number): number {
  return Math.round(Math.min(daysLast / 6, 1) * 60 + Math.min(lesson / 15, 1) * 40);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function fmtRevenue(usd: number | null | undefined): string {
  return formatRevenue(usd);
}

function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString();
}

// ── Filter Bar（已移至 checkin/page.tsx 统一筛选栏，此处仅保留 GroupFilterBar）──

// ── Row expand ─────────────────────────────────────────────────────────────────

interface ExpandedRowProps {
  member: FollowupMember;
  colSpan: number;
  onClose: () => void;
}

function ExpandedRow({ member, colSpan, onClose }: ExpandedRowProps) {
  const t = useT();
  // Extract extra fields (everything beyond known columns)
  const KNOWN = new Set([
    'rank',
    'quality_score',
    'id',
    'enclosure',
    'responsible',
    'lesson_avg_3m',
    'referrals_this_month',
    'total_revenue_usd',
    'cc_last_contact_date',
    'days_until_card_expiry',
  ]);
  const extra = Object.fromEntries(Object.entries(member).filter(([k]) => !KNOWN.has(k)));

  return (
    <tr className="bg-[var(--bg-subtle)]">
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            {t.expandedTitle}
          </span>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs px-2 py-0.5 rounded hover:bg-[var(--n-200)] transition-colors"
          >
            {t.collapseBtn}
          </button>
        </div>

        {/* Known columns summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 mb-3 text-xs">
          {[
            [t.fieldStudentId, String(member.id)],
            [t.fieldEnclosure, member.enclosure || '—'],
            [t.fieldResponsible, member.responsible || '—'],
            [t.fieldQualityScore, String(member.quality_score)],
            [t.fieldLesson3m, fmtNum(member.lesson_avg_3m)],
            [t.fieldReferralThisMonth, fmtNum(member.referrals_this_month)],
            [t.fieldRevenue, fmtRevenue(member.total_revenue_usd)],
            [t.fieldLastContact, member.cc_last_contact_date || '—'],
            [t.fieldCardExpiry, fmtNum(member.days_until_card_expiry)],
          ].map(([label, val]) => (
            <div key={label} className="flex gap-2">
              <span className="text-[var(--text-muted)] w-24 shrink-0">{label}</span>
              <span className="text-[var(--text-primary)] font-medium">{val}</span>
            </div>
          ))}
        </div>

        {/* Extra D4 fields */}
        {Object.keys(extra).length > 0 && (
          <div className="rounded border border-[var(--border-subtle)] overflow-hidden">
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(extra).map(([key, val], idx) => (
                  <tr
                    key={key}
                    className={
                      idx % 2 === 0 ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-muted,#f9fafb)]'
                    }
                  >
                    <td
                      className="py-1 px-3 text-[var(--text-muted)] w-1/2 break-words"
                      title={key}
                    >
                      {key}
                    </td>
                    <td className="py-1 px-3 text-[var(--text-primary)] text-right break-all font-mono tabular-nums">
                      {val === null || val === undefined || val === '' ? '—' : String(val)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </td>
    </tr>
  );
}

// ── Activation Score Dot ───────────────────────────────────────────────────────

function ActivationDot({ score }: { score: number }) {
  const t = useT();
  const color =
    score >= 70
      ? 'bg-[var(--color-success)]'
      : score >= 40
        ? 'bg-[var(--color-warning)]'
        : 'bg-[var(--color-danger)]';
  return (
    <div className="flex items-center gap-1.5 justify-center">
      <span
        className={`w-2.5 h-2.5 rounded-full inline-block ${color}`}
        title={t.activationTitle(score)}
      />
      <span className="font-mono tabular-nums text-[var(--text-secondary)]">{score}</span>
    </div>
  );
}

// ── Priority Score Badge ────────────────────────────────────────────────────────

function PriorityBadge({ score }: { score: number }) {
  const color =
    score >= 60
      ? 'text-[var(--color-danger)] font-semibold'
      : score >= 30
        ? 'text-[var(--color-warning)] font-medium'
        : 'text-[var(--text-muted)]';
  const dot =
    score >= 60
      ? 'bg-[var(--color-danger)]'
      : score >= 30
        ? 'bg-[var(--color-warning)]'
        : 'bg-[var(--bg-subtle)]';
  return (
    <div className="flex items-center gap-1 justify-center">
      <span className={`w-2 h-2 rounded-full inline-block ${dot}`} />
      <span className={`font-mono tabular-nums text-xs ${color}`}>{score}</span>
    </div>
  );
}

// ── Channel Icon ────────────────────────────────────────────────────────────────

const CHANNEL_ICON: Record<string, string> = {
  line: '💬',
  sms: '✉️',
  phone: '📞',
  app: '📱',
};

function ChannelBadge({ channel }: { channel: string }) {
  const t = useT();
  const channelLabel: Record<string, string> = {
    line: t.chLine,
    sms: t.chSms,
    phone: t.chPhone,
    app: t.chApp,
  };
  return (
    <span title={channelLabel[channel] ?? channel} className="text-base leading-none">
      {CHANNEL_ICON[channel] ?? '📱'}
    </span>
  );
}

// ── Connection Status Dots ──────────────────────────────────────────────────────

function ConnStatusDots({ cc, ss, lp }: { cc: number; ss: number; lp: number }) {
  const t = useT();
  const dot = (val: number, label: string) => (
    <span
      title={`${label}: ${val === 1 ? t.connConnected : t.connNotConnected}`}
      className={`w-2 h-2 rounded-full inline-block ${
        val === 1
          ? 'bg-[var(--color-success)]'
          : val === 0
            ? 'bg-[var(--color-danger)]'
            : 'bg-[var(--bg-subtle)]'
      }`}
    />
  );
  return (
    <div className="flex items-center gap-1 justify-center">
      {dot(cc, 'CC')}
      {dot(ss, 'SS')}
      {dot(lp, 'LP')}
    </div>
  );
}

// ── Golden Window Badges ────────────────────────────────────────────────────────

function GoldenWindowBadges({ windows }: { windows: string[] }) {
  const t = useT();
  const windowLabel: Record<string, string> = {
    first_checkin: t.gwFirstCheckin,
    lead_no_show: t.gwLeadNoShow,
    renewal_window: t.gwRenewalWindow,
  };
  if (!windows || windows.length === 0) return <span className="text-[var(--text-muted)]">—</span>;
  return (
    <div className="flex flex-wrap gap-0.5">
      {windows.map((w) => (
        <span
          key={w}
          className="px-1 py-0.5 rounded text-[10px] bg-[var(--color-warning-surface)] text-[var(--color-warning)] whitespace-nowrap"
        >
          {windowLabel[w] ?? w}
        </span>
      ))}
    </div>
  );
}

// ── CC Contact Badge ────────────────────────────────────────────────────────────

function ContactBadge({ days }: { days: number | null }) {
  const t = useT();
  if (days === null) return <span className="text-[var(--text-muted)]">—</span>;
  if (days > 14)
    return (
      <span className="text-[var(--color-danger)] font-medium">
        {t.contactDaysAgo(days)}
        <span className="ml-1 px-1 py-0.5 bg-[var(--color-danger-surface)] text-[var(--color-danger)] rounded text-xs">
          {t.contactNeedCall}
        </span>
      </span>
    );
  if (days > 7)
    return (
      <span className="text-[var(--color-warning)] font-medium">{t.contactDaysAgo(days)}</span>
    );
  return <span className="text-[var(--color-success)]">{t.contactDaysAgo(days)}</span>;
}

// ── Group Filter Bar ────────────────────────────────────────────────────────────

interface GroupFilterBarProps {
  active: GroupFilter;
  onChange: (g: GroupFilter) => void;
}

function GroupFilterBar({
  active,
  onChange,
  exportHref,
}: GroupFilterBarProps & { exportHref?: string }) {
  const t = useT();
  const groupFilterLabels: Record<GroupFilter, string> = {
    all: t.filterAll,
    never: t.filterNever,
    was_active: t.filterWasActive,
    this_week: t.filterThisWeek,
    partial: t.filterPartial,
    card_expiry: t.filterCardExpiry,
    dormant_hp: t.filterDormantHp,
    handover: t.filterHandover,
    renewal_risk: t.filterRenewalRisk,
  };
  const groups: GroupFilter[] = [
    'all',
    'never',
    'was_active',
    'this_week',
    'partial',
    'card_expiry',
    'dormant_hp',
    'handover',
    'renewal_risk',
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 pb-2">
      <span className="text-xs text-[var(--text-muted)]">{t.segmentLabel}</span>
      <div className="flex flex-wrap rounded-lg border border-[var(--border-subtle)] overflow-hidden text-xs font-medium">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => onChange(g)}
            className={`px-3 py-1.5 transition-colors whitespace-nowrap ${
              active === g
                ? 'bg-[var(--n-800)] text-white'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {groupFilterLabels[g]}
          </button>
        ))}
      </div>
      {exportHref && (
        <a
          href={exportHref}
          download="followup.tsv"
          className="ml-auto px-3 py-1.5 text-xs font-medium border border-[var(--border-default)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors whitespace-nowrap"
        >
          {t.exportTsv}
        </a>
      )}
    </div>
  );
}

// ── Main Table ─────────────────────────────────────────────────────────────────

interface FollowupTableProps {
  items: FollowupMember[];
  onDrawerOpen: (member: FollowupMember) => void;
}

function FollowupTable({ items, onDrawerOpen }: FollowupTableProps) {
  const t = useT();
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  if (items.length === 0) {
    return <EmptyState title={t.emptyTitle} description={t.emptyDesc} />;
  }

  // 改造后共 20 列
  const COL_SPAN = 20;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="slide-thead-row text-xs">
            {/* 移动端常显 6 列 */}
            <th className="py-1.5 px-2 text-center whitespace-nowrap w-8">{t.thRank}</th>
            <th className="py-1.5 px-2 text-center whitespace-nowrap">{t.thPriority}</th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap">{t.thStudentId}</th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap">{t.thEnclosure}</th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap min-w-[80px]">{t.thCcOwner}</th>
            <th className="py-1.5 px-2 text-center whitespace-nowrap">{t.thCheckinWeekMonth}</th>
            {/* 平板+ 展开列 */}
            <th className="py-1.5 px-2 text-center whitespace-nowrap hidden md:table-cell">
              {t.thActivation}
            </th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap min-w-[80px] hidden md:table-cell">
              {t.thSsOwner}
            </th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap min-w-[80px] hidden md:table-cell">
              {t.thLpOwner}
            </th>
            <th className="py-1.5 px-2 text-center whitespace-nowrap hidden md:table-cell">
              {t.thCheckinLastMonth}
            </th>
            <th className="py-1.5 px-2 text-center whitespace-nowrap hidden lg:table-cell">
              {t.thConnStatus}
            </th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap min-w-[120px] hidden lg:table-cell">
              {t.thTags}
            </th>
            <th className="py-1.5 px-2 text-center whitespace-nowrap hidden lg:table-cell">
              {t.thChannel}
            </th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap min-w-[80px] hidden lg:table-cell">
              {t.thGoldenWindow}
            </th>
            <th className="py-1.5 px-2 text-right whitespace-nowrap hidden xl:table-cell">
              {t.thLesson}
            </th>
            <th className="py-1.5 px-2 text-right whitespace-nowrap hidden xl:table-cell">
              {t.thReferral}
            </th>
            <th className="py-1.5 px-2 text-right whitespace-nowrap hidden xl:table-cell">
              {t.thRevenue}
            </th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap hidden xl:table-cell">
              {t.thLastContact}
            </th>
            <th className="py-1.5 px-2 text-center whitespace-nowrap hidden xl:table-cell">
              {t.thIncentive}
            </th>
            <th className="py-1.5 px-2 text-right whitespace-nowrap hidden xl:table-cell">
              {t.thCardExpiry}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((m) => {
            const isHighQuality = m.quality_score >= 70;
            const expanded = expandedId === m.id;
            const daysSinceContact = daysSince(m.cc_last_contact_date);
            const cardExpirySoon =
              m.days_until_card_expiry !== null &&
              m.days_until_card_expiry !== undefined &&
              m.days_until_card_expiry <= 30;

            // 打卡天数（优先从顶层字段，fallback extra）
            const daysThis = m.days_this_month ?? Number(m.extra?.['本月打卡天数'] ?? 0);
            const daysLast = Number(m.extra?.['上月打卡天数'] ?? 0);
            const daysThisWeek = m.days_this_week ?? 0;
            const lessonVal = m.lesson_avg_3m ?? 0;
            const regsVal = m.referrals_this_month ?? 0;

            // 客户端标签计算
            const clientTags = computeClientTags(daysThis, daysLast, lessonVal, regsVal, t);
            // 激活概率
            const activationScore = computeActivationScore(daysLast, lessonVal);

            return (
              <Fragment key={m.id}>
                <tr
                  onClick={() => {
                    if (expanded) {
                      setExpandedId(null);
                    } else {
                      setExpandedId(m.id);
                    }
                  }}
                  className={`cursor-pointer transition-colors even:bg-[var(--bg-subtle)] hover:bg-action-accent-surface relative ${
                    expanded ? 'bg-action-accent-surface' : ''
                  }`}
                  style={
                    isHighQuality
                      ? { borderLeft: '4px solid #f97316' }
                      : { borderLeft: '4px solid transparent' }
                  }
                >
                  {/* ── 移动端常显 6 列 ── */}
                  {/* 排名 */}
                  <td className="py-1 px-2 text-center font-mono tabular-nums text-[var(--text-muted)]">
                    {m.rank}
                  </td>
                  {/* 优先级 */}
                  <td className="py-1 px-2 text-center">
                    <PriorityBadge score={m.action_priority_score ?? 0} />
                  </td>
                  {/* 学员ID */}
                  <td className="py-1 px-2 text-action-accent font-medium font-mono tabular-nums whitespace-nowrap">
                    {m.id}
                  </td>
                  {/* 围场 */}
                  <td className="py-1 px-2 text-[var(--text-secondary)] whitespace-nowrap">
                    {m.enclosure || '—'}
                  </td>
                  {/* CC 负责人 */}
                  <td className="py-1 px-2 whitespace-nowrap" title={m.responsible ?? ''}>
                    {m.responsible || '—'}
                  </td>
                  {/* 本周/月打卡 */}
                  <td className="py-1 px-2 text-center font-mono tabular-nums">
                    <div className="flex flex-col items-center leading-tight">
                      <span
                        className={
                          daysThisWeek === 0
                            ? 'text-[var(--text-muted)]'
                            : 'text-[var(--color-success)] font-semibold'
                        }
                        title={t.thisWeekPrefix}
                      >
                        {t.thisWeekPrefix} {daysThisWeek}
                      </span>
                      <span
                        className={`text-[10px] ${
                          daysThis === 0
                            ? 'text-[var(--text-muted)]'
                            : daysThis >= 5
                              ? 'text-[var(--color-success)]'
                              : 'text-[var(--text-secondary)]'
                        }`}
                        title={t.thisMonthPrefix}
                      >
                        {t.thisMonthPrefix} {daysThis}/6
                      </span>
                    </div>
                  </td>
                  {/* ── 平板+ (md) ── */}
                  {/* 激活概率 */}
                  <td className="py-1 px-2 hidden md:table-cell">
                    <ActivationDot score={activationScore} />
                  </td>
                  {/* SS 负责人 */}
                  <td
                    className="py-1 px-2 whitespace-nowrap text-[var(--text-secondary)] hidden md:table-cell"
                    title={m.ss_name ?? ''}
                  >
                    {m.ss_name || '—'}
                  </td>
                  {/* LP 负责人 */}
                  <td
                    className="py-1 px-2 whitespace-nowrap text-[var(--text-secondary)] hidden md:table-cell"
                    title={m.lp_name ?? ''}
                  >
                    {m.lp_name || '—'}
                  </td>
                  {/* 上月打卡 */}
                  <td className="py-1 px-2 text-center font-mono tabular-nums text-[var(--text-muted)] hidden md:table-cell">
                    {daysLast}/6
                  </td>
                  {/* ── 桌面 (lg) ── */}
                  {/* CC/SS/LP 接通状态 */}
                  <td className="py-1 px-2 hidden lg:table-cell">
                    <ConnStatusDots
                      cc={m.cc_connected ?? 0}
                      ss={m.ss_connected ?? 0}
                      lp={m.lp_connected ?? 0}
                    />
                  </td>
                  {/* 标签 */}
                  <td className="py-1 px-2 min-w-[120px] hidden lg:table-cell">
                    {clientTags.length > 0 ? (
                      <StudentTagBadge tags={clientTags} maxVisible={2} />
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  {/* 推荐渠道 */}
                  <td className="py-1 px-2 text-center hidden lg:table-cell">
                    <ChannelBadge channel={m.recommended_channel ?? 'app'} />
                  </td>
                  {/* 黄金窗口 */}
                  <td className="py-1 px-2 min-w-[80px] hidden lg:table-cell">
                    <GoldenWindowBadges windows={m.golden_window ?? []} />
                  </td>
                  {/* ── 宽屏 (xl) ── */}
                  {/* 课耗 */}
                  <td className="py-1 px-2 text-right font-mono tabular-nums hidden xl:table-cell">
                    {fmtNum(m.lesson_avg_3m)}
                  </td>
                  {/* 本月推荐 */}
                  <td className="py-1 px-2 text-right font-mono tabular-nums hidden xl:table-cell">
                    {fmtNum(m.referrals_this_month)}
                  </td>
                  {/* 历史付费 */}
                  <td className="py-1 px-2 text-right font-mono tabular-nums hidden xl:table-cell">
                    {fmtRevenue(m.total_revenue_usd)}
                  </td>
                  {/* CC末次联系 */}
                  <td className="py-1 px-2 whitespace-nowrap hidden xl:table-cell">
                    <ContactBadge days={daysSinceContact} />
                  </td>
                  {/* 激励状态 */}
                  <td className="py-1 px-2 text-center hidden xl:table-cell">
                    {m.incentive_status ? (
                      <span className="px-1 py-0.5 rounded text-[10px] bg-[var(--color-success-surface)] text-[var(--color-success)] whitespace-nowrap">
                        {m.incentive_status}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  {/* 卡到期 */}
                  <td
                    className={`py-1 px-2 text-right font-mono tabular-nums hidden xl:table-cell ${
                      cardExpirySoon
                        ? 'text-orange-500 font-medium'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {m.days_until_card_expiry === null || m.days_until_card_expiry === undefined
                      ? '—'
                      : m.days_until_card_expiry <= -9000
                        ? '—'
                        : String(Math.round(m.days_until_card_expiry))}
                  </td>
                </tr>

                {expanded && (
                  <ExpandedRow member={m} colSpan={COL_SPAN} onClose={() => setExpandedId(null)} />
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Bottom Stats ───────────────────────────────────────────────────────────────

interface BottomStatsProps {
  total: number;
  avgScore: number;
  highQualityCount: number;
}

function BottomStats({ total, avgScore, highQualityCount }: BottomStatsProps) {
  const t = useT();
  const pct = total > 0 ? ((highQualityCount / total) * 100).toFixed(1) : '0.0';
  return (
    <div className="flex flex-wrap gap-6 pt-3 mt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
      <span>
        {t.statsTotalPrefix && <>{t.statsTotalPrefix} </>}
        <strong className="text-[var(--text-primary)] font-semibold font-mono tabular-nums">
          {total}
        </strong>{' '}
        {t.statsTotalSuffix}
      </span>
      <span title="课耗(40%) + 推荐活跃(30%) + 付费贡献(20%) + 围场加权(10%)">
        {t.statsAvgScore}{' '}
        <strong className="text-[var(--text-primary)] font-semibold font-mono tabular-nums">
          {(avgScore ?? 0).toFixed(1)}
        </strong>
        <span className="ml-1 cursor-help opacity-60">ⓘ</span>
      </span>
      <span>
        {t.statsHighQuality}{' '}
        <strong className="text-orange-500 font-semibold font-mono tabular-nums">{pct}%</strong> (
        {t.statsHighQualityCount(highQualityCount)})
      </span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface FollowupTabProps {
  activeRoles?: string[];
  roleEnclosures?: Record<string, string[]>;
  enclosureFilter?: string | null;
  roleFilter?: string;
  teamFilter?: string;
  salesSearch?: string;
}

export function FollowupTab({
  activeRoles: activeRolesProp,
  enclosureFilter,
  roleFilter = 'CC',
  teamFilter = '',
  salesSearch = '',
}: FollowupTabProps) {
  const t = useT();
  const { configJson, activeRoles: hookActiveRoles } = useWideConfig();

  // 优先使用 hook 内部读取的值，props 作为备用
  const activeRoles = hookActiveRoles.length > 0 ? hookActiveRoles : (activeRolesProp ?? []);
  void activeRoles; // 仅用于类型保留，实际 role 由 page 级 roleFilter 控制

  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');

  // Drawer state
  const [drawerMember, setDrawerMember] = useState<FollowupMember | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Build base path — role/sales/enclosure/role_config 由 basePath 携带
  // teamFilter 和全局 focusCC 由 useFilteredSWR 从 config-store 自动注入
  // 若 page 传入 teamFilter，通过 extraParams 覆盖 store 的值（最终优先级最高）
  const basePath = useMemo(() => {
    const p = new URLSearchParams({ role: roleFilter });
    if (salesSearch.trim()) p.set('sales', salesSearch.trim());
    if (enclosureFilter) p.set('enclosure', enclosureFilter);
    p.set('role_config', configJson);
    return `/api/checkin/followup?${p.toString()}`;
  }, [roleFilter, salesSearch, enclosureFilter, configJson]);

  const extraParams = useMemo(() => (teamFilter ? { team: teamFilter } : undefined), [teamFilter]);

  const {
    data: raw,
    isLoading,
    error,
  } = useFilteredSWR<FollowupResponseRaw>(basePath, undefined, extraParams);

  // 适配后端字段名 → 前端 FollowupMember 接口
  const data: FollowupResponse | undefined = raw
    ? (() => {
        // 后端用 students[] 返回，字段名与前端接口不同，需要逐一映射
        const backendStudents: BackendStudent[] =
          (raw.students as BackendStudent[] | undefined) ?? [];
        const items: FollowupMember[] = backendStudents.map((s, idx) => ({
          rank: idx + 1,
          quality_score: s.quality_score ?? 0,
          id: s.student_id,
          enclosure: s.enclosure,
          responsible: s.cc_name,
          lesson_avg_3m: s.lesson_consumption_3m,
          referrals_this_month: s.referral_registrations ?? 0,
          total_revenue_usd: null,
          cc_last_contact_date: s.cc_last_call_date,
          days_until_card_expiry: s.card_days_remaining,
          team: s.team,
          extra: s.extra ?? {},
          // 新增字段
          ss_name: s.ss_name ?? null,
          ss_group: s.ss_group ?? null,
          lp_name: s.lp_name ?? null,
          lp_group: s.lp_group ?? null,
          weeks_active: s.weeks_active ?? 0,
          days_this_week: s.days_this_week ?? 0,
          days_this_month: s.days_this_month ?? 0,
          cc_connected: s.cc_connected ?? 0,
          ss_connected: s.ss_connected ?? 0,
          lp_connected: s.lp_connected ?? 0,
          cc_last_note_date: s.cc_last_note_date ?? null,
          cc_last_note_content: s.cc_last_note_content ?? null,
          renewal_days_ago: s.renewal_days_ago ?? null,
          incentive_status: s.incentive_status ?? null,
          action_priority_score: s.action_priority_score ?? 0,
          recommended_channel: s.recommended_channel ?? 'app',
          golden_window: s.golden_window ?? [],
          // 展开 extra 字段（D4 全量字段，用于 ExpandedRow 展示）
          ...(s.extra ?? {}),
        }));

        const scores = items.map((s) => s.quality_score ?? 0);
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const highCount = scores.filter((s) => s >= 70).length;
        const teamSet = new Set(items.map((s) => s.team as string).filter(Boolean));
        return {
          items,
          total: raw.total ?? items.length,
          avg_quality_score: raw.avg_quality_score ?? avg,
          high_quality_count: raw.high_quality_count ?? highCount,
          teams: raw.teams ?? Array.from(teamSet).sort(),
        };
      })()
    : undefined;

  // 分群过滤（纯前端）
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    let items = data.items;

    // 分群逻辑
    if (groupFilter !== 'all') {
      items = items.filter((m) => {
        const daysThis = m.days_this_month ?? Number(m.extra?.['本月打卡天数'] ?? 0);
        const daysLast = Number(m.extra?.['上月打卡天数'] ?? 0);
        const daysThisWeek = m.days_this_week ?? 0;
        const cardDays = m.days_until_card_expiry;
        const lessonVal = m.lesson_avg_3m ?? 0;
        const renewalDays = m.renewal_days_ago;
        if (groupFilter === 'never') return daysThis === 0 && daysLast === 0;
        if (groupFilter === 'was_active') return daysLast > 0 && daysThis === 0;
        if (groupFilter === 'this_week') return daysThis > 0 && daysThisWeek === 0;
        if (groupFilter === 'partial') return daysThis > 0;
        if (groupFilter === 'card_expiry')
          return cardDays !== null && cardDays !== undefined && cardDays <= 30;
        if (groupFilter === 'dormant_hp') return daysThis === 0 && lessonVal >= 10;
        if (groupFilter === 'handover') {
          // 围场边界：卡到期天数在 25-35 天附近（即将进入下一围场）
          return cardDays !== null && cardDays !== undefined && cardDays >= 25 && cardDays <= 35;
        }
        if (groupFilter === 'renewal_risk')
          return renewalDays !== null && renewalDays !== undefined && renewalDays > 180;
        return true;
      });
    }

    return items;
  }, [data?.items, groupFilter]);

  // 导出 TSV 链接（携带当前 role/team/sales 筛选）
  const exportHref = useMemo(() => {
    const p = new URLSearchParams({ role: roleFilter });
    if (teamFilter) p.set('team', teamFilter);
    if (salesSearch.trim()) p.set('cc_name', salesSearch.trim());
    return `/api/checkin/followup/tsv?${p.toString()}`;
  }, [roleFilter, teamFilter, salesSearch]);

  return (
    <div className="space-y-4">
      {/* L2 分群筛选（Tab 专属，紧凑 pill 行）+ 导出按钮 */}
      <GroupFilterBar active={groupFilter} onChange={setGroupFilter} exportHref={exportHref} />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <EmptyState title={t.errorTitle} description={t.errorDesc} />
      ) : !data || filteredItems.length === 0 ? (
        <EmptyState title={t.emptyTitle} description={t.emptyDesc} />
      ) : (
        <>
          <FollowupTable
            items={filteredItems}
            onDrawerOpen={(m) => {
              setDrawerMember(m);
              setDrawerOpen(true);
            }}
          />
          <BottomStats
            total={filteredItems.length}
            avgScore={data.avg_quality_score}
            highQualityCount={data.high_quality_count}
          />
        </>
      )}

      {/* Detail drawer */}
      <MemberDetailDrawer
        student={
          drawerMember
            ? ({
                ...drawerMember,
                total_revenue_usd: drawerMember.total_revenue_usd ?? undefined,
                days_until_card_expiry: drawerMember.days_until_card_expiry ?? undefined,
                cc_last_call_date: drawerMember.cc_last_contact_date ?? undefined,
                lesson_consumed_this_month: drawerMember.lesson_avg_3m ?? undefined,
                referral_code_count_this_month: drawerMember.referrals_this_month ?? undefined,
              } as Parameters<typeof MemberDetailDrawer>[0]['student'])
            : null
        }
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerMember(null);
        }}
      />
    </div>
  );
}
