'use client';

import { useState, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { formatRevenue, formatRate, metricColor } from '@/lib/utils';
import { useExport } from '@/lib/use-export';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ExportButton } from '@/components/ui/ExportButton';
import type { CCPerformanceRecord, CCPerformanceTeamSummary } from '@/lib/types/cc-performance';
import { CCPerformanceDetail } from './CCPerformanceDetail';

// ── Inline I18N ───────────────────────────────────────────
type Locale = 'zh' | 'zh-TW' | 'en' | 'th';

const I18N = {
  zh: {
    // col groups
    basicInfo: '基础信息',
    performance: '业绩',
    funnel: '漏斗',
    conversionRate: '转化率',
    processMetrics: '过程指标',
    outreachCoverage: '拨打覆盖',
    pace: '节奏',
    // toolbar
    searchPlaceholder: '搜索 CC 姓名...',
    allTeams: '全部团队',
    targetMode: '达标',
    bmMode: 'BM',
    viewModeTooltip: '切换参照系：月度目标 vs BM 节奏期望',
    // table headers
    ranking: '排名',
    ccName: 'CC 姓名',
    team: '团队',
    students: '学员数',
    studentsTooltip: '管辖有效学员数',
    bmExpected: 'BM 期望',
    performanceTarget: '业绩目标',
    bmExpectedTooltip: '目标 × 当前时间进度',
    actualPerformance: '实际业绩',
    vsBM: 'vs BM',
    gap: '差额',
    vsBMTooltip: '实际 − BM 期望（正=领先，负=落后）',
    targetGapTooltip: '实际 − 月目标',
    bmAchievement: 'BM 达成',
    achievement: '达成率',
    leadsBM: '注册 BM',
    leadsTarget: '注册目标',
    leadsActual: '注册实际',
    leadsVsBM: '注册 vs BM',
    leadsGap: '注册差额',
    leadsVsBMTooltip: '注册实际 − BM 期望',
    leadsGapTooltip: '注册实际 − 目标',
    showupBM: '出席 BM',
    showupTarget: '出席目标',
    showupActual: '出席实际',
    showupVsBM: '出席 vs BM',
    showupGap: '出席差额',
    showupVsBMTooltip: '出席实际 − BM 期望',
    showupGapTooltip: '出席实际 − 目标',
    paidBM: '付费 BM',
    paidTarget: '付费目标',
    paidActual: '付费实际',
    paidVsBM: '付费 vs BM',
    paidGap: '付费差额',
    paidVsBMTooltip: '付费实际 − BM 期望',
    paidGapTooltip: '付费实际 − 目标',
    asp: '客单价',
    aspTooltip: '平均订单金额 (USD)',
    showupToPaid: '出席→付费',
    leadsToPaid: '注册→付费',
    participationRate: '参与率',
    participationRateTooltip: '带来≥1注册的学员 / 有效学员',
    checkinRate: '打卡率',
    checkinRateTooltip: '转码且分享的学员 / 有效学员',
    reachRate: '触达率',
    reachRateTooltip: '有效通话(≥120s)学员 / 有效学员',
    coefficient: '带新系数',
    coefficientTooltip: 'B注册数 / 带来注册的A学员数',
    callTarget: '拨打目标',
    callActual: '拨打实际',
    callCoverage: '覆盖率',
    connectedCount: '接通数',
    effectiveCount: '有效接通',
    currentDailyAvg: '当前日均',
    currentDailyAvgTooltip: '当前业绩节奏',
    remainingDailyAvg: '达标需日均',
    remainingDailyAvgTooltip: '完成月目标每天需新增业绩',
    efficiencyLift: '效率提升',
    efficiencyLiftTooltip: '需要相对当前日均提升的幅度',
    // result count
    total: '共',
    ccUnit: '位 CC',
    searching: '搜索「',
    searchingEnd: '」',
    // row
    expandTitle: '点击展开详情',
    // tfoot
    subtotal: '小计',
    headcountUnit: '人',
    // states
    loadFailTitle: '数据加载失败',
    loadFailDesc: '无法获取 CC 个人业绩数据，请检查后端服务是否正常运行',
    retry: '重试',
    emptyTitle: '暂无 CC 业绩数据',
    emptyDesc: '请先上传本月数据文件，后端处理后自动展示',
    // export labels
    exportCCName: 'CC 姓名',
    exportTeam: '团队',
    exportStudents: '学员数',
    exportRevenue: '业绩(USD)',
    exportRevenueTarget: '业绩目标(USD)',
    exportAchievement: '业绩达成率',
    exportLeads: '注册数',
    exportPaid: '付费数',
    exportParticipation: '参与率',
    exportCheckin: '打卡率',
    exportReach: '触达率',
    exportFilename: 'CC个人业绩',
  },
  'zh-TW': {
    basicInfo: '基本資訊',
    performance: '業績',
    funnel: '漏斗',
    conversionRate: '轉化率',
    processMetrics: '過程指標',
    outreachCoverage: '撥打覆蓋',
    pace: '節奏',
    searchPlaceholder: '搜尋 CC 姓名...',
    allTeams: '全部團隊',
    targetMode: '達標',
    bmMode: 'BM',
    viewModeTooltip: '切換參照系：月度目標 vs BM 節奏期望',
    ranking: '排名',
    ccName: 'CC 姓名',
    team: '團隊',
    students: '學員數',
    studentsTooltip: '管轄有效學員數',
    bmExpected: 'BM 期望',
    performanceTarget: '業績目標',
    bmExpectedTooltip: '目標 × 當前時間進度',
    actualPerformance: '實際業績',
    vsBM: 'vs BM',
    gap: '差額',
    vsBMTooltip: '實際 − BM 期望（正=領先，負=落後）',
    targetGapTooltip: '實際 − 月目標',
    bmAchievement: 'BM 達成',
    achievement: '達成率',
    leadsBM: '註冊 BM',
    leadsTarget: '註冊目標',
    leadsActual: '註冊實際',
    leadsVsBM: '註冊 vs BM',
    leadsGap: '註冊差額',
    leadsVsBMTooltip: '註冊實際 − BM 期望',
    leadsGapTooltip: '註冊實際 − 目標',
    showupBM: '出席 BM',
    showupTarget: '出席目標',
    showupActual: '出席實際',
    showupVsBM: '出席 vs BM',
    showupGap: '出席差額',
    showupVsBMTooltip: '出席實際 − BM 期望',
    showupGapTooltip: '出席實際 − 目標',
    paidBM: '付款 BM',
    paidTarget: '付款目標',
    paidActual: '付款實際',
    paidVsBM: '付款 vs BM',
    paidGap: '付款差額',
    paidVsBMTooltip: '付款實際 − BM 期望',
    paidGapTooltip: '付款實際 − 目標',
    asp: '客單價',
    aspTooltip: '平均訂單金額 (USD)',
    showupToPaid: '出席→付款',
    leadsToPaid: '註冊→付款',
    participationRate: '參與率',
    participationRateTooltip: '帶來≥1註冊的學員 / 有效學員',
    checkinRate: '打卡率',
    checkinRateTooltip: '轉碼且分享的學員 / 有效學員',
    reachRate: '觸達率',
    reachRateTooltip: '有效通話(≥120s)學員 / 有效學員',
    coefficient: '帶新係數',
    coefficientTooltip: 'B註冊數 / 帶來註冊的A學員數',
    callTarget: '撥打目標',
    callActual: '撥打實際',
    callCoverage: '覆蓋率',
    connectedCount: '接通數',
    effectiveCount: '有效接通',
    currentDailyAvg: '當前日均',
    currentDailyAvgTooltip: '當前業績節奏',
    remainingDailyAvg: '達標需日均',
    remainingDailyAvgTooltip: '完成月目標每天需新增業績',
    efficiencyLift: '效率提升',
    efficiencyLiftTooltip: '需要相對當前日均提升的幅度',
    total: '共',
    ccUnit: '位 CC',
    searching: '搜尋「',
    searchingEnd: '」',
    expandTitle: '點擊展開詳情',
    subtotal: '小計',
    headcountUnit: '人',
    loadFailTitle: '資料載入失敗',
    loadFailDesc: '無法獲取 CC 個人業績資料，請檢查後端服務是否正常運行',
    retry: '重試',
    emptyTitle: '暫無 CC 業績資料',
    emptyDesc: '請先上傳本月資料檔案，後端處理後自動展示',
    exportCCName: 'CC 姓名',
    exportTeam: '團隊',
    exportStudents: '學員數',
    exportRevenue: '業績(USD)',
    exportRevenueTarget: '業績目標(USD)',
    exportAchievement: '業績達成率',
    exportLeads: '註冊數',
    exportPaid: '付款數',
    exportParticipation: '參與率',
    exportCheckin: '打卡率',
    exportReach: '觸達率',
    exportFilename: 'CC個人業績',
  },
  en: {
    basicInfo: 'Basic Info',
    performance: 'Performance',
    funnel: 'Funnel',
    conversionRate: 'Conversion',
    processMetrics: 'Process',
    outreachCoverage: 'Outreach',
    pace: 'Pace',
    searchPlaceholder: 'Search CC name...',
    allTeams: 'All Teams',
    targetMode: 'Target',
    bmMode: 'BM',
    viewModeTooltip: 'Switch reference: Monthly Target vs BM Pace',
    ranking: 'Rank',
    ccName: 'CC Name',
    team: 'Team',
    students: 'Students',
    studentsTooltip: 'Active students managed',
    bmExpected: 'BM Expected',
    performanceTarget: 'Target',
    bmExpectedTooltip: 'Target × current time progress',
    actualPerformance: 'Actual',
    vsBM: 'vs BM',
    gap: 'Gap',
    vsBMTooltip: 'Actual − BM Expected (positive=ahead, negative=behind)',
    targetGapTooltip: 'Actual − Monthly Target',
    bmAchievement: 'BM Ach.',
    achievement: 'Achievement',
    leadsBM: 'Reg. BM',
    leadsTarget: 'Reg. Target',
    leadsActual: 'Reg. Actual',
    leadsVsBM: 'Reg. vs BM',
    leadsGap: 'Reg. Gap',
    leadsVsBMTooltip: 'Registration Actual − BM Expected',
    leadsGapTooltip: 'Registration Actual − Target',
    showupBM: 'Attend. BM',
    showupTarget: 'Attend. Target',
    showupActual: 'Attend. Actual',
    showupVsBM: 'Attend. vs BM',
    showupGap: 'Attend. Gap',
    showupVsBMTooltip: 'Attendance Actual − BM Expected',
    showupGapTooltip: 'Attendance Actual − Target',
    paidBM: 'Payment BM',
    paidTarget: 'Payment Target',
    paidActual: 'Payment Actual',
    paidVsBM: 'Payment vs BM',
    paidGap: 'Payment Gap',
    paidVsBMTooltip: 'Payment Actual − BM Expected',
    paidGapTooltip: 'Payment Actual − Target',
    asp: 'ASP',
    aspTooltip: 'Avg. order value (USD)',
    showupToPaid: 'Attend.→Paid',
    leadsToPaid: 'Reg.→Paid',
    participationRate: 'Participation',
    participationRateTooltip: 'Students with ≥1 registration / Active students',
    checkinRate: 'Check-in',
    checkinRateTooltip: 'Students who shared / Active students',
    reachRate: 'Reach Rate',
    reachRateTooltip: 'Students with effective call (≥120s) / Active students',
    coefficient: 'Bring-new Coeff.',
    coefficientTooltip: 'B registrations / A students who brought registrations',
    callTarget: 'Call Target',
    callActual: 'Calls Made',
    callCoverage: 'Coverage',
    connectedCount: 'Connected',
    effectiveCount: 'Effective',
    currentDailyAvg: 'Daily Avg.',
    currentDailyAvgTooltip: 'Current performance pace',
    remainingDailyAvg: 'Req. Daily Avg.',
    remainingDailyAvgTooltip: 'Daily performance needed to hit monthly target',
    efficiencyLift: 'Efficiency Lift',
    efficiencyLiftTooltip: 'Required improvement vs current daily avg.',
    total: 'Total',
    ccUnit: 'CCs',
    searching: 'Searching "',
    searchingEnd: '"',
    expandTitle: 'Click to expand details',
    subtotal: 'Subtotal',
    headcountUnit: ' members',
    loadFailTitle: 'Failed to Load Data',
    loadFailDesc:
      'Unable to fetch CC performance data. Please check if the backend service is running.',
    retry: 'Retry',
    emptyTitle: 'No CC Performance Data',
    emptyDesc: "Please upload this month's data file. Data will appear after backend processing.",
    exportCCName: 'CC Name',
    exportTeam: 'Team',
    exportStudents: 'Students',
    exportRevenue: 'Performance (USD)',
    exportRevenueTarget: 'Target (USD)',
    exportAchievement: 'Achievement Rate',
    exportLeads: 'Registrations',
    exportPaid: 'Payments',
    exportParticipation: 'Participation Rate',
    exportCheckin: 'Check-in Rate',
    exportReach: 'Reach Rate',
    exportFilename: 'CC_Performance',
  },
  th: {
    basicInfo: 'ข้อมูลพื้นฐาน',
    performance: 'ผลงาน',
    funnel: 'ช่องทาง',
    conversionRate: 'อัตราแปลง',
    processMetrics: 'ตัวชี้วัดกระบวนการ',
    outreachCoverage: 'การโทรออก',
    pace: 'อัตราความเร็ว',
    searchPlaceholder: 'ค้นหาชื่อ CC...',
    allTeams: 'ทุกทีม',
    targetMode: 'เป้าหมาย',
    bmMode: 'BM',
    viewModeTooltip: 'สลับโหมด: เป้าหมายรายเดือน vs BM',
    ranking: 'อันดับ',
    ccName: 'ชื่อ CC',
    team: 'ทีม',
    students: 'นักเรียน',
    studentsTooltip: 'จำนวนนักเรียนที่ดูแล',
    bmExpected: 'BM คาดหวัง',
    performanceTarget: 'เป้าหมาย',
    bmExpectedTooltip: 'เป้าหมาย × ความคืบหน้าเวลาปัจจุบัน',
    actualPerformance: 'ผลงานจริง',
    vsBM: 'vs BM',
    gap: 'ส่วนต่าง',
    vsBMTooltip: 'จริง − BM (บวก=นำหน้า, ลบ=ล้าหลัง)',
    targetGapTooltip: 'จริง − เป้าหมายรายเดือน',
    bmAchievement: 'บรรลุ BM',
    achievement: 'อัตราบรรลุ',
    leadsBM: 'ลงทะเบียน BM',
    leadsTarget: 'เป้าลงทะเบียน',
    leadsActual: 'ลงทะเบียนจริง',
    leadsVsBM: 'ลงทะเบียน vs BM',
    leadsGap: 'ส่วนต่างลงทะเบียน',
    leadsVsBMTooltip: 'ลงทะเบียนจริง − BM คาดหวัง',
    leadsGapTooltip: 'ลงทะเบียนจริง − เป้าหมาย',
    showupBM: 'เข้าร่วม BM',
    showupTarget: 'เป้าเข้าร่วม',
    showupActual: 'เข้าร่วมจริง',
    showupVsBM: 'เข้าร่วม vs BM',
    showupGap: 'ส่วนต่างเข้าร่วม',
    showupVsBMTooltip: 'เข้าร่วมจริง − BM คาดหวัง',
    showupGapTooltip: 'เข้าร่วมจริง − เป้าหมาย',
    paidBM: 'ชำระเงิน BM',
    paidTarget: 'เป้าชำระเงิน',
    paidActual: 'ชำระเงินจริง',
    paidVsBM: 'ชำระเงิน vs BM',
    paidGap: 'ส่วนต่างชำระเงิน',
    paidVsBMTooltip: 'ชำระเงินจริง − BM คาดหวัง',
    paidGapTooltip: 'ชำระเงินจริง − เป้าหมาย',
    asp: 'ราคาต่อออเดอร์',
    aspTooltip: 'มูลค่าออเดอร์เฉลี่ย (USD)',
    showupToPaid: 'เข้าร่วม→ชำระ',
    leadsToPaid: 'ลงทะเบียน→ชำระ',
    participationRate: 'อัตราการมีส่วนร่วม',
    participationRateTooltip: 'นักเรียนที่มี ≥1 การลงทะเบียน / นักเรียนที่ใช้งาน',
    checkinRate: 'อัตราเช็คอิน',
    checkinRateTooltip: 'นักเรียนที่แชร์ / นักเรียนที่ใช้งาน',
    reachRate: 'อัตราการเข้าถึง',
    reachRateTooltip: 'นักเรียนที่โทรได้ผล (≥120s) / นักเรียนที่ใช้งาน',
    coefficient: 'สัมประสิทธิ์ชวนใหม่',
    coefficientTooltip: 'จำนวนการลงทะเบียน B / จำนวน A ที่ชวน',
    callTarget: 'เป้าการโทร',
    callActual: 'โทรจริง',
    callCoverage: 'ความครอบคลุม',
    connectedCount: 'ติดต่อได้',
    effectiveCount: 'โทรมีผล',
    currentDailyAvg: 'เฉลี่ยต่อวัน',
    currentDailyAvgTooltip: 'อัตราผลงานปัจจุบัน',
    remainingDailyAvg: 'เฉลี่ยที่ต้องการ',
    remainingDailyAvgTooltip: 'ผลงานต่อวันที่ต้องการเพื่อบรรลุเป้า',
    efficiencyLift: 'การยกระดับประสิทธิภาพ',
    efficiencyLiftTooltip: 'การปรับปรุงที่จำเป็นเทียบกับเฉลี่ยต่อวันปัจจุบัน',
    total: 'ทั้งหมด',
    ccUnit: 'CC',
    searching: 'ค้นหา "',
    searchingEnd: '"',
    expandTitle: 'คลิกเพื่อขยายรายละเอียด',
    subtotal: 'ยอดรวม',
    headcountUnit: ' คน',
    loadFailTitle: 'โหลดข้อมูลไม่สำเร็จ',
    loadFailDesc: 'ไม่สามารถดึงข้อมูลผลงาน CC ได้ กรุณาตรวจสอบว่าบริการ backend ทำงานอยู่',
    retry: 'ลองอีกครั้ง',
    emptyTitle: 'ไม่มีข้อมูลผลงาน CC',
    emptyDesc: 'กรุณาอัปโหลดไฟล์ข้อมูลเดือนนี้ ข้อมูลจะแสดงหลังจาก backend ประมวลผล',
    exportCCName: 'ชื่อ CC',
    exportTeam: 'ทีม',
    exportStudents: 'นักเรียน',
    exportRevenue: 'ผลงาน (USD)',
    exportRevenueTarget: 'เป้าหมาย (USD)',
    exportAchievement: 'อัตราบรรลุ',
    exportLeads: 'การลงทะเบียน',
    exportPaid: 'การชำระเงิน',
    exportParticipation: 'อัตราการมีส่วนร่วม',
    exportCheckin: 'อัตราเช็คอิน',
    exportReach: 'อัตราการเข้าถึง',
    exportFilename: 'CC_ผลงาน',
  },
} as const;

function useT() {
  const locale = useLocale() as Locale;
  return I18N[locale] ?? I18N['zh'];
}

// ── 视图模式 ─────────────────────────────────────────────
export type ViewMode = 'target' | 'bm';

// ── 列组定义 ──────────────────────────────────────────────

type ColGroupKey =
  | 'identity'
  | 'revenue'
  | 'referral'
  | 'funnel'
  | 'conversion'
  | 'process'
  | 'outreach'
  | 'pace';

interface ColGroup {
  key: ColGroupKey;
  labelKey: keyof (typeof I18N)['zh'];
  defaultVisible: boolean;
}

const COL_GROUPS: ColGroup[] = [
  { key: 'identity', labelKey: 'basicInfo', defaultVisible: true },
  { key: 'revenue', labelKey: 'performance', defaultVisible: true },
  { key: 'funnel', labelKey: 'funnel', defaultVisible: true },
  { key: 'conversion', labelKey: 'conversionRate', defaultVisible: true },
  { key: 'process', labelKey: 'processMetrics', defaultVisible: true },
  { key: 'outreach', labelKey: 'outreachCoverage', defaultVisible: false },
  { key: 'pace', labelKey: 'pace', defaultVisible: false },
];

// ── 达成率色彩 ──────────────────────────────────────────

function achievementTextClass(pct: number | null): string {
  if (pct == null) return 'text-[var(--text-muted)]';
  if (pct >= 1) return 'text-[var(--color-success)] font-semibold';
  if (pct >= 0.8) return 'text-[var(--color-warning)]';
  return 'text-[var(--color-danger)]';
}

// ── 排名徽章 ────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1
      ? 'bg-[var(--color-warning-surface)] text-[var(--color-warning)]'
      : rank === 2
        ? 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
        : rank === 3
          ? 'bg-orange-50 text-orange-600'
          : 'text-[var(--text-muted)]';
  return (
    <span
      className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${cls}`}
    >
      {rank}
    </span>
  );
}

// ── 进度差额显示 ─────────────────────────────────────────

function GapCell({ gap }: { gap: number | null }) {
  if (gap == null) return <span className="text-[var(--text-muted)]">—</span>;
  const isPos = gap >= 0;
  return (
    <span
      className={isPos ? 'text-[var(--color-success)] font-semibold' : 'text-[var(--color-danger)]'}
    >
      {isPos ? '+' : ''}
      {gap.toLocaleString()}
    </span>
  );
}

/** 通用金额 gap 单元格（正绿负红，绝对值 < 100 显示 $0） */
function AmtGapCell({ gap }: { gap: number | null }) {
  if (gap == null || gap === 0) return <span className="text-[var(--text-muted)]">—</span>;
  const absVal = Math.abs(gap);
  const display = absVal < 100 ? '$0' : `$${Math.round(absVal).toLocaleString()}`;
  return (
    <span
      className={
        gap > 0 ? 'text-[var(--color-success)] font-semibold' : 'text-[var(--color-danger)]'
      }
    >
      {gap > 0 ? '+' : '-'}
      {display}
    </span>
  );
}

/** 通用整数 gap 单元格（正绿负红） */
function CountGapCell({ gap }: { gap: number | null }) {
  if (gap == null || gap === 0) return <span className="text-[var(--text-muted)]">—</span>;
  return (
    <span
      className={
        gap > 0 ? 'text-[var(--color-success)] font-semibold' : 'text-[var(--color-danger)]'
      }
    >
      {gap > 0 ? '+' : ''}
      {Math.round(gap).toLocaleString()}
    </span>
  );
}

// ── pickMetric：根据 viewMode 选择指标字段 ────────────────
interface PickedMetric {
  reference: number | null | undefined;
  gap: number | null | undefined;
  pct: number | null | undefined;
}

function pickMetric(
  m:
    | {
        target?: number | null;
        gap?: number | null;
        achievement_pct?: number | null;
        bm_expected?: number | null;
        bm_gap?: number | null;
        bm_pct?: number | null;
      }
    | null
    | undefined,
  mode: ViewMode
): PickedMetric {
  if (!m) return { reference: null, gap: null, pct: null };
  if (mode === 'bm') {
    return {
      reference: m.bm_expected,
      gap: m.bm_gap,
      pct: m.bm_pct,
    };
  }
  return {
    reference: m.target,
    gap: m.gap,
    pct: m.achievement_pct,
  };
}

/** pickMetric 整数版本（注册/出席/付费，无 gap 金额） */
function pickCountMetric(
  m:
    | {
        target?: number | null;
        gap?: number | null;
        bm_expected?: number | null;
        bm_gap?: number | null;
      }
    | null
    | undefined,
  mode: ViewMode
): { reference: number | null | undefined; gap: number | null | undefined } {
  if (!m) return { reference: null, gap: null };
  if (mode === 'bm') {
    return { reference: m.bm_expected, gap: m.bm_gap };
  }
  return { reference: m.target, gap: m.gap };
}

function RateGapCell({ gap }: { gap: number | null }) {
  if (gap == null) return <span className="text-[var(--text-muted)]">—</span>;
  const isPos = gap >= 0;
  return (
    <span
      className={isPos ? 'text-[var(--color-success)] font-semibold' : 'text-[var(--color-danger)]'}
    >
      {isPos ? '+' : ''}
      {(gap * 100).toFixed(1)}pp
    </span>
  );
}

// ── 表头按钮 ─────────────────────────────────────────────

type SortKey = string;

function SortTh({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  align = 'right',
  tooltip,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
  tooltip?: string;
}) {
  const active = currentSort === sortKey;
  return (
    <th
      className={`slide-th ${align === 'right' ? 'slide-th-right' : 'slide-th-left'} py-2 px-2 cursor-pointer select-none hover:opacity-80 whitespace-nowrap`}
      onClick={() => onSort(sortKey)}
      title={tooltip}
    >
      {label}
      {active && <span className="ml-1 text-[10px]">{currentDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );
}

// ── 主组件 ───────────────────────────────────────────────

interface CCPerformanceTableProps {
  teams: CCPerformanceTeamSummary[];
  exchangeRate: number;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function CCPerformanceTable({
  teams,
  exchangeRate,
  isLoading,
  error,
  onRetry,
  viewMode,
  onViewModeChange,
}: CCPerformanceTableProps) {
  const t = useT();

  // 列组可见性
  const [visibleGroups, setVisibleGroups] = useState<Record<ColGroupKey, boolean>>(
    () =>
      Object.fromEntries(COL_GROUPS.map((g) => [g.key, g.defaultVisible])) as Record<
        ColGroupKey,
        boolean
      >
  );

  // 排序
  const [sortKey, setSortKey] = useState<SortKey>('revenue.actual');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // 搜索 + 团队筛选
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // USD/THB 切换
  const [showTHB, setShowTHB] = useState(false);

  // 展开的行
  const [expandedCC, setExpandedCC] = useState<string | null>(null);

  const { exportCSV } = useExport();

  // 所有团队名列表
  const teamNames = useMemo(() => teams.map((t) => t.team), [teams]);

  // 扁平化全部 CC 记录（含团队信息）
  const allRecords = useMemo(() => {
    const filtered = teamFilter === 'all' ? teams : teams.filter((tm) => tm.team === teamFilter);
    return filtered.flatMap((tm) => tm.records.map((r) => ({ ...r, _teamName: tm.team })));
  }, [teams, teamFilter]);

  // 搜索过滤
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return allRecords;
    const q = search.toLowerCase();
    return allRecords.filter(
      (r) => r.cc_name.toLowerCase().includes(q) || r.team.toLowerCase().includes(q)
    );
  }, [allRecords, search]);

  // 排序
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const getVal = (rec: CCPerformanceRecord & { _teamName: string }, key: string): number => {
        const parts = key.split('.');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let val: any = rec;
        for (const p of parts) {
          val = val?.[p];
        }
        return val ?? 0;
      };
      const diff = getVal(a, sortKey) - getVal(b, sortKey);
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [filteredRecords, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function toggleGroup(key: ColGroupKey) {
    setVisibleGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleExpand(ccName: string) {
    setExpandedCC((prev) => (prev === ccName ? null : ccName));
  }

  function fmtAmt(usd: number | null | undefined) {
    if (usd == null) return '—';
    if (showTHB) {
      return `฿${Math.round(usd * exchangeRate).toLocaleString()}`;
    }
    return `$${Math.round(usd).toLocaleString()}`;
  }

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10);
    exportCSV(
      sortedRecords as unknown as Record<string, unknown>[],
      [
        { key: 'cc_name', label: t.exportCCName },
        { key: 'team', label: t.exportTeam },
        { key: 'students_count', label: t.exportStudents },
        { key: 'revenue.actual', label: t.exportRevenue },
        { key: 'revenue.target', label: t.exportRevenueTarget },
        { key: 'revenue.achievement_pct', label: t.exportAchievement },
        { key: 'leads.actual', label: t.exportLeads },
        { key: 'paid.actual', label: t.exportPaid },
        { key: 'participation_rate', label: t.exportParticipation },
        { key: 'checkin_rate', label: t.exportCheckin },
        { key: 'cc_reach_rate', label: t.exportReach },
      ],
      `${t.exportFilename}_${today}`
    );
  }

  // ── 三态处理 ─────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title={t.loadFailTitle}
        description={t.loadFailDesc}
        action={{ label: t.retry, onClick: () => onRetry?.() }}
      />
    );
  }

  if (teams.length === 0 || allRecords.length === 0) {
    return <EmptyState title={t.emptyTitle} description={t.emptyDesc} />;
  }

  const show = visibleGroups;
  const sp: React.ThHTMLAttributes<HTMLTableCellElement> = {
    className:
      'slide-th slide-th-right py-2 px-2 cursor-pointer select-none hover:opacity-80 whitespace-nowrap',
  };

  return (
    <div className="space-y-3">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 搜索框 */}
        <input
          type="search"
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base h-8 text-sm px-3 w-48 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-colors duration-150"
        />

        {/* 团队筛选 */}
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="h-8 text-sm px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-colors duration-150"
        >
          <option value="all">{t.allTeams}</option>
          {teamNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {/* USD / THB 切换 */}
        <div className="flex items-center rounded-lg border border-[var(--border-default)] overflow-hidden text-xs">
          <button
            onClick={() => setShowTHB(false)}
            className={`px-3 py-1.5 transition-colors duration-150 ${!showTHB ? 'bg-[var(--color-accent)] text-white font-semibold' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'}`}
          >
            USD
          </button>
          <button
            onClick={() => setShowTHB(true)}
            className={`px-3 py-1.5 transition-colors duration-150 ${showTHB ? 'bg-[var(--color-accent)] text-white font-semibold' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'}`}
          >
            THB
          </button>
        </div>

        {/* 达标 / BM 参照系切换 */}
        <div
          className="flex items-center rounded-lg border border-[var(--border-default)] overflow-hidden text-xs"
          title={t.viewModeTooltip}
        >
          <button
            onClick={() => onViewModeChange('target')}
            className={`px-3 py-1.5 transition-colors duration-150 ${viewMode === 'target' ? 'bg-[var(--color-accent)] text-white font-semibold' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'}`}
          >
            {t.targetMode}
          </button>
          <button
            onClick={() => onViewModeChange('bm')}
            className={`px-3 py-1.5 transition-colors duration-150 ${viewMode === 'bm' ? 'bg-[var(--color-accent)] text-white font-semibold' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'}`}
          >
            {t.bmMode}
          </button>
        </div>

        {/* 列组开关 */}
        <div className="flex flex-wrap items-center gap-1 ml-auto">
          {COL_GROUPS.filter((g) => g.key !== 'identity').map((g) => (
            <button
              key={g.key}
              onClick={() => toggleGroup(g.key)}
              className={`px-2 py-1 rounded text-xs transition-colors duration-150 border ${
                visibleGroups[g.key]
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-default)] hover:border-[var(--color-accent)]'
              }`}
            >
              {t[g.labelKey] as string}
            </button>
          ))}
        </div>

        {/* 导出 */}
        <ExportButton onExportCsv={handleExport} />
      </div>

      {/* 结果计数 */}
      <p className="text-xs text-[var(--text-muted)]">
        {t.total} {sortedRecords.length} {t.ccUnit}
        {search && ` · ${t.searching}${search}${t.searchingEnd}`}
        {teamFilter !== 'all' && ` · ${teamFilter}`}
      </p>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="slide-thead-row">
              {/* 排名 */}
              <th className="slide-th slide-th-center py-2 px-2 w-8">{t.ranking}</th>

              {/* identity */}
              {show.identity && (
                <>
                  <SortTh
                    label={t.ccName}
                    sortKey="cc_name"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="left"
                  />
                  <SortTh
                    label={t.team}
                    sortKey="team"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="left"
                  />
                  <SortTh
                    label={t.students}
                    sortKey="students_count"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t.studentsTooltip}
                  />
                </>
              )}

              {/* revenue */}
              {show.revenue && (
                <>
                  <SortTh
                    label={viewMode === 'bm' ? t.bmExpected : t.performanceTarget}
                    sortKey={viewMode === 'bm' ? 'revenue.bm_expected' : 'revenue.target'}
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={viewMode === 'bm' ? t.bmExpectedTooltip : undefined}
                  />
                  <SortTh
                    label={t.actualPerformance}
                    sortKey="revenue.actual"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <th {...sp} title={viewMode === 'bm' ? t.vsBMTooltip : t.targetGapTooltip}>
                    {viewMode === 'bm' ? t.vsBM : t.gap}
                  </th>
                  <SortTh
                    label={viewMode === 'bm' ? t.bmAchievement : t.achievement}
                    sortKey={viewMode === 'bm' ? 'revenue.bm_pct' : 'revenue.achievement_pct'}
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                </>
              )}

              {/* funnel */}
              {show.funnel && (
                <>
                  <SortTh
                    label={viewMode === 'bm' ? t.leadsBM : t.leadsTarget}
                    sortKey={viewMode === 'bm' ? 'leads.bm_expected' : 'leads.target'}
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label={t.leadsActual}
                    sortKey="leads.actual"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <th {...sp} title={viewMode === 'bm' ? t.leadsVsBMTooltip : t.leadsGapTooltip}>
                    {viewMode === 'bm' ? t.leadsVsBM : t.leadsGap}
                  </th>
                  <SortTh
                    label={viewMode === 'bm' ? t.showupBM : t.showupTarget}
                    sortKey={viewMode === 'bm' ? 'showup.bm_expected' : 'showup.target'}
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label={t.showupActual}
                    sortKey="showup.actual"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <th {...sp} title={viewMode === 'bm' ? t.showupVsBMTooltip : t.showupGapTooltip}>
                    {viewMode === 'bm' ? t.showupVsBM : t.showupGap}
                  </th>
                  <SortTh
                    label={viewMode === 'bm' ? t.paidBM : t.paidTarget}
                    sortKey={viewMode === 'bm' ? 'paid.bm_expected' : 'paid.target'}
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label={t.paidActual}
                    sortKey="paid.actual"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <th {...sp} title={viewMode === 'bm' ? t.paidVsBMTooltip : t.paidGapTooltip}>
                    {viewMode === 'bm' ? t.paidVsBM : t.paidGap}
                  </th>
                  <SortTh
                    label={t.asp}
                    sortKey="asp.actual"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t.aspTooltip}
                  />
                </>
              )}

              {/* conversion */}
              {show.conversion && (
                <>
                  <SortTh
                    label={t.showupToPaid}
                    sortKey="showup_to_paid.actual"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label={t.leadsToPaid}
                    sortKey="leads_to_paid.actual"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                </>
              )}

              {/* process */}
              {show.process && (
                <>
                  <SortTh
                    label={t.participationRate}
                    sortKey="participation_rate"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t.participationRateTooltip}
                  />
                  <SortTh
                    label={t.checkinRate}
                    sortKey="checkin_rate"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t.checkinRateTooltip}
                  />
                  <SortTh
                    label={t.reachRate}
                    sortKey="cc_reach_rate"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t.reachRateTooltip}
                  />
                  <SortTh
                    label={t.coefficient}
                    sortKey="coefficient"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t.coefficientTooltip}
                  />
                </>
              )}

              {/* outreach */}
              {show.outreach && (
                <>
                  <SortTh
                    label={t.callTarget}
                    sortKey="call_target"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label={t.callActual}
                    sortKey="calls_total"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label={t.callCoverage}
                    sortKey="call_proportion"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label={t.connectedCount}
                    sortKey="connected.count"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label={t.effectiveCount}
                    sortKey="effective.count"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                </>
              )}

              {/* pace */}
              {show.pace && (
                <>
                  <SortTh
                    label={t.currentDailyAvg}
                    sortKey="current_daily_avg"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t.currentDailyAvgTooltip}
                  />
                  <SortTh
                    label={t.remainingDailyAvg}
                    sortKey="remaining_daily_avg"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t.remainingDailyAvgTooltip}
                  />
                  <SortTh
                    label={t.efficiencyLift}
                    sortKey="efficiency_lift_pct"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t.efficiencyLiftTooltip}
                  />
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {sortedRecords.map((record, i) => {
              const isExpanded = expandedCC === record.cc_name;

              return [
                <tr
                  key={record.cc_name}
                  className={`${i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'} cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors duration-150`}
                  onClick={() => toggleExpand(record.cc_name)}
                  title={t.expandTitle}
                >
                  {/* 排名 */}
                  <td className="slide-td py-1.5 px-2 text-center">
                    <RankBadge rank={i + 1} />
                  </td>

                  {/* identity */}
                  {show.identity && (
                    <>
                      <td className="slide-td py-1.5 px-2 font-medium whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                          {record.cc_name}
                        </span>
                      </td>
                      <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)] whitespace-nowrap">
                        {record.team}
                      </td>
                      <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                        {record.students_count?.toLocaleString() ?? '—'}
                      </td>
                    </>
                  )}

                  {/* revenue */}
                  {show.revenue &&
                    (() => {
                      const rev = pickMetric(record.revenue, viewMode);
                      return (
                        <>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {fmtAmt(rev.reference)}
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums font-semibold">
                            {fmtAmt(record.revenue?.actual)}
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                            <AmtGapCell gap={rev.gap ?? null} />
                          </td>
                          <td
                            className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${achievementTextClass(rev.pct ?? null)}`}
                          >
                            {formatRate(rev.pct)}
                          </td>
                        </>
                      );
                    })()}

                  {/* funnel */}
                  {show.funnel &&
                    (() => {
                      const leads = pickCountMetric(record.leads, viewMode);
                      const showup = pickCountMetric(record.showup, viewMode);
                      const paid = pickCountMetric(record.paid, viewMode);
                      return (
                        <>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {leads.reference?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                            {record.leads?.actual?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                            <CountGapCell gap={leads.gap ?? null} />
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {showup.reference?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                            {record.showup?.actual?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                            <CountGapCell gap={showup.gap ?? null} />
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {paid.reference?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                            {record.paid?.actual?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                            <CountGapCell gap={paid.gap ?? null} />
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                            {fmtAmt(record.asp?.actual)}
                          </td>
                        </>
                      );
                    })()}

                  {/* conversion */}
                  {show.conversion && (
                    <>
                      <td
                        className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(record.showup_to_paid?.actual, [0.3, 0.5])}`}
                      >
                        {formatRate(record.showup_to_paid?.actual)}
                      </td>
                      <td
                        className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(record.leads_to_paid?.actual, [0.1, 0.2])}`}
                      >
                        {formatRate(record.leads_to_paid?.actual)}
                      </td>
                    </>
                  )}

                  {/* process */}
                  {show.process && (
                    <>
                      <td
                        className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(record.participation_rate, [0.3, 0.5])}`}
                      >
                        {formatRate(record.participation_rate)}
                      </td>
                      <td
                        className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(record.checkin_rate, [0.3, 0.5])}`}
                      >
                        {formatRate(record.checkin_rate)}
                      </td>
                      <td
                        className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(record.cc_reach_rate, [0.3, 0.5])}`}
                      >
                        {formatRate(record.cc_reach_rate)}
                      </td>
                      <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                        {record.coefficient != null ? record.coefficient.toFixed(2) : '—'}
                      </td>
                    </>
                  )}

                  {/* outreach */}
                  {show.outreach && (
                    <>
                      <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                        {record.call_target?.toLocaleString() ?? '—'}
                      </td>
                      <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                        {record.calls_total?.toLocaleString() ?? '—'}
                      </td>
                      <td
                        className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(record.call_proportion, [0.5, 0.7])}`}
                      >
                        {formatRate(record.call_proportion)}
                      </td>
                      <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                        {record.connected?.count?.toLocaleString() ?? '—'}
                      </td>
                      <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                        {record.effective?.count?.toLocaleString() ?? '—'}
                      </td>
                    </>
                  )}

                  {/* pace */}
                  {show.pace && (
                    <>
                      <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                        {fmtAmt(record.current_daily_avg)}
                      </td>
                      <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                        {fmtAmt(record.remaining_daily_avg)}
                      </td>
                      <td
                        className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${record.efficiency_lift_pct != null && record.efficiency_lift_pct > 0.2 ? 'text-[var(--color-danger)]' : record.efficiency_lift_pct != null && record.efficiency_lift_pct <= 0 ? 'text-[var(--color-success)]' : ''}`}
                      >
                        {record.efficiency_lift_pct != null
                          ? `${(record.efficiency_lift_pct * 100).toFixed(1)}%`
                          : '—'}
                      </td>
                    </>
                  )}
                </tr>,

                // 展开详情行
                isExpanded && (
                  <tr key={`${record.cc_name}-detail`}>
                    <td colSpan={99} className="px-4 py-0 bg-[var(--bg-subtle)]">
                      <CCPerformanceDetail record={record} exchangeRate={exchangeRate} />
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>

          {/* 团队小计行 */}
          {teamFilter === 'all' && (
            <tfoot>
              {teams.map((team) => (
                <tr
                  key={`subtotal-${team.team}`}
                  className="bg-[var(--bg-subtle)] font-semibold border-t border-[var(--border-default)]"
                >
                  <td className="slide-td py-2 px-2 text-center text-[var(--text-muted)] text-[10px]">
                    {t.subtotal}
                  </td>
                  {show.identity && (
                    <>
                      <td className="slide-td py-2 px-2 font-semibold text-[var(--text-primary)]">
                        {team.team}
                      </td>
                      <td className="slide-td py-2 px-2 text-[var(--text-secondary)]">
                        {team.headcount}
                        {t.headcountUnit}
                      </td>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                        {team.students_count?.toLocaleString() ?? '—'}
                      </td>
                    </>
                  )}
                  {show.revenue &&
                    (() => {
                      const rev = pickMetric(team.revenue, viewMode);
                      return (
                        <>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {fmtAmt(rev.reference)}
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            {fmtAmt(team.revenue?.actual)}
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            <AmtGapCell gap={rev.gap ?? null} />
                          </td>
                          <td
                            className={`slide-td py-2 px-2 text-right font-mono tabular-nums ${achievementTextClass(rev.pct ?? null)}`}
                          >
                            {formatRate(rev.pct)}
                          </td>
                        </>
                      );
                    })()}
                  {show.funnel &&
                    (() => {
                      const leads = pickCountMetric(team.leads, viewMode);
                      const showup = pickCountMetric(team.showup, viewMode);
                      const paid = pickCountMetric(team.paid, viewMode);
                      return (
                        <>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {leads.reference?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            {team.leads?.actual?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            <CountGapCell gap={leads.gap ?? null} />
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {showup.reference?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            {team.showup?.actual?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            <CountGapCell gap={showup.gap ?? null} />
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {paid.reference?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            {team.paid?.actual?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            <CountGapCell gap={paid.gap ?? null} />
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            {fmtAmt(team.asp?.actual)}
                          </td>
                        </>
                      );
                    })()}
                  {show.conversion && (
                    <>
                      <td
                        className={`slide-td py-2 px-2 text-right font-mono tabular-nums ${metricColor(team.showup_to_paid?.actual, [0.3, 0.5])}`}
                      >
                        {formatRate(team.showup_to_paid?.actual)}
                      </td>
                      <td
                        className={`slide-td py-2 px-2 text-right font-mono tabular-nums ${metricColor(team.leads_to_paid?.actual, [0.1, 0.2])}`}
                      >
                        {formatRate(team.leads_to_paid?.actual)}
                      </td>
                    </>
                  )}
                  {show.process && (
                    <>
                      <td
                        className={`slide-td py-2 px-2 text-right font-mono tabular-nums ${metricColor(team.participation_rate, [0.3, 0.5])}`}
                      >
                        {formatRate(team.participation_rate)}
                      </td>
                      <td
                        className={`slide-td py-2 px-2 text-right font-mono tabular-nums ${metricColor(team.checkin_rate, [0.3, 0.5])}`}
                      >
                        {formatRate(team.checkin_rate)}
                      </td>
                      <td
                        className={`slide-td py-2 px-2 text-right font-mono tabular-nums ${metricColor(team.cc_reach_rate, [0.3, 0.5])}`}
                      >
                        {formatRate(team.cc_reach_rate)}
                      </td>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                        {team.coefficient != null ? team.coefficient.toFixed(2) : '—'}
                      </td>
                    </>
                  )}
                  {show.outreach && (
                    <>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                        {team.call_target?.toLocaleString() ?? '—'}
                      </td>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                        {team.calls_total?.toLocaleString() ?? '—'}
                      </td>
                      <td
                        className={`slide-td py-2 px-2 text-right font-mono tabular-nums ${metricColor(team.call_proportion, [0.5, 0.7])}`}
                      >
                        {formatRate(team.call_proportion)}
                      </td>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                        {team.connected?.count?.toLocaleString() ?? '—'}
                      </td>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                        {team.effective?.count?.toLocaleString() ?? '—'}
                      </td>
                    </>
                  )}
                  {show.pace && (
                    <>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">—</td>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">—</td>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">—</td>
                    </>
                  )}
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
