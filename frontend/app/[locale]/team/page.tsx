'use client';

import { Suspense, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { useWideConfig } from '@/lib/hooks/useWideConfig';
import { formatRate, formatRevenue, metricColor } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CHART_PALETTE } from '@/lib/chart-palette';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';
import { SegmentedTabs } from '@/components/ui/PageTabs';
import { BrandDot } from '@/components/ui/BrandDot';

/* ── i18n ──────────────────────────────────────────────────── */

const I18N = {
  zh: {
    tabCC: 'CC 前端',
    tabSS: 'SS 后端',
    tabLP: 'LP 服务',
    loadFail: '数据加载失败',
    loadFailCCDesc: '无法获取团队数据，请检查后端服务',
    loadFailRoleDesc: (role: string) => `无法获取 ${role} 团队数据，请检查后端服务`,
    retry: '重试',
    insightTitle: '💡 团队效率摘要',
    insightRoleTitle: (role: string) => `💡 ${role} 效率摘要`,
    insightTopLabel: '参与率最高：',
    insightBottomLabel: '；参与率最低：',
    insightGap: (pp: number) => `，差距 ${pp}pp`,
    colorHint: '颜色：',
    colorGreen: '绿≥50%',
    colorAmber: '橙30-50%',
    colorRed: '红<30%',
    colorHintSuffix: '（参与率/打卡率/触达率）',
    colorGreenLow: '绿≥20%',
    colorAmberLow: '橙10-20%',
    colorRedLow: '红<10%',
    colorHintParticipation: '（参与率）',
    colorHintCheckin: '（打卡率）',
    ccTableTitle: 'CC 个人绩效排名',
    noCCData: '暂无 CC 数据',
    noCCDesc: '上传数据文件后自动刷新',
    noRoleData: (role: string) => `暂无 ${role} 数据`,
    noRoleDesc: '上传数据文件后自动刷新',
    clickToSort: '点击排序',
    colRank: '排名',
    colName: '姓名',
    colTeam: '团队',
    colGroup: '组名',
    colStudents: '学员数',
    ttStudents: '已付费且在有效期内的学员',
    colParticipation: '参与率',
    ttParticipation: '带来≥1注册的学员 / 有效学员',
    colRegistrations: '注册数',
    colPayments: '付费数',
    colCheckin: '打卡率',
    ttCheckin: '转码且分享的学员 / 有效学员',
    colReach: 'CC触达率',
    ttReach: '有效通话(≥120s)学员 / 有效学员',
    colRevenue: '业绩',
    chartRegKey: '注册',
    chartPayKey: '付费',
    chartCCTitle: 'CC 注册 vs 付费对比',
    chartRoleTitle: (role: string) => `${role} 注册 vs 付费对比`,
    roleTableTitle: (role: string) => `${role} 组级绩效排名`,
    pageTitle: '团队汇总',
    pageDesc: 'CC / SS / LP 三岗团队绩效 · 学员数 · 参与率 · 注册 · 付费',
    pageHintTemplate: (mapping: string) => `围场×岗位分工（按 Settings 配置）：${mapping}`,
    csvGroup: '组别',
    csvStudents: '学员数',
    csvParticipation: '参与率',
    csvRegistrations: '注册数',
    csvPayments: '付费数',
    csvRevenue: '业绩(USD)',
    csvCheckin: '打卡率',
    csvReach: '触达率',
    exportCCFileName: (d: string) => `团队汇总_CC_${d}`,
    exportSSFileName: (d: string) => `团队汇总_SS_${d}`,
    exportLPFileName: (d: string) => `团队汇总_LP_${d}`,
  },
  'zh-TW': {
    tabCC: 'CC 前端',
    tabSS: 'SS 後端',
    tabLP: 'LP 服務',
    loadFail: '資料載入失敗',
    loadFailCCDesc: '無法獲取團隊資料，請檢查後端服務',
    loadFailRoleDesc: (role: string) => `無法獲取 ${role} 團隊資料，請檢查後端服務`,
    retry: '重試',
    insightTitle: '💡 團隊效率摘要',
    insightRoleTitle: (role: string) => `💡 ${role} 效率摘要`,
    insightTopLabel: '參與率最高：',
    insightBottomLabel: '；參與率最低：',
    insightGap: (pp: number) => `，差距 ${pp}pp`,
    colorHint: '顏色：',
    colorGreen: '綠≥50%',
    colorAmber: '橙30-50%',
    colorRed: '紅<30%',
    colorHintSuffix: '（參與率/Check-in率/觸達率）',
    colorGreenLow: '綠≥20%',
    colorAmberLow: '橙10-20%',
    colorRedLow: '紅<10%',
    colorHintParticipation: '（參與率）',
    colorHintCheckin: '（Check-in率）',
    ccTableTitle: 'CC 個人績效排名',
    noCCData: '暫無 CC 資料',
    noCCDesc: '上傳資料檔案後自動刷新',
    noRoleData: (role: string) => `暫無 ${role} 資料`,
    noRoleDesc: '上傳資料檔案後自動刷新',
    clickToSort: '點擊排序',
    colRank: '排名',
    colName: '姓名',
    colTeam: '團隊',
    colGroup: '組名',
    colStudents: '學員數',
    ttStudents: '已付費且在有效期內的學員',
    colParticipation: '參與率',
    ttParticipation: '帶來≥1註冊的學員 / 有效學員',
    colRegistrations: '註冊數',
    colPayments: '付費數',
    colCheckin: 'Check-in率',
    ttCheckin: '轉碼且分享的學員 / 有效學員',
    colReach: 'CC觸達率',
    ttReach: '有效通話(≥120s)學員 / 有效學員',
    colRevenue: '業績',
    chartRegKey: '註冊',
    chartPayKey: '付費',
    chartCCTitle: 'CC 註冊 vs 付費對比',
    chartRoleTitle: (role: string) => `${role} 註冊 vs 付費對比`,
    roleTableTitle: (role: string) => `${role} 組級績效排名`,
    pageTitle: '團隊匯總',
    pageDesc: 'CC / SS / LP 三崗團隊績效 · 學員數 · 參與率 · 註冊 · 付費',
    pageHintTemplate: (mapping: string) => `圍場×崗位分工（按 Settings 配置）：${mapping}`,
    csvGroup: '組別',
    csvStudents: '學員數',
    csvParticipation: '參與率',
    csvRegistrations: '註冊數',
    csvPayments: '付費數',
    csvRevenue: '業績(USD)',
    csvCheckin: 'Check-in率',
    csvReach: '觸達率',
    exportCCFileName: (d: string) => `團隊匯總_CC_${d}`,
    exportSSFileName: (d: string) => `團隊匯總_SS_${d}`,
    exportLPFileName: (d: string) => `團隊匯總_LP_${d}`,
  },
  en: {
    tabCC: 'CC Front',
    tabSS: 'SS Back',
    tabLP: 'LP Service',
    loadFail: 'Failed to load data',
    loadFailCCDesc: 'Cannot fetch team data, please check backend service',
    loadFailRoleDesc: (role: string) =>
      `Cannot fetch ${role} team data, please check backend service`,
    retry: 'Retry',
    insightTitle: '💡 Team Efficiency Summary',
    insightRoleTitle: (role: string) => `💡 ${role} Efficiency Summary`,
    insightTopLabel: 'Highest participation: ',
    insightBottomLabel: '; Lowest: ',
    insightGap: (pp: number) => `, gap ${pp}pp`,
    colorHint: 'Color: ',
    colorGreen: 'Green≥50%',
    colorAmber: 'Amber30-50%',
    colorRed: 'Red<30%',
    colorHintSuffix: ' (participation/check-in/reach)',
    colorGreenLow: 'Green≥20%',
    colorAmberLow: 'Amber10-20%',
    colorRedLow: 'Red<10%',
    colorHintParticipation: ' (participation)',
    colorHintCheckin: ' (check-in)',
    ccTableTitle: 'CC Individual Performance Ranking',
    noCCData: 'No CC data',
    noCCDesc: 'Upload data file to refresh',
    noRoleData: (role: string) => `No ${role} data`,
    noRoleDesc: 'Upload data file to refresh',
    clickToSort: 'Click to sort',
    colRank: 'Rank',
    colName: 'Name',
    colTeam: 'Team',
    colGroup: 'Group',
    colStudents: 'Students',
    ttStudents: 'Paid students in active period',
    colParticipation: 'Participation',
    ttParticipation: 'Students with ≥1 referral / active students',
    colRegistrations: 'Registrations',
    colPayments: 'Payments',
    colCheckin: 'Check-in',
    ttCheckin: 'Students who shared / active students',
    colReach: 'CC Reach',
    ttReach: 'Students with ≥120s call / active students',
    colRevenue: 'Revenue',
    chartRegKey: 'Reg.',
    chartPayKey: 'Paid',
    chartCCTitle: 'CC Registrations vs Payments',
    chartRoleTitle: (role: string) => `${role} Registrations vs Payments`,
    roleTableTitle: (role: string) => `${role} Group Performance Ranking`,
    pageTitle: 'Team Summary',
    pageDesc: 'CC / SS / LP team performance · Students · Participation · Registrations · Payments',
    pageHintTemplate: (mapping: string) => `Enclosure × Role (per Settings): ${mapping}`,
    csvGroup: 'Group',
    csvStudents: 'Students',
    csvParticipation: 'Participation',
    csvRegistrations: 'Registrations',
    csvPayments: 'Payments',
    csvRevenue: 'Revenue(USD)',
    csvCheckin: 'Check-in',
    csvReach: 'Reach',
    exportCCFileName: (d: string) => `TeamSummary_CC_${d}`,
    exportSSFileName: (d: string) => `TeamSummary_SS_${d}`,
    exportLPFileName: (d: string) => `TeamSummary_LP_${d}`,
  },
  th: {
    tabCC: 'CC ฝ่ายหน้า',
    tabSS: 'SS ฝ่ายหลัง',
    tabLP: 'LP บริการ',
    loadFail: 'โหลดข้อมูลไม่สำเร็จ',
    loadFailCCDesc: 'ไม่สามารถดึงข้อมูลทีมได้ กรุณาตรวจสอบบริการ backend',
    loadFailRoleDesc: (role: string) =>
      `ไม่สามารถดึงข้อมูลทีม ${role} ได้ กรุณาตรวจสอบบริการ backend`,
    retry: 'ลองอีกครั้ง',
    insightTitle: '💡 สรุปประสิทธิภาพทีม',
    insightRoleTitle: (role: string) => `💡 สรุปประสิทธิภาพ ${role}`,
    insightTopLabel: 'อัตราการมีส่วนร่วมสูงสุด: ',
    insightBottomLabel: '; ต่ำสุด: ',
    insightGap: (pp: number) => `, ช่องว่าง ${pp}pp`,
    colorHint: 'สี: ',
    colorGreen: 'เขียว≥50%',
    colorAmber: 'เหลือง30-50%',
    colorRed: 'แดง<30%',
    colorHintSuffix: ' (มีส่วนร่วม/เช็คอิน/การเข้าถึง)',
    colorGreenLow: 'เขียว≥20%',
    colorAmberLow: 'เหลือง10-20%',
    colorRedLow: 'แดง<10%',
    colorHintParticipation: ' (มีส่วนร่วม)',
    colorHintCheckin: ' (เช็คอิน)',
    ccTableTitle: 'อันดับประสิทธิภาพรายบุคคล CC',
    noCCData: 'ไม่มีข้อมูล CC',
    noCCDesc: 'อัปโหลดไฟล์ข้อมูลเพื่อรีเฟรช',
    noRoleData: (role: string) => `ไม่มีข้อมูล ${role}`,
    noRoleDesc: 'อัปโหลดไฟล์ข้อมูลเพื่อรีเฟรช',
    clickToSort: 'คลิกเพื่อจัดเรียง',
    colRank: 'อันดับ',
    colName: 'ชื่อ',
    colTeam: 'ทีม',
    colGroup: 'กลุ่ม',
    colStudents: 'นักเรียน',
    ttStudents: 'นักเรียนที่ชำระเงินในช่วงที่มีผล',
    colParticipation: 'มีส่วนร่วม',
    ttParticipation: 'นักเรียนที่แนะนำ ≥1 คน / นักเรียนที่มีผล',
    colRegistrations: 'ลงทะเบียน',
    colPayments: 'ชำระเงิน',
    colCheckin: 'เช็คอิน',
    ttCheckin: 'นักเรียนที่แชร์ / นักเรียนที่มีผล',
    colReach: 'การเข้าถึง CC',
    ttReach: 'นักเรียนที่โทร ≥120s / นักเรียนที่มีผล',
    colRevenue: 'รายได้',
    chartRegKey: 'ลงทะเบียน',
    chartPayKey: 'ชำระเงิน',
    chartCCTitle: 'CC ลงทะเบียน vs ชำระเงิน',
    chartRoleTitle: (role: string) => `${role} ลงทะเบียน vs ชำระเงิน`,
    roleTableTitle: (role: string) => `อันดับประสิทธิภาพกลุ่ม ${role}`,
    pageTitle: 'สรุปทีม',
    pageDesc: 'ประสิทธิภาพทีม CC / SS / LP · นักเรียน · การมีส่วนร่วม · ลงทะเบียน · ชำระเงิน',
    pageHintTemplate: (mapping: string) => `คอก×บทบาท (ตาม Settings): ${mapping}`,
    csvGroup: 'กลุ่ม',
    csvStudents: 'นักเรียน',
    csvParticipation: 'มีส่วนร่วม',
    csvRegistrations: 'ลงทะเบียน',
    csvPayments: 'ชำระเงิน',
    csvRevenue: 'รายได้(USD)',
    csvCheckin: 'เช็คอิน',
    csvReach: 'การเข้าถึง',
    exportCCFileName: (d: string) => `TeamSummary_CC_${d}`,
    exportSSFileName: (d: string) => `TeamSummary_SS_${d}`,
    exportLPFileName: (d: string) => `TeamSummary_LP_${d}`,
  },
};

/* ── 类型 ──────────────────────────────────────────────────── */

type TabKey = 'cc' | 'ss' | 'lp';

interface TeamMember {
  cc_name: string;
  cc_group: string;
  students: number;
  participation_rate: number;
  registrations: number;
  payments: number;
  revenue_usd: number;
  checkin_rate?: number;
  cc_reach_rate?: number;
}

interface TeamSummaryResponse {
  teams: TeamMember[];
}

interface RankingMember {
  name: string;
  group: string;
  students: number;
  participation_rate: number;
  checkin_rate: number;
  registrations: number;
  payments: number;
  revenue_usd: number;
}

interface RankingResponse {
  rankings: RankingMember[];
}

/* ── 工具函数 ───────────────────────────────────────────────── */

// metricColor 已移至 lib/utils.ts 共享

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1
      ? 'bg-warning-surface text-warning-token'
      : rank === 2
        ? 'bg-subtle text-secondary-token'
        : rank === 3
          ? 'bg-orange-50 text-orange-600'
          : 'text-muted-token';
  return (
    <span
      className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${cls}`}
    >
      {rank}
    </span>
  );
}

/* ── Tab Bar ──────────────────────────────────────────────── */

function TabBar({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'cc', label: t.tabCC },
    { key: 'ss', label: t.tabSS },
    { key: 'lp', label: t.tabLP },
  ];
  return <SegmentedTabs tabs={tabs} active={active} onChange={onChange} />;
}

/* ── 排序 hook（CC Tab 专用）──────────────────────────────── */

type SortDir = 'asc' | 'desc';

function useSortState(defaultKey: string, defaultDir: SortDir = 'desc') {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const handleSort = useCallback(
    (key: string) => {
      if (key === sortKey) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('desc');
      }
    },
    [sortKey]
  );

  return { sortKey, sortDir, handleSort };
}

/* ── CC Tab：表格（与 SS/LP 统一样式）───────────────────── */

function CCTabContent() {
  const locale = useLocale();
  const tr = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const { data, isLoading, error, mutate } =
    useFilteredSWR<TeamSummaryResponse>('/api/team/summary');
  const { sortKey, sortDir, handleSort } = useSortState('participation_rate');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} className="h-10" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        title={tr.loadFail}
        description={tr.loadFailCCDesc}
        action={{ label: tr.retry, onClick: () => mutate() }}
      />
    );
  }

  const rawTeams = Array.isArray(data) ? data : (data?.teams ?? []);

  // 排序
  const teams = [...rawTeams].sort((a, b) => {
    const va = (a as Record<string, unknown>)[sortKey] ?? 0;
    const vb = (b as Record<string, unknown>)[sortKey] ?? 0;
    const diff = (va as number) - (vb as number);
    return sortDir === 'asc' ? diff : -diff;
  });

  const chartData = teams.map((member) => ({
    name: member.cc_name,
    [tr.chartRegKey]: member.registrations,
    [tr.chartPayKey]: member.payments,
  }));

  // insight：按参与率 top/bottom
  const sortedByPart = [...rawTeams].sort(
    (a, b) => (b.participation_rate ?? 0) - (a.participation_rate ?? 0)
  );
  const topCC = sortedByPart[0];
  const bottomCC = sortedByPart[sortedByPart.length - 1];

  function sortIcon(key: string) {
    if (sortKey !== key) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  function thProps(key: string, align: 'left' | 'right' = 'right') {
    return {
      onClick: () => handleSort(key),
      title: tr.clickToSort,
      className: `slide-th ${align === 'right' ? 'slide-th-right' : 'slide-th-left'} py-2 px-2 cursor-pointer select-none hover:opacity-80`,
    };
  }

  return (
    <div className="space-y-4">
      {/* insight 卡片 */}
      {topCC && bottomCC && topCC.cc_name !== bottomCC.cc_name && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-default-token border-l-4 border-l-green-500 bg-success-surface px-4 py-3">
          <div className="text-sm font-semibold text-primary-token">{tr.insightTitle}</div>
          <div className="text-xs text-secondary-token">
            {tr.insightTopLabel}
            <span className="font-semibold text-primary-token">{topCC.cc_name}</span>{' '}
            <span className="text-success-token font-semibold">
              {formatRate(topCC.participation_rate)}
            </span>
            {tr.insightBottomLabel}
            <span className="font-semibold text-primary-token">{bottomCC.cc_name}</span>{' '}
            <span className="text-danger-token font-semibold">
              {formatRate(bottomCC.participation_rate)}
            </span>
            {topCC.participation_rate != null &&
              bottomCC.participation_rate != null &&
              tr.insightGap(
                Math.round(Math.abs(topCC.participation_rate - bottomCC.participation_rate) * 100)
              )}
            。
          </div>
          <p className="text-[10px] text-muted-token">
            {tr.colorHint}
            <span className="text-success-token font-medium">{tr.colorGreen}</span> ·{' '}
            <span className="text-warning-token font-medium">{tr.colorAmber}</span> ·{' '}
            <span className="text-danger-token font-medium">{tr.colorRed}</span>
            {tr.colorHintSuffix}
          </p>
        </div>
      )}

      {/* 排名表格 */}
      <Card title={tr.ccTableTitle}>
        {teams.length === 0 ? (
          <EmptyState title={tr.noCCData} description={tr.noCCDesc} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">{tr.colRank}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{tr.colName}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{tr.colTeam}</th>
                  <th {...thProps('students')}>
                    {tr.colStudents} <BrandDot tooltip={tr.ttStudents} />
                    {sortIcon('students')}
                  </th>
                  <th {...thProps('participation_rate')}>
                    {tr.colParticipation} <BrandDot tooltip={tr.ttParticipation} />
                    {sortIcon('participation_rate')}
                  </th>
                  <th {...thProps('registrations')}>
                    {tr.colRegistrations}
                    {sortIcon('registrations')}
                  </th>
                  <th {...thProps('payments')}>
                    {tr.colPayments}
                    {sortIcon('payments')}
                  </th>
                  <th {...thProps('checkin_rate')}>
                    {tr.colCheckin} <BrandDot tooltip={tr.ttCheckin} />
                    {sortIcon('checkin_rate')}
                  </th>
                  <th {...thProps('cc_reach_rate')}>
                    {tr.colReach} <BrandDot tooltip={tr.ttReach} />
                    {sortIcon('cc_reach_rate')}
                  </th>
                  <th {...thProps('revenue_usd')}>
                    {tr.colRevenue}
                    {sortIcon('revenue_usd')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t, i) => (
                  <tr key={t.cc_name} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td py-1.5 px-2">
                      <RankBadge rank={i + 1} />
                    </td>
                    <td className="slide-td py-1.5 px-2 font-medium">{t.cc_name}</td>
                    <td className="slide-td py-1.5 px-2 text-secondary-token">{t.cc_group}</td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(t.students ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(t.participation_rate, [0.3, 0.5])}`}
                    >
                      {t.participation_rate != null ? formatRate(t.participation_rate) : '—'}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(t.registrations ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${(t.payments ?? 0) >= 1 ? 'text-success-token font-semibold' : ''}`}
                    >
                      {(t.payments ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(t.checkin_rate, [0.3, 0.5])}`}
                    >
                      {t.checkin_rate != null ? formatRate(t.checkin_rate) : '—'}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(t.cc_reach_rate, [0.3, 0.5])}`}
                    >
                      {t.cc_reach_rate != null ? formatRate(t.cc_reach_rate) : '—'}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {formatRevenue(t.revenue_usd ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 对比柱状图 */}
      {chartData.length > 0 && (
        <Card title={tr.chartCCTitle}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md, 10px)',
                  boxShadow: 'var(--shadow-medium)',
                  fontSize: '12px',
                }}
                cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
              />
              <Legend wrapperStyle={{ paddingTop: 12 }} iconType="circle" iconSize={8} />
              <Bar
                dataKey={tr.chartRegKey}
                fill={CHART_PALETTE.c2}
                radius={[4, 4, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
              <Bar
                dataKey={tr.chartPayKey}
                fill={CHART_PALETTE.c4}
                radius={[4, 4, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

/* ── SS/LP 通用排名表格 ─────────────────────────────────── */

function RoleRankingContent({ role, apiUrl }: { role: 'SS' | 'LP'; apiUrl: string }) {
  const locale = useLocale();
  const tr = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const { data, isLoading, error, mutate } = useFilteredSWR<RankingResponse>(apiUrl);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} className="h-10" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        title={tr.loadFail}
        description={tr.loadFailRoleDesc(role)}
        action={{ label: tr.retry, onClick: () => mutate() }}
      />
    );
  }

  const rankings = Array.isArray(data) ? data : (data?.rankings ?? []);
  const chartData = rankings.map((r) => ({
    name: r.name,
    [tr.chartRegKey]: r.registrations,
    [tr.chartPayKey]: r.payments,
  }));

  // Top/Bottom（按参与率）
  const sortedByParticipation = [...rankings].sort(
    (a, b) => (b.participation_rate ?? 0) - (a.participation_rate ?? 0)
  );
  const topMember = sortedByParticipation[0];
  const bottomMember = sortedByParticipation[sortedByParticipation.length - 1];

  return (
    <div className="space-y-4">
      {/* 效率 insight 卡片 */}
      {topMember && bottomMember && topMember.name !== bottomMember.name && (
        <div className="flex flex-col gap-1 rounded-lg border border-default-token border-l-4 border-l-green-500 bg-success-surface px-4 py-3">
          <div className="text-sm font-semibold text-primary-token">
            {tr.insightRoleTitle(role)}
          </div>
          <div className="text-xs text-secondary-token">
            {tr.insightTopLabel}
            <span className="font-semibold text-primary-token">{topMember.name}</span>{' '}
            <span className="text-success-token font-semibold">
              {formatRate(topMember.participation_rate)}
            </span>
            {tr.insightBottomLabel}
            <span className="font-semibold text-primary-token">{bottomMember.name}</span>{' '}
            <span className="text-danger-token font-semibold">
              {formatRate(bottomMember.participation_rate)}
            </span>
            。
          </div>
          <p className="text-[10px] text-muted-token">
            {tr.colorHint}
            <span className="text-success-token font-medium">{tr.colorGreenLow}</span> ·{' '}
            <span className="text-warning-token font-medium">{tr.colorAmberLow}</span> ·{' '}
            <span className="text-danger-token font-medium">{tr.colorRedLow}</span>
            {tr.colorHintParticipation}，
            <span className="text-success-token font-medium">{tr.colorGreen}</span> ·{' '}
            <span className="text-warning-token font-medium">{tr.colorAmber}</span> ·{' '}
            <span className="text-danger-token font-medium">{tr.colorRed}</span>
            {tr.colorHintCheckin}
          </p>
        </div>
      )}
      {/* 排名表格 */}
      <Card title={tr.roleTableTitle(role)}>
        {rankings.length === 0 ? (
          <EmptyState title={tr.noRoleData(role)} description={tr.noRoleDesc} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">{tr.colRank}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{tr.colName}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{tr.colGroup}</th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {tr.colStudents} <BrandDot tooltip={tr.ttStudents} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {tr.colParticipation} <BrandDot tooltip={tr.ttParticipation} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {tr.colCheckin} <BrandDot tooltip={tr.ttCheckin} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">{tr.colRegistrations}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{tr.colPayments}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{tr.csvRevenue}</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, i) => (
                  <tr
                    key={`${r.name}-${i}`}
                    className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                  >
                    <td className="slide-td py-1.5 px-2">
                      <RankBadge rank={i + 1} />
                    </td>
                    <td className="slide-td py-1.5 px-2 font-medium">{r.name}</td>
                    <td className="slide-td py-1.5 px-2 text-secondary-token">{r.group}</td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(r.students ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.participation_rate, [0.1, 0.2])}`}
                    >
                      {r.participation_rate != null ? formatRate(r.participation_rate) : '—'}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.checkin_rate, [0.3, 0.5])}`}
                    >
                      {r.checkin_rate != null ? formatRate(r.checkin_rate) : '—'}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(r.registrations ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(r.payments ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {r.revenue_usd != null ? `$${r.revenue_usd.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 对比柱状图 */}
      {chartData.length > 0 && (
        <Card title={tr.chartRoleTitle(role)}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md, 10px)',
                  boxShadow: 'var(--shadow-medium)',
                  fontSize: '12px',
                }}
                cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
              />
              <Legend wrapperStyle={{ paddingTop: 12 }} iconType="circle" iconSize={8} />
              <Bar
                dataKey={tr.chartRegKey}
                fill={CHART_PALETTE.c2}
                radius={[4, 4, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
              <Bar
                dataKey={tr.chartPayKey}
                fill={CHART_PALETTE.c4}
                radius={[4, 4, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

/* ── 主页面内部 ──────────────────────────────────────────── */

function TeamPageInner() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
  });
  const locale = useLocale();
  const tr = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') ?? 'cc') as TabKey;
  const { exportCSV } = useExport();

  const { data: ccData } = useFilteredSWR<TeamSummaryResponse>('/api/team/summary');
  const { data: ssData } = useFilteredSWR<RankingResponse>('/api/team/ss-ranking');
  const { data: lpData } = useFilteredSWR<RankingResponse>('/api/team/lp-ranking');

  // 从 config 动态生成围场×角色描述（非硬编码）
  const { roleEnclosures } = useWideConfig();
  const roleHint = Object.entries(roleEnclosures ?? {})
    .map(([role, encs]) => `${role}=${(encs as string[]).join('/')}`)
    .join('；');

  function handleTabChange(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/team?${params.toString()}`);
  }

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10);
    if (activeTab === 'cc') {
      const teams = Array.isArray(ccData) ? ccData : (ccData?.teams ?? []);
      exportCSV(
        teams as unknown as Record<string, unknown>[],
        [
          { key: 'cc_name', label: 'CC' },
          { key: 'cc_group', label: tr.csvGroup },
          { key: 'students', label: tr.csvStudents },
          { key: 'participation_rate', label: tr.csvParticipation },
          { key: 'registrations', label: tr.csvRegistrations },
          { key: 'payments', label: tr.csvPayments },
          { key: 'revenue_usd', label: tr.csvRevenue },
          { key: 'checkin_rate', label: tr.csvCheckin },
          { key: 'cc_reach_rate', label: tr.csvReach },
        ],
        tr.exportCCFileName(today)
      );
    } else if (activeTab === 'ss') {
      const rankings = Array.isArray(ssData) ? ssData : (ssData?.rankings ?? []);
      exportCSV(
        rankings as unknown as Record<string, unknown>[],
        [
          { key: 'name', label: tr.colName },
          { key: 'group', label: tr.csvGroup },
          { key: 'students', label: tr.csvStudents },
          { key: 'participation_rate', label: tr.csvParticipation },
          { key: 'checkin_rate', label: tr.csvCheckin },
          { key: 'registrations', label: tr.csvRegistrations },
          { key: 'payments', label: tr.csvPayments },
          { key: 'revenue_usd', label: tr.csvRevenue },
        ],
        tr.exportSSFileName(today)
      );
    } else {
      const rankings = Array.isArray(lpData) ? lpData : (lpData?.rankings ?? []);
      exportCSV(
        rankings as unknown as Record<string, unknown>[],
        [
          { key: 'name', label: tr.colName },
          { key: 'group', label: tr.csvGroup },
          { key: 'students', label: tr.csvStudents },
          { key: 'participation_rate', label: tr.csvParticipation },
          { key: 'checkin_rate', label: tr.csvCheckin },
          { key: 'registrations', label: tr.csvRegistrations },
          { key: 'payments', label: tr.csvPayments },
          { key: 'revenue_usd', label: tr.csvRevenue },
        ],
        tr.exportLPFileName(today)
      );
    }
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="page-title">{tr.pageTitle}</h1>
          <p className="text-sm text-secondary-token mt-1">{tr.pageDesc}</p>
          <p className="text-sm text-muted-token mt-0.5">{tr.pageHintTemplate(roleHint)}</p>
        </div>
        <ExportButton onExportCsv={handleExport} />
      </div>

      <TabBar active={activeTab} onChange={handleTabChange} />

      {activeTab === 'cc' && <CCTabContent />}
      {activeTab === 'ss' && <RoleRankingContent role="SS" apiUrl="/api/team/ss-ranking" />}
      {activeTab === 'lp' && <RoleRankingContent role="LP" apiUrl="/api/team/lp-ranking" />}
    </div>
  );
}

/* ── 导出 ─────────────────────────────────────────────────── */

export default function TeamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      }
    >
      <TeamPageInner />
    </Suspense>
  );
}
