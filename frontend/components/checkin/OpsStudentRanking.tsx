'use client';

import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, formatRate } from '@/lib/utils';
import type { OpsStudentRankingResponse, OpsStudentRankingRow } from '@/lib/types/checkin-student';
import { useState } from 'react';
import { useLocale } from 'next-intl';

// ── i18n ──────────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    loadFail: '数据加载失败',
    loadFailDesc: '无法获取学员排行数据，请检查后端服务',
    retry: '重试',
    emptyTitle: 'M6~M12+ 围场暂无学员数据',
    emptyDesc: '上传包含 M6+ 围场的 D4 学员数据后自动刷新',
    rankCol: '排名',
    studentCol: '学员 ID',
    enclosureCol: '围场',
    ownerCol: '负责人',
    checkinCol: '本月打卡',
    regCol: '推荐注册',
    payCol: '推荐付费',
    totalStudents: '名运营围场学员',
    nonZeroLabel: '当前维度非零占比',
    dimCheckinDays: '本月打卡',
    dimCheckinDaysDesc: '本月累计打卡天数',
    dimConsistency: '打卡稳定性',
    dimConsistencyDesc: '本月/上月打卡天数一致性（0→1）',
    dimQuality: '质量评分',
    dimQualityDesc: '综合质量评分（课耗40%+推荐30%+付费20%+围场10%）',
    dimRefReg: '推荐注册',
    dimRefRegDesc: '当月推荐注册人数（D4）',
    dimRefAtt: '推荐出席',
    dimRefAttDesc: '当月推荐出席人数（D4）',
    dimRefPay: '推荐付费',
    dimRefPayDesc: '本月推荐付费数（D4）',
    dimConvRate: '注册转化率',
    dimConvRateDesc: '推荐付费数 ÷ 推荐注册数',
    dimSecondary: '二级裂变',
    dimSecondaryDesc: '被该学员推荐的B学员中，当月又带来注册的人数',
    dimImprove: '打卡进步',
    dimImproveDesc: '本月打卡天数 - 上月打卡天数（正=进步）',
    dimCCDial: 'CC拨打次数',
    dimCCDialDesc: '总CC拨打次数（D4）',
    dimRoleSplitNew: '角色带新（注册）',
    dimRoleSplitNewDesc: 'CC+SS+LP 带新注册人数合计',
    dimRoleSplitPaid: '角色带新（付费）',
    dimRoleSplitPaidDesc: 'CC+SS+LP 带新付费人数合计',
    dimD3Funnel: 'D3邀约数',
    dimD3FunnelDesc: 'D3 明细表邀约数',
    dimHistorical: '历史累计',
    dimHistoricalDesc: '总推荐注册 + 总推荐1v1付费人数',
  },
  'zh-TW': {
    loadFail: '資料載入失敗',
    loadFailDesc: '無法取得學員排行資料，請檢查後端服務',
    retry: '重試',
    emptyTitle: 'M6~M12+ 圍場暫無學員資料',
    emptyDesc: '上傳包含 M6+ 圍場的 D4 學員資料後自動刷新',
    rankCol: '排名',
    studentCol: '學員 ID',
    enclosureCol: '圍場',
    ownerCol: '負責人',
    checkinCol: '本月打卡',
    regCol: '推薦註冊',
    payCol: '推薦付費',
    totalStudents: '名運營圍場學員',
    nonZeroLabel: '目前維度非零佔比',
    dimCheckinDays: '本月打卡',
    dimCheckinDaysDesc: '本月累計打卡天數',
    dimConsistency: '打卡穩定性',
    dimConsistencyDesc: '本月/上月打卡天數一致性（0→1）',
    dimQuality: '質量評分',
    dimQualityDesc: '綜合質量評分（課耗40%+推薦30%+付費20%+圍場10%）',
    dimRefReg: '推薦註冊',
    dimRefRegDesc: '當月推薦註冊人數（D4）',
    dimRefAtt: '推薦出席',
    dimRefAttDesc: '當月推薦出席人數（D4）',
    dimRefPay: '推薦付費',
    dimRefPayDesc: '本月推薦付費數（D4）',
    dimConvRate: '註冊轉化率',
    dimConvRateDesc: '推薦付費數 ÷ 推薦註冊數',
    dimSecondary: '二級裂變',
    dimSecondaryDesc: '被該學員推薦的B學員中，當月又帶來註冊的人數',
    dimImprove: '打卡進步',
    dimImproveDesc: '本月打卡天數 - 上月打卡天數（正=進步）',
    dimCCDial: 'CC撥打次數',
    dimCCDialDesc: '總CC撥打次數（D4）',
    dimRoleSplitNew: '角色帶新（註冊）',
    dimRoleSplitNewDesc: 'CC+SS+LP 帶新註冊人數合計',
    dimRoleSplitPaid: '角色帶新（付費）',
    dimRoleSplitPaidDesc: 'CC+SS+LP 帶新付費人數合計',
    dimD3Funnel: 'D3邀約數',
    dimD3FunnelDesc: 'D3 明細表邀約數',
    dimHistorical: '歷史累計',
    dimHistoricalDesc: '總推薦註冊 + 總推薦1v1付費人數',
  },
  en: {
    loadFail: 'Load Failed',
    loadFailDesc: 'Unable to fetch student ranking data. Please check backend service.',
    retry: 'Retry',
    emptyTitle: 'No Student Data for M6~M12+ Enclosures',
    emptyDesc: 'Data will refresh after uploading D4 student data with M6+ enclosures',
    rankCol: 'Rank',
    studentCol: 'Student ID',
    enclosureCol: 'Enclosure',
    ownerCol: 'Owner',
    checkinCol: 'Check-in (Mo.)',
    regCol: 'Ref. Reg.',
    payCol: 'Ref. Pay',
    totalStudents: 'ops enclosure students',
    nonZeroLabel: 'Non-zero ratio (current dim.)',
    dimCheckinDays: 'Monthly Check-in',
    dimCheckinDaysDesc: 'Cumulative check-in days this month',
    dimConsistency: 'Check-in Stability',
    dimConsistencyDesc: 'Consistency of this/last month check-in days (0→1)',
    dimQuality: 'Quality Score',
    dimQualityDesc: 'Composite score (lesson 40%+ref 30%+payment 20%+enclosure 10%)',
    dimRefReg: 'Ref. Registration',
    dimRefRegDesc: 'Referral registrations this month (D4)',
    dimRefAtt: 'Ref. Attendance',
    dimRefAttDesc: 'Referral attendance this month (D4)',
    dimRefPay: 'Ref. Payment',
    dimRefPayDesc: 'Referral payments this month (D4)',
    dimConvRate: 'Reg. Conv. Rate',
    dimConvRateDesc: 'Referral payments ÷ Referral registrations',
    dimSecondary: 'Secondary Referral',
    dimSecondaryDesc:
      'B-students referred by this student who brought new registrations this month',
    dimImprove: 'Check-in Improvement',
    dimImproveDesc: 'This month - last month check-in days (positive = improvement)',
    dimCCDial: 'CC Dials',
    dimCCDialDesc: 'Total CC dial count (D4)',
    dimRoleSplitNew: 'Role New (Reg.)',
    dimRoleSplitNewDesc: 'CC+SS+LP new referral registrations total',
    dimRoleSplitPaid: 'Role New (Paid)',
    dimRoleSplitPaidDesc: 'CC+SS+LP new referral payments total',
    dimD3Funnel: 'D3 Invitations',
    dimD3FunnelDesc: 'D3 detail table invitation count',
    dimHistorical: 'Historical Total',
    dimHistoricalDesc: 'Total referral registrations + total referral 1v1 payments',
  },
  th: {
    loadFail: 'โหลดข้อมูลล้มเหลว',
    loadFailDesc: 'ไม่สามารถดึงข้อมูลการจัดอันดับนักเรียนได้ กรุณาตรวจสอบบริการ backend',
    retry: 'ลองใหม่',
    emptyTitle: 'ไม่มีข้อมูลนักเรียนในคอก M6~M12+',
    emptyDesc: 'ข้อมูลจะรีเฟรชอัตโนมัติหลังอัปโหลดข้อมูลนักเรียน D4 ที่มีคอก M6+',
    rankCol: 'อันดับ',
    studentCol: 'รหัสนักเรียน',
    enclosureCol: 'คอก',
    ownerCol: 'ผู้รับผิดชอบ',
    checkinCol: 'เช็คอิน (เดือน)',
    regCol: 'ลงทะเบียน',
    payCol: 'ชำระเงิน',
    totalStudents: 'นักเรียนคอกปฏิบัติการ',
    nonZeroLabel: 'สัดส่วนไม่ใช่ศูนย์ (มิติปัจจุบัน)',
    dimCheckinDays: 'เช็คอินเดือนนี้',
    dimCheckinDaysDesc: 'จำนวนวันเช็คอินสะสมในเดือนนี้',
    dimConsistency: 'ความสม่ำเสมอในการเช็คอิน',
    dimConsistencyDesc: 'ความสม่ำเสมอของวันเช็คอินเดือนนี้/เดือนที่แล้ว (0→1)',
    dimQuality: 'คะแนนคุณภาพ',
    dimQualityDesc: 'คะแนนรวม (คาบเรียน 40%+แนะนำ 30%+ชำระ 20%+คอก 10%)',
    dimRefReg: 'ลงทะเบียนแนะนำ',
    dimRefRegDesc: 'จำนวนการลงทะเบียนแนะนำในเดือนนี้ (D4)',
    dimRefAtt: 'เข้าร่วมแนะนำ',
    dimRefAttDesc: 'จำนวนการเข้าร่วมแนะนำในเดือนนี้ (D4)',
    dimRefPay: 'ชำระเงินแนะนำ',
    dimRefPayDesc: 'จำนวนการชำระเงินแนะนำในเดือนนี้ (D4)',
    dimConvRate: 'อัตราแปลงการลงทะเบียน',
    dimConvRateDesc: 'จำนวนชำระเงินแนะนำ ÷ จำนวนลงทะเบียนแนะนำ',
    dimSecondary: 'การแนะนำระดับสอง',
    dimSecondaryDesc: 'นักเรียน B ที่ถูกแนะนำโดยนักเรียนนี้ซึ่งนำผู้ลงทะเบียนใหม่มาในเดือนนี้',
    dimImprove: 'ความก้าวหน้าในการเช็คอิน',
    dimImproveDesc: 'วันเช็คอินเดือนนี้ - เดือนที่แล้ว (บวก = ก้าวหน้า)',
    dimCCDial: 'จำนวนโทร CC',
    dimCCDialDesc: 'จำนวนโทรทั้งหมดของ CC (D4)',
    dimRoleSplitNew: 'บทบาทใหม่ (ลงทะเบียน)',
    dimRoleSplitNewDesc: 'ยอดรวมการลงทะเบียนใหม่ CC+SS+LP',
    dimRoleSplitPaid: 'บทบาทใหม่ (ชำระเงิน)',
    dimRoleSplitPaidDesc: 'ยอดรวมการชำระเงินใหม่ CC+SS+LP',
    dimD3Funnel: 'คำเชิญ D3',
    dimD3FunnelDesc: 'จำนวนคำเชิญในตาราง D3',
    dimHistorical: 'ยอดรวมประวัติ',
    dimHistoricalDesc: 'ยอดลงทะเบียนแนะนำทั้งหมด + ยอดชำระ 1v1 แนะนำทั้งหมด',
  },
} as const;
type Locale = keyof typeof I18N;

// ── 14 维度配置 ───────────────────────────────────────────────────────────────

interface DimensionDef {
  id: string;
  labelKey: keyof (typeof I18N)['zh'];
  valueKey: keyof OpsStudentRankingRow;
  format: 'int' | 'float2' | 'rate' | 'score';
  descKey: keyof (typeof I18N)['zh'];
}

const DIMENSIONS: DimensionDef[] = [
  {
    id: 'checkin_days',
    labelKey: 'dimCheckinDays',
    valueKey: 'days_this_month',
    format: 'int',
    descKey: 'dimCheckinDaysDesc',
  },
  {
    id: 'checkin_consistency',
    labelKey: 'dimConsistency',
    valueKey: 'engagement_stability',
    format: 'rate',
    descKey: 'dimConsistencyDesc',
  },
  {
    id: 'quality_score',
    labelKey: 'dimQuality',
    valueKey: 'quality_score',
    format: 'score',
    descKey: 'dimQualityDesc',
  },
  {
    id: 'referral_bindings',
    labelKey: 'dimRefReg',
    valueKey: 'referral_registrations',
    format: 'int',
    descKey: 'dimRefRegDesc',
  },
  {
    id: 'referral_attendance',
    labelKey: 'dimRefAtt',
    valueKey: 'referral_attendance',
    format: 'int',
    descKey: 'dimRefAttDesc',
  },
  {
    id: 'referral_payments',
    labelKey: 'dimRefPay',
    valueKey: 'referral_payments',
    format: 'int',
    descKey: 'dimRefPayDesc',
  },
  {
    id: 'conversion_rate',
    labelKey: 'dimConvRate',
    valueKey: 'conversion_rate',
    format: 'rate',
    descKey: 'dimConvRateDesc',
  },
  {
    id: 'secondary_referrals',
    labelKey: 'dimSecondary',
    valueKey: 'secondary_referrals',
    format: 'int',
    descKey: 'dimSecondaryDesc',
  },
  {
    id: 'improvement',
    labelKey: 'dimImprove',
    valueKey: 'delta',
    format: 'int',
    descKey: 'dimImproveDesc',
  },
  {
    id: 'cc_dial_depth',
    labelKey: 'dimCCDial',
    valueKey: 'cc_dial_count',
    format: 'int',
    descKey: 'dimCCDialDesc',
  },
  {
    id: 'role_split_new',
    labelKey: 'dimRoleSplitNew',
    valueKey: 'cc_new_count',
    format: 'int',
    descKey: 'dimRoleSplitNewDesc',
  },
  {
    id: 'role_split_paid',
    labelKey: 'dimRoleSplitPaid',
    valueKey: 'cc_new_paid',
    format: 'int',
    descKey: 'dimRoleSplitPaidDesc',
  },
  {
    id: 'd3_funnel',
    labelKey: 'dimD3Funnel',
    valueKey: 'd3_invitations',
    format: 'int',
    descKey: 'dimD3FunnelDesc',
  },
  {
    id: 'historical_total',
    labelKey: 'dimHistorical',
    valueKey: 'total_historical_registrations',
    format: 'int',
    descKey: 'dimHistoricalDesc',
  },
];

// ── 格式化工具 ────────────────────────────────────────────────────────────────

function fmtValue(val: number | null | undefined, format: DimensionDef['format']): string {
  if (val == null || isNaN(val)) return '—';
  switch (format) {
    case 'int':
      return val.toLocaleString();
    case 'float2':
      return val.toFixed(2);
    case 'rate':
      return formatRate(val);
    case 'score':
      return val.toFixed(1);
    default:
      return String(val);
  }
}

function fmtDelta(delta: number): string {
  if (delta === 0) return '—';
  return delta > 0 ? `+${delta}` : String(delta);
}

// ── 排名徽章 ─────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-warning)] text-white font-bold text-sm">
        1
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--bg-subtle)] text-white font-bold text-sm">
        2
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-warning)] text-white font-bold text-sm">
        3
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 text-[var(--text-muted)] text-sm tabular-nums">
      {rank}
    </span>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

interface OpsStudentRankingProps {
  configJson: string;
}

export function OpsStudentRanking({ configJson }: OpsStudentRankingProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;
  const [dimension, setDimension] = useState<string>('checkin_days');

  const apiUrl = `/api/checkin/ops-student-ranking?dimension=${dimension}&role_config=${encodeURIComponent(configJson)}&limit=50`;

  const { data, isLoading, error, mutate } = useFilteredSWR<OpsStudentRankingResponse>(apiUrl, {
    refreshInterval: 60_000,
  });

  const currentDimDef = DIMENSIONS.find((d) => d.id === dimension) ?? DIMENSIONS[0];

  // ── loading 态 ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-sm text-[var(--text-muted)]">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── 错误态 ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <EmptyState
        title={t.loadFail}
        description={t.loadFailDesc}
        action={{ label: t.retry, onClick: () => mutate() }}
      />
    );
  }

  // ── 空态 ───────────────────────────────────────────────────────────────────
  if (!data || data.total_students === 0) {
    return (
      <div className="space-y-4">
        {/* 维度切换 pill bar（空态仍然可以切换） */}
        <DimensionPillBar current={dimension} onSelect={setDimension} t={t} />
        <EmptyState title={t.emptyTitle} description={t.emptyDesc} />
      </div>
    );
  }

  const students = data.students ?? [];
  const nonZeroCount = students.filter((s) => (s[currentDimDef.valueKey] as number) > 0).length;
  const nonZeroPct = students.length > 0 ? Math.round((nonZeroCount / students.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 维度切换 pill bar */}
      <DimensionPillBar current={dimension} onSelect={setDimension} t={t} />

      {/* 当前维度说明 */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] px-1">
        <span className="font-medium text-[var(--text-secondary)]">
          {t[currentDimDef.labelKey]}：
        </span>
        <span>{t[currentDimDef.descKey]}</span>
      </div>

      {/* 排行表 */}
      <div className="card-base overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th text-center w-10">{t.rankCol}</th>
                <th className="slide-th">{t.studentCol}</th>
                <th className="slide-th text-center">{t.enclosureCol}</th>
                <th className="slide-th">{t.ownerCol}</th>
                <th className="slide-th font-bold text-right">{t[currentDimDef.labelKey]}</th>
                <th className="slide-th text-right">{t.checkinCol}</th>
                <th className="slide-th text-right">{t.regCol}</th>
                <th className="slide-th text-right">{t.payCol}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                const isTop3 = s.rank <= 3;
                return (
                  <tr
                    key={s.student_id}
                    className={cn(
                      idx % 2 === 0 ? 'slide-row-even' : 'slide-row-odd',
                      isTop3 && 'bg-[var(--color-warning-surface)]'
                    )}
                  >
                    <td className="slide-td text-center">
                      <RankBadge rank={s.rank} />
                    </td>
                    <td className="slide-td font-mono text-xs text-[var(--text-secondary)] max-w-[120px] truncate">
                      {s.student_id || '—'}
                    </td>
                    <td className="slide-td text-center">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                        {s.enclosure}
                      </span>
                    </td>
                    <td className="slide-td text-xs">
                      <div className="truncate max-w-[100px]">{s.cc_name || '—'}</div>
                      {s.team && (
                        <div className="text-[var(--text-muted)] truncate max-w-[100px]">
                          {s.team}
                        </div>
                      )}
                    </td>
                    <td className="slide-td text-right font-bold text-[var(--text-primary)] tabular-nums">
                      {fmtValue(s[currentDimDef.valueKey] as number, currentDimDef.format)}
                    </td>
                    <td className="slide-td text-right tabular-nums">
                      <span>{s.days_this_month}</span>
                      {s.delta !== 0 && (
                        <span
                          className={cn(
                            'ml-1 text-xs',
                            s.delta > 0
                              ? 'text-[var(--color-success)]'
                              : 'text-[var(--color-danger)]'
                          )}
                        >
                          {fmtDelta(s.delta)}
                        </span>
                      )}
                    </td>
                    <td className="slide-td text-right tabular-nums">
                      {s.referral_registrations || '—'}
                    </td>
                    <td className="slide-td text-right tabular-nums">
                      {s.referral_payments || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 底部统计摘要 */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
        <span>
          共{' '}
          <span className="font-semibold text-[var(--text-primary)]">
            {data.total_students.toLocaleString()}
          </span>{' '}
          {t.totalStudents}
        </span>
        <span>
          {t.nonZeroLabel}：
          <span className="font-semibold text-[var(--text-primary)] ml-1">{nonZeroPct}%</span>（
          {nonZeroCount}/{students.length}）
        </span>
      </div>
    </div>
  );
}

// ── 维度切换 pill bar ─────────────────────────────────────────────────────────

function DimensionPillBar({
  current,
  onSelect,
  t,
}: {
  current: string;
  onSelect: (id: string) => void;
  t: (typeof I18N)[keyof typeof I18N];
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {DIMENSIONS.map((dim) => (
        <button
          key={dim.id}
          onClick={() => onSelect(dim.id)}
          className={cn(
            'whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-colors duration-150 flex-shrink-0',
            current === dim.id
              ? 'bg-[var(--action-accent,#1d4ed8)] text-white border-[var(--action-accent,#1d4ed8)] font-semibold'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--bg-subtle)]'
          )}
          title={t[dim.descKey]}
        >
          {t[dim.labelKey]}
        </button>
      ))}
    </div>
  );
}
