'use client';

import { useState, useMemo } from 'react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatUSD, formatRate } from '@/lib/utils';
import type { RoiAnalysisResponse, RoiStudentRow, RiskLevel } from '@/lib/types/checkin-roi';
import { RISK_LEVEL_CONFIG, getRiskLabel } from '@/lib/types/checkin-roi';
import { useLocale } from 'next-intl';

// ── i18n ──────────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    filterAll: '全部',
    filterGold: '⭐ 金牌推荐人',
    filterEffective: '✅ 有效推荐',
    filterStuckPay: '🔄 成交待跟进',
    filterStuckShow: '🔄 出席待跟进',
    filterPotential: '👀 高潜待激活',
    filterFreeloader: '⚠️ 纯消耗',
    filterNewcomer: '🆕 新人观望',
    filterCasual: '💤 低频参与',
    sortByRoi: '按 ROI 排序',
    sortByRevenue: '按收入排序',
    sortByCost: '按成本排序',
    exportCsv: '导出 CSV',
    studentCount: '位学员',
    filteredBy: '（已按',
    filteredBySuffix: '筛选）',
    noStudents: '该风险等级下无学员',
    loadFail: 'ROI 数据加载失败',
    loadFailDesc: '请检查后端服务是否正常运行',
    emptyTitle: '暂无学员 ROI 数据',
    emptyDesc: '当前条件下无参与活动的学员',
    colRank: '#',
    colStudentId: '学员 ID',
    colEnclosure: '围场',
    colOwner: '负责人',
    colActivityCard: '活动卡',
    colBindingCard: '绑定卡',
    colAttendCard: '出席卡',
    colPayCard: '付费卡',
    colTotalCost: '总成本',
    colRevenue: '收入',
    colRoi: 'ROI',
    colRiskLevel: '风险等级',
    colCheckin: '打卡次',
    colLesson: '课耗',
    csvRank: '排名',
    csvStudentId: '学员ID',
    csvEnclosure: '围场',
    csvOwner: '负责人',
    csvTeam: '团队',
    csvActivityCards: '活动次卡',
    csvBindingCards: '绑定次卡',
    csvAttendCards: '出席次卡',
    csvPayCards: '付费次卡',
    csvTotalCards: '总次卡',
    csvTotalCost: '总成本(USD)',
    csvRevenue: '收入(USD)',
    csvRoi: 'ROI%',
    csvRiskLevel: '风险等级',
    csvCheckin: '本月打卡',
    csvLesson: '课耗',
    csvFilePrefix: 'ROI学员排行',
  },
  'zh-TW': {
    filterAll: '全部',
    filterGold: '⭐ 金牌推薦人',
    filterEffective: '✅ 有效推薦',
    filterStuckPay: '🔄 成交待跟進',
    filterStuckShow: '🔄 出席待跟進',
    filterPotential: '👀 高潛待激活',
    filterFreeloader: '⚠️ 純消耗',
    filterNewcomer: '🆕 新人觀望',
    filterCasual: '💤 低頻參與',
    sortByRoi: '按 ROI 排序',
    sortByRevenue: '按收入排序',
    sortByCost: '按成本排序',
    exportCsv: '匯出 CSV',
    studentCount: '位學員',
    filteredBy: '（已按',
    filteredBySuffix: '篩選）',
    noStudents: '此風險等級下無學員',
    loadFail: 'ROI 資料載入失敗',
    loadFailDesc: '請檢查後端服務是否正常運行',
    emptyTitle: '暫無學員 ROI 資料',
    emptyDesc: '目前條件下無參與活動的學員',
    colRank: '#',
    colStudentId: '學員 ID',
    colEnclosure: '圍場',
    colOwner: '負責人',
    colActivityCard: '活動卡',
    colBindingCard: '綁定卡',
    colAttendCard: '出席卡',
    colPayCard: '付費卡',
    colTotalCost: '總成本',
    colRevenue: '收入',
    colRoi: 'ROI',
    colRiskLevel: '風險等級',
    colCheckin: '打卡次',
    colLesson: '課耗',
    csvRank: '排名',
    csvStudentId: '學員ID',
    csvEnclosure: '圍場',
    csvOwner: '負責人',
    csvTeam: '團隊',
    csvActivityCards: '活動次卡',
    csvBindingCards: '綁定次卡',
    csvAttendCards: '出席次卡',
    csvPayCards: '付費次卡',
    csvTotalCards: '總次卡',
    csvTotalCost: '總成本(USD)',
    csvRevenue: '收入(USD)',
    csvRoi: 'ROI%',
    csvRiskLevel: '風險等級',
    csvCheckin: '本月打卡',
    csvLesson: '課耗',
    csvFilePrefix: 'ROI學員排行',
  },
  en: {
    filterAll: 'All',
    filterGold: '⭐ Gold Referrer',
    filterEffective: '✅ Effective Referral',
    filterStuckPay: '🔄 Pending Payment',
    filterStuckShow: '🔄 Pending Attendance',
    filterPotential: '👀 High Potential',
    filterFreeloader: '⚠️ Free Rider',
    filterNewcomer: '🆕 Newcomer',
    filterCasual: '💤 Low Engagement',
    sortByRoi: 'Sort by ROI',
    sortByRevenue: 'Sort by Revenue',
    sortByCost: 'Sort by Cost',
    exportCsv: 'Export CSV',
    studentCount: 'students',
    filteredBy: '(filtered by ',
    filteredBySuffix: ')',
    noStudents: 'No students in this risk level',
    loadFail: 'ROI Data Load Failed',
    loadFailDesc: 'Please check if backend service is running',
    emptyTitle: 'No Student ROI Data',
    emptyDesc: 'No students participated in activities under current conditions',
    colRank: '#',
    colStudentId: 'Student ID',
    colEnclosure: 'Enclosure',
    colOwner: 'Owner',
    colActivityCard: 'Activity',
    colBindingCard: 'Binding',
    colAttendCard: 'Attend',
    colPayCard: 'Payment',
    colTotalCost: 'Total Cost',
    colRevenue: 'Revenue',
    colRoi: 'ROI',
    colRiskLevel: 'Risk Level',
    colCheckin: 'Check-in',
    colLesson: 'Lesson',
    csvRank: 'Rank',
    csvStudentId: 'Student ID',
    csvEnclosure: 'Enclosure',
    csvOwner: 'Owner',
    csvTeam: 'Team',
    csvActivityCards: 'Activity Cards',
    csvBindingCards: 'Binding Cards',
    csvAttendCards: 'Attend Cards',
    csvPayCards: 'Pay Cards',
    csvTotalCards: 'Total Cards',
    csvTotalCost: 'Total Cost(USD)',
    csvRevenue: 'Revenue(USD)',
    csvRoi: 'ROI%',
    csvRiskLevel: 'Risk Level',
    csvCheckin: 'Check-in Days',
    csvLesson: 'Lesson',
    csvFilePrefix: 'ROI_Student_Ranking',
  },
  th: {
    filterAll: 'ทั้งหมด',
    filterGold: '⭐ ผู้แนะนำทองคำ',
    filterEffective: '✅ การแนะนำที่มีประสิทธิภาพ',
    filterStuckPay: '🔄 รอการติดตามการชำระเงิน',
    filterStuckShow: '🔄 รอการติดตามการเข้าร่วม',
    filterPotential: '👀 ศักยภาพสูงรอเปิดใช้งาน',
    filterFreeloader: '⚠️ ใช้โดยไม่ตอบแทน',
    filterNewcomer: '🆕 ผู้ใหม่กำลังดู',
    filterCasual: '💤 การมีส่วนร่วมน้อย',
    sortByRoi: 'เรียงตาม ROI',
    sortByRevenue: 'เรียงตามรายได้',
    sortByCost: 'เรียงตามต้นทุน',
    exportCsv: 'ส่งออก CSV',
    studentCount: 'นักเรียน',
    filteredBy: '(กรองตาม ',
    filteredBySuffix: ')',
    noStudents: 'ไม่มีนักเรียนในระดับความเสี่ยงนี้',
    loadFail: 'โหลดข้อมูล ROI ล้มเหลว',
    loadFailDesc: 'กรุณาตรวจสอบว่าบริการ backend ทำงานอยู่',
    emptyTitle: 'ไม่มีข้อมูล ROI ของนักเรียน',
    emptyDesc: 'ไม่มีนักเรียนที่เข้าร่วมกิจกรรมภายใต้เงื่อนไขปัจจุบัน',
    colRank: '#',
    colStudentId: 'รหัสนักเรียน',
    colEnclosure: 'คอก',
    colOwner: 'ผู้รับผิดชอบ',
    colActivityCard: 'บัตรกิจกรรม',
    colBindingCard: 'บัตรผูก',
    colAttendCard: 'บัตรเข้าร่วม',
    colPayCard: 'บัตรชำระ',
    colTotalCost: 'ต้นทุนรวม',
    colRevenue: 'รายได้',
    colRoi: 'ROI',
    colRiskLevel: 'ระดับความเสี่ยง',
    colCheckin: 'เช็คอิน',
    colLesson: 'บทเรียน',
    csvRank: 'อันดับ',
    csvStudentId: 'รหัสนักเรียน',
    csvEnclosure: 'คอก',
    csvOwner: 'ผู้รับผิดชอบ',
    csvTeam: 'ทีม',
    csvActivityCards: 'บัตรกิจกรรม',
    csvBindingCards: 'บัตรผูก',
    csvAttendCards: 'บัตรเข้าร่วม',
    csvPayCards: 'บัตรชำระ',
    csvTotalCards: 'บัตรทั้งหมด',
    csvTotalCost: 'ต้นทุนรวม(USD)',
    csvRevenue: 'รายได้(USD)',
    csvRoi: 'ROI%',
    csvRiskLevel: 'ระดับความเสี่ยง',
    csvCheckin: 'วันเช็คอินเดือนนี้',
    csvLesson: 'บทเรียน',
    csvFilePrefix: 'ROI_นักเรียน',
  },
} as const;
type Locale = keyof typeof I18N;

interface Props {
  roleFilter?: string;
  enclosureFilter?: string | null;
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const locale = useLocale();
  const cfg = RISK_LEVEL_CONFIG[level];
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
    >
      {cfg.emoji} {getRiskLabel(level, locale)}
    </span>
  );
}

function RoiCell({ roi }: { roi: number | null }) {
  if (roi == null) return <span className="text-[var(--text-muted)]">—</span>;
  const color = roi >= 200 ? '#16a34a' : roi >= 0 ? '#ca8a04' : '#dc2626';
  return (
    <span className="font-semibold" style={{ color }}>
      {roi.toFixed(1)}%
    </span>
  );
}

// CSV 导出
function exportToCSV(students: RoiStudentRow[], t: (typeof I18N)[keyof typeof I18N]) {
  const headers = [
    t.csvRank,
    t.csvStudentId,
    t.csvEnclosure,
    t.csvOwner,
    t.csvTeam,
    t.csvActivityCards,
    t.csvBindingCards,
    t.csvAttendCards,
    t.csvPayCards,
    t.csvTotalCards,
    t.csvTotalCost,
    t.csvRevenue,
    t.csvRoi,
    t.csvRiskLevel,
    t.csvCheckin,
    t.csvLesson,
  ];
  const rows = students.map((s, i) => [
    i + 1,
    s.student_id,
    s.enclosure,
    s.cc_name,
    s.team,
    s.activity_cards,
    s.binding_cards,
    s.attendance_cards,
    s.payment_cards,
    s.total_cards,
    s.total_cost_usd,
    s.revenue_usd,
    s.roi ?? '',
    RISK_LEVEL_CONFIG[s.risk_level]?.label ?? s.risk_level,
    s.days_this_month,
    s.lesson_this_month,
  ]);

  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${t.csvFilePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function RoiStudentTable({ roleFilter, enclosureFilter }: Props) {
  const rawLocale = useLocale();
  const locale = rawLocale as Locale;
  const t = I18N[locale] ?? I18N.zh;
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [sortKey, setSortKey] = useState<'roi' | 'cost' | 'revenue'>('roi');

  const params = new URLSearchParams();
  if (roleFilter) params.set('role', roleFilter);
  if (enclosureFilter) params.set('enclosure', enclosureFilter);

  const { data, isLoading, error } = useFilteredSWR<RoiAnalysisResponse>(
    `/api/checkin/roi-analysis${params.toString() ? '?' + params.toString() : ''}`
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.students;
    if (riskFilter !== 'all') {
      list = list.filter((s) => s.risk_level === riskFilter);
    }
    // 排序
    return [...list].sort((a, b) => {
      if (sortKey === 'roi') {
        const ar = a.roi ?? -Infinity;
        const br = b.roi ?? -Infinity;
        return br - ar;
      }
      if (sortKey === 'cost') return b.total_cost_usd - a.total_cost_usd;
      return b.revenue_usd - a.revenue_usd;
    });
  }, [data, riskFilter, sortKey]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title={t.loadFail} description={t.loadFailDesc} />;
  }

  if (!data || data.students.length === 0) {
    return <EmptyState title={t.emptyTitle} description={t.emptyDesc} />;
  }

  const FILTER_OPTIONS: { id: RiskLevel | 'all'; label: string }[] = [
    { id: 'all', label: t.filterAll },
    { id: 'gold', label: t.filterGold },
    { id: 'effective', label: t.filterEffective },
    { id: 'stuck_pay', label: t.filterStuckPay },
    { id: 'stuck_show', label: t.filterStuckShow },
    { id: 'potential', label: t.filterPotential },
    { id: 'freeloader', label: t.filterFreeloader },
    { id: 'newcomer', label: t.filterNewcomer },
    { id: 'casual', label: t.filterCasual },
  ];

  return (
    <div className="space-y-3">
      {/* 筛选 + 排序 + 导出 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setRiskFilter(opt.id)}
              className={[
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                riskFilter === opt.id
                  ? 'bg-[var(--action-accent)] text-white border-[var(--action-accent)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--bg-subtle)]',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as 'roi' | 'cost' | 'revenue')}
            className="input-base text-xs py-1 px-2"
          >
            <option value="roi">{t.sortByRoi}</option>
            <option value="revenue">{t.sortByRevenue}</option>
            <option value="cost">{t.sortByCost}</option>
          </select>
          <button
            onClick={() => exportToCSV(filtered, t)}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            {t.exportCsv}
          </button>
        </div>
      </div>

      {/* 结果数 */}
      <p className="text-xs text-[var(--text-muted)]">
        {filtered.length.toLocaleString()} {t.studentCount}
        {riskFilter !== 'all' &&
          `${t.filteredBy}${getRiskLabel(riskFilter as RiskLevel, rawLocale)}${t.filteredBySuffix}`}
      </p>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row">
              <th className="slide-th text-right w-10">{t.colRank}</th>
              <th className="slide-th">{t.colStudentId}</th>
              <th className="slide-th">{t.colEnclosure}</th>
              <th className="slide-th">{t.colOwner}</th>
              <th className="slide-th">{t.colActivityCard}</th>
              <th className="slide-th">{t.colBindingCard}</th>
              <th className="slide-th">{t.colAttendCard}</th>
              <th className="slide-th">{t.colPayCard}</th>
              <th className="slide-th text-right">{t.colTotalCost}</th>
              <th className="slide-th text-right">{t.colRevenue}</th>
              <th className="slide-th text-right">{t.colRoi}</th>
              <th className="slide-th">{t.colRiskLevel}</th>
              <th className="slide-th text-right">{t.colCheckin}</th>
              <th className="slide-th text-right">{t.colLesson}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-8 text-center text-xs text-[var(--text-muted)]">
                  {t.noStudents}
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => (
                <tr
                  key={s.student_id || i}
                  className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                >
                  <td className="slide-td text-right text-[var(--text-muted)]">{i + 1}</td>
                  <td className="slide-td font-mono text-xs">{s.student_id || '—'}</td>
                  <td className="slide-td">{s.enclosure || '—'}</td>
                  <td className="slide-td">{s.cc_name || '—'}</td>
                  <td className="slide-td text-right">{s.activity_cards}</td>
                  <td className="slide-td text-right">{s.binding_cards}</td>
                  <td className="slide-td text-right">{s.attendance_cards}</td>
                  <td className="slide-td text-right">{s.payment_cards}</td>
                  <td className="slide-td text-right">{formatUSD(s.total_cost_usd)}</td>
                  <td className="slide-td text-right">{formatUSD(s.revenue_usd)}</td>
                  <td className="slide-td text-right">
                    <RoiCell roi={s.roi} />
                  </td>
                  <td className="slide-td">
                    <RiskBadge level={s.risk_level} />
                  </td>
                  <td className="slide-td text-right">{s.days_this_month}</td>
                  <td className="slide-td text-right">
                    {s.lesson_this_month > 0 ? s.lesson_this_month.toFixed(1) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
