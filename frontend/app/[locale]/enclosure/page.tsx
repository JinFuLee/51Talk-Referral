'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import useSWR from 'swr';

/* ── i18n ───────────────────────────────────────────────────── */

const I18N = {
  zh: {
    pageTitle: '围场分析',
    pageDesc: '围场分段 × 三岗矩阵 · CC / SS / LP 全维度视图',
    pageDesc2: '按学员付费时长分段（M0~M12+）对比各围场效率',
    tabAll: '全部汇总',
    tabCC: 'CC 前端',
    tabSS: 'SS 后端',
    tabLP: 'LP 服务',
    filterAll: '全部',
    colorHint: '颜色：',
    colorGreen: '绿≥50%',
    colorOrange: '橙30-50%',
    colorRed: '红<30%',
    colorSuffix: '（参与率/打卡率/触达率）',
    colEnclosure: '围场段',
    colCC: 'CC',
    colSS: 'SS',
    colLP: 'LP',
    colName: '姓名',
    colGroup: '组别',
    colStudents: '有效学员',
    colStudentsTip: '已付费且在有效期内的学员',
    colParticipation: '参与率',
    colParticipationTip: '带来≥1注册的学员 / 有效学员',
    colNewCoef: '带新系数',
    colNewCoefTip: '每个参与学员平均带来的注册数（>2为优质）',
    colCargoRatio: '带货比',
    colCargoRatioTip: '推荐注册数 / 有效学员，衡量整体渗透率',
    colCheckin: '打卡率',
    colCheckinTip: '转码且分享的学员 / 有效学员',
    colRegistrations: '注册数',
    colSSReach: 'SS触达率',
    colSSReachTip: 'SS有效通话(≥120s)学员 / 有效学员',
    colLPReach: 'LP触达率',
    colLPReachTip: 'LP有效通话(≥120s)学员 / 有效学员',
    colPayments: '付费数',
    colRevenue: '业绩(USD)',
    colRank: '排名',
    colReach: '触达率',
    colReachTip: '有效通话(≥120s)学员 / 有效学员',
    cardCCMatrix: '围场 × CC 矩阵',
    cardFunnel: '围场段漏斗对比（注册→付费转化率）',
    cardCCRank: 'CC 排名（按参与率）',
    cardSSRank: 'SS 排名（按注册数降序）',
    cardSSEncSum: 'SS 围场分布汇总',
    cardLPRank: 'LP 排名（按注册数降序）',
    cardLPEncSum: 'LP 围场分布汇总',
    emptyEnclosure: '暂无围场数据',
    emptyEnclosureDesc: '上传数据后自动刷新',
    emptyFunnel: '暂无漏斗对比数据',
    emptyFunnelDesc: '上传围场数据后自动生成',
    emptyRank: '暂无排名数据',
    emptyRankDesc: '上传数据后自动刷新',
    emptySS: '暂无 SS 数据',
    emptySSDesc: '上传围场数据后自动生成',
    emptySSSum: '暂无围场汇总数据',
    emptySSDesc2: '上传数据后自动刷新',
    emptyLP: '暂无 LP 数据',
    emptyLPDesc: '上传围场数据后自动生成',
    loadFailed: '数据加载失败',
    loadFailedDesc: '请检查后端服务是否正常运行',
    insightTitle: '💡 围场效率概览',
    insightHighest: '围场参与率最高（',
    insightLow: '围场参与率低于 10%，需重点关注',
    colEffStudents: '有效学员',
    colRegCount: '注册数',
    colPaidCount: '付费数',
    colRevUSD: '业绩(USD)',
    chartParticipation: '参与率',
    chartConversion: '转化率',
    chartReach: '触达率',
  },
  'zh-TW': {
    pageTitle: '圍場分析',
    pageDesc: '圍場分段 × 三崗矩陣 · CC / SS / LP 全維度視圖',
    pageDesc2: '按學員付費時長分段（M0~M12+）對比各圍場效率',
    tabAll: '全部匯總',
    tabCC: 'CC 前端',
    tabSS: 'SS 後端',
    tabLP: 'LP 服務',
    filterAll: '全部',
    colorHint: '顏色：',
    colorGreen: '綠≥50%',
    colorOrange: '橙30-50%',
    colorRed: '紅<30%',
    colorSuffix: '（參與率/打卡率/觸達率）',
    colEnclosure: '圍場段',
    colCC: 'CC',
    colSS: 'SS',
    colLP: 'LP',
    colName: '姓名',
    colGroup: '組別',
    colStudents: '有效學員',
    colStudentsTip: '已付費且在有效期內的學員',
    colParticipation: '參與率',
    colParticipationTip: '帶來≥1註冊的學員 / 有效學員',
    colNewCoef: '帶新系數',
    colNewCoefTip: '每個參與學員平均帶來的註冊數（>2為優質）',
    colCargoRatio: '帶貨比',
    colCargoRatioTip: '推薦註冊數 / 有效學員，衡量整體滲透率',
    colCheckin: '打卡率',
    colCheckinTip: '轉碼且分享的學員 / 有效學員',
    colRegistrations: '註冊數',
    colSSReach: 'SS觸達率',
    colSSReachTip: 'SS有效通話(≥120s)學員 / 有效學員',
    colLPReach: 'LP觸達率',
    colLPReachTip: 'LP有效通話(≥120s)學員 / 有效學員',
    colPayments: '付費數',
    colRevenue: '業績(USD)',
    colRank: '排名',
    colReach: '觸達率',
    colReachTip: '有效通話(≥120s)學員 / 有效學員',
    cardCCMatrix: '圍場 × CC 矩陣',
    cardFunnel: '圍場段漏斗對比（註冊→付費轉化率）',
    cardCCRank: 'CC 排名（按參與率）',
    cardSSRank: 'SS 排名（按註冊數降序）',
    cardSSEncSum: 'SS 圍場分佈匯總',
    cardLPRank: 'LP 排名（按註冊數降序）',
    cardLPEncSum: 'LP 圍場分佈匯總',
    emptyEnclosure: '暫無圍場資料',
    emptyEnclosureDesc: '上傳資料後自動重新整理',
    emptyFunnel: '暫無漏斗對比資料',
    emptyFunnelDesc: '上傳圍場資料後自動生成',
    emptyRank: '暫無排名資料',
    emptyRankDesc: '上傳資料後自動重新整理',
    emptySS: '暫無 SS 資料',
    emptySSDesc: '上傳圍場資料後自動生成',
    emptySSSum: '暫無圍場匯總資料',
    emptySSDesc2: '上傳資料後自動重新整理',
    emptyLP: '暫無 LP 資料',
    emptyLPDesc: '上傳圍場資料後自動生成',
    loadFailed: '資料載入失敗',
    loadFailedDesc: '請檢查後端服務是否正常運行',
    insightTitle: '💡 圍場效率概覽',
    insightHighest: '圍場參與率最高（',
    insightLow: '圍場參與率低於 10%，需重點關注',
    colEffStudents: '有效學員',
    colRegCount: '註冊數',
    colPaidCount: '付費數',
    colRevUSD: '業績(USD)',
    chartParticipation: '參與率',
    chartConversion: '轉化率',
    chartReach: '觸達率',
  },
  en: {
    pageTitle: 'Enclosure Analysis',
    pageDesc: 'Enclosure segments × Role matrix · CC / SS / LP full view',
    pageDesc2: 'Compare enclosure efficiency by student tenure (M0~M12+)',
    tabAll: 'All Summary',
    tabCC: 'CC Frontend',
    tabSS: 'SS Backend',
    tabLP: 'LP Service',
    filterAll: 'All',
    colorHint: 'Color: ',
    colorGreen: 'Green ≥50%',
    colorOrange: 'Orange 30-50%',
    colorRed: 'Red <30%',
    colorSuffix: ' (Participation/Check-in/Outreach)',
    colEnclosure: 'Enclosure',
    colCC: 'CC',
    colSS: 'SS',
    colLP: 'LP',
    colName: 'Name',
    colGroup: 'Group',
    colStudents: 'Active Students',
    colStudentsTip: 'Paid students within validity period',
    colParticipation: 'Participation',
    colParticipationTip: 'Students with ≥1 referral / active students',
    colNewCoef: 'Referral Coef.',
    colNewCoefTip: 'Avg. referrals per participating student (>2 = good)',
    colCargoRatio: 'Cargo Ratio',
    colCargoRatioTip: 'Referral registrations / active students',
    colCheckin: 'Check-in',
    colCheckinTip: 'Students who shared & checked in / active students',
    colRegistrations: 'Registrations',
    colSSReach: 'SS Outreach',
    colSSReachTip: 'SS effective calls (≥120s) / active students',
    colLPReach: 'LP Outreach',
    colLPReachTip: 'LP effective calls (≥120s) / active students',
    colPayments: 'Payments',
    colRevenue: 'Revenue (USD)',
    colRank: 'Rank',
    colReach: 'Outreach',
    colReachTip: 'Effective calls (≥120s) / active students',
    cardCCMatrix: 'Enclosure × CC Matrix',
    cardFunnel: 'Enclosure Funnel (Registration→Payment)',
    cardCCRank: 'CC Ranking (by Participation)',
    cardSSRank: 'SS Ranking (by Registrations)',
    cardSSEncSum: 'SS Enclosure Distribution',
    cardLPRank: 'LP Ranking (by Registrations)',
    cardLPEncSum: 'LP Enclosure Distribution',
    emptyEnclosure: 'No enclosure data',
    emptyEnclosureDesc: 'Will refresh after data upload',
    emptyFunnel: 'No funnel comparison data',
    emptyFunnelDesc: 'Will generate after enclosure data upload',
    emptyRank: 'No ranking data',
    emptyRankDesc: 'Will refresh after data upload',
    emptySS: 'No SS data',
    emptySSDesc: 'Will generate after enclosure data upload',
    emptySSSum: 'No enclosure summary data',
    emptySSDesc2: 'Will refresh after data upload',
    emptyLP: 'No LP data',
    emptyLPDesc: 'Will generate after enclosure data upload',
    loadFailed: 'Data load failed',
    loadFailedDesc: 'Please check if backend service is running',
    insightTitle: '💡 Enclosure Efficiency Overview',
    insightHighest: 'Enclosure has highest participation (',
    insightLow: 'enclosures have participation below 10%, need attention',
    colEffStudents: 'Active Students',
    colRegCount: 'Registrations',
    colPaidCount: 'Payments',
    colRevUSD: 'Revenue (USD)',
    chartParticipation: 'Participation',
    chartConversion: 'Conversion',
    chartReach: 'Outreach',
  },
  th: {
    pageTitle: 'การวิเคราะห์ระยะเวลา',
    pageDesc: 'ระยะเวลา × เมทริกซ์บทบาท · CC / SS / LP ทุกมิติ',
    pageDesc2: 'เปรียบเทียบประสิทธิภาพตามระยะเวลาชำระเงิน (M0~M12+)',
    tabAll: 'สรุปทั้งหมด',
    tabCC: 'CC Frontend',
    tabSS: 'SS Backend',
    tabLP: 'LP Service',
    filterAll: 'ทั้งหมด',
    colorHint: 'สี: ',
    colorGreen: 'เขียว ≥50%',
    colorOrange: 'ส้ม 30-50%',
    colorRed: 'แดง <30%',
    colorSuffix: ' (การมีส่วนร่วม/เช็คอิน/การเข้าถึง)',
    colEnclosure: 'ระยะเวลา',
    colCC: 'CC',
    colSS: 'SS',
    colLP: 'LP',
    colName: 'ชื่อ',
    colGroup: 'กลุ่ม',
    colStudents: 'นักเรียนที่ใช้งาน',
    colStudentsTip: 'นักเรียนที่ชำระเงินและยังในระยะเวลา',
    colParticipation: 'การมีส่วนร่วม',
    colParticipationTip: 'นักเรียนที่แนะนำ ≥1 / นักเรียนที่ใช้งาน',
    colNewCoef: 'อัตราการแนะนำ',
    colNewCoefTip: 'จำนวนการแนะนำต่อผู้เข้าร่วม (>2 = ดี)',
    colCargoRatio: 'อัตราการเผยแพร่',
    colCargoRatioTip: 'การลงทะเบียนแนะนำ / นักเรียนที่ใช้งาน',
    colCheckin: 'เช็คอิน',
    colCheckinTip: 'นักเรียนที่แชร์และเช็คอิน / นักเรียนที่ใช้งาน',
    colRegistrations: 'การลงทะเบียน',
    colSSReach: 'SS การเข้าถึง',
    colSSReachTip: 'การโทรที่มีผล SS (≥120s) / นักเรียนที่ใช้งาน',
    colLPReach: 'LP การเข้าถึง',
    colLPReachTip: 'การโทรที่มีผล LP (≥120s) / นักเรียนที่ใช้งาน',
    colPayments: 'การชำระเงิน',
    colRevenue: 'รายได้ (USD)',
    colRank: 'อันดับ',
    colReach: 'การเข้าถึง',
    colReachTip: 'การโทรที่มีผล (≥120s) / นักเรียนที่ใช้งาน',
    cardCCMatrix: 'ระยะเวลา × เมทริกซ์ CC',
    cardFunnel: 'การเปรียบเทียบช่องทาง (ลงทะเบียน→ชำระเงิน)',
    cardCCRank: 'อันดับ CC (ตามการมีส่วนร่วม)',
    cardSSRank: 'อันดับ SS (ตามการลงทะเบียน)',
    cardSSEncSum: 'การกระจายระยะเวลา SS',
    cardLPRank: 'อันดับ LP (ตามการลงทะเบียน)',
    cardLPEncSum: 'การกระจายระยะเวลา LP',
    emptyEnclosure: 'ไม่มีข้อมูลระยะเวลา',
    emptyEnclosureDesc: 'จะรีเฟรชหลังอัปโหลดข้อมูล',
    emptyFunnel: 'ไม่มีข้อมูลการเปรียบเทียบ',
    emptyFunnelDesc: 'จะสร้างหลังอัปโหลดข้อมูลระยะเวลา',
    emptyRank: 'ไม่มีข้อมูลการจัดอันดับ',
    emptyRankDesc: 'จะรีเฟรชหลังอัปโหลดข้อมูล',
    emptySS: 'ไม่มีข้อมูล SS',
    emptySSDesc: 'จะสร้างหลังอัปโหลดข้อมูลระยะเวลา',
    emptySSSum: 'ไม่มีข้อมูลสรุประยะเวลา',
    emptySSDesc2: 'จะรีเฟรชหลังอัปโหลดข้อมูล',
    emptyLP: 'ไม่มีข้อมูล LP',
    emptyLPDesc: 'จะสร้างหลังอัปโหลดข้อมูลระยะเวลา',
    loadFailed: 'โหลดข้อมูลล้มเหลว',
    loadFailedDesc: 'กรุณาตรวจสอบว่าบริการ backend ทำงานอยู่',
    insightTitle: '💡 ภาพรวมประสิทธิภาพระยะเวลา',
    insightHighest: 'ระยะเวลามีการมีส่วนร่วมสูงสุด (',
    insightLow: 'ระยะเวลามีการมีส่วนร่วมต่ำกว่า 10% ต้องให้ความสนใจ',
    colEffStudents: 'นักเรียนที่ใช้งาน',
    colRegCount: 'การลงทะเบียน',
    colPaidCount: 'การชำระเงิน',
    colRevUSD: 'รายได้ (USD)',
    chartParticipation: 'การมีส่วนร่วม',
    chartConversion: 'อัตราแปลง',
    chartReach: 'การเข้าถึง',
  },
};
import { swrFetcher } from '@/lib/api';
import { formatRate, metricColor, fmtEnc } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { EnclosureCCMetrics } from '@/lib/types/enclosure';
import type { EnclosureBenchmarkRow } from '@/lib/types/cross-analysis';
import type { EnclosureSSMetrics, EnclosureLPMetrics } from '@/lib/types/enclosure-ss-lp';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';
import { SegmentedTabs } from '@/components/ui/PageTabs';
import { BrandDot } from '@/components/ui/BrandDot';

/* ── 常量 ──────────────────────────────────────────────────── */

type TabKey = 'all' | 'cc' | 'ss' | 'lp';

const ENCLOSURE_FILTER_VALUES = [
  '',
  '0M',
  '1M',
  '2M',
  '3M',
  '4M',
  '5M',
  '6M',
  '7M',
  '8M',
  '9M',
  '10M',
  '11M',
  '12M',
  '12M+',
];

const ENCLOSURE_FILTER_LABELS: Record<string, string> = {
  '': '',
  '0M': 'M0（0~30）',
  '1M': 'M1（31~60）',
  '2M': 'M2（61~90）',
  '3M': 'M3（91~120）',
  '4M': 'M4（121~150）',
  '5M': 'M5（151~180）',
  '6M': 'M6（181~210）',
  '7M': 'M7（211~240）',
  '8M': 'M8（241~270）',
  '9M': 'M9（271~300）',
  '10M': 'M10（301~330）',
  '11M': 'M11（331~360）',
  '12M': 'M12（361~390）',
  '12M+': 'M12+（391+）',
};

/* ── 工具函数 ───────────────────────────────────────────────── */

// metricColor 已移至 lib/utils.ts 共享

function safe(v: number | null | undefined, decimals = 0): string {
  if (v === null || v === undefined) return '—';
  return decimals > 0 ? v.toFixed(decimals) : v.toLocaleString();
}

function safeRate(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return formatRate(v);
}

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1
      ? 'bg-yellow-100 text-yellow-700'
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

/* ── Tab Bar ──────────────────────────────────────────────── */

function TabBar({
  active,
  onChange,
  t,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
  t: (typeof I18N)['zh'];
}) {
  const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: t.tabAll },
    { key: 'cc', label: t.tabCC },
    { key: 'ss', label: t.tabSS },
    { key: 'lp', label: t.tabLP },
  ];
  return <SegmentedTabs tabs={TABS} active={active} onChange={onChange} />;
}

/* ── CC Tab 内容 ──────────────────────────────────────────── */

interface EnclosureResponse {
  data: EnclosureCCMetrics[];
}

interface CCRankingItem {
  cc_name: string;
  cc_group: string;
  participation_rate: number;
  cargo_ratio: number;
  registrations: number;
  payments: number;
}

interface CCRankingResponse {
  rankings: CCRankingItem[];
}

function CCTabContent({
  filter,
  onFilterChange,
  t,
}: {
  filter: string;
  onFilterChange: (v: string) => void;
  t: (typeof I18N)['zh'];
}) {
  const apiUrl = filter
    ? `/api/enclosure?enclosure=${encodeURIComponent(filter)}`
    : '/api/enclosure';
  const {
    data: enclosureData,
    isLoading: e1,
    error: err1,
  } = useSWR<EnclosureResponse>(apiUrl, swrFetcher);
  const {
    data: rankingData,
    isLoading: e2,
    error: err2,
  } = useSWR<CCRankingResponse>('/api/enclosure/ranking', swrFetcher);
  const { data: benchmarkData } = useSWR<EnclosureBenchmarkRow[]>(
    '/api/enclosure-health/benchmark',
    swrFetcher
  );

  if (e1 || e2) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (err1 || err2) {
    return (
      <div className="p-8 text-center text-[var(--text-muted)]">
        <p>{t.loadFailed}</p>
        <p className="text-xs mt-1">{(err1 ?? err2)?.message ?? t.loadFailedDesc}</p>
      </div>
    );
  }

  const rows = Array.isArray(enclosureData) ? enclosureData : (enclosureData?.data ?? []);
  const rankings = Array.isArray(rankingData) ? rankingData : (rankingData?.rankings ?? []);

  return (
    <div className="space-y-5 md:space-y-6">
      {/* CC matrix table */}
      <Card title={t.cardCCMatrix}>
        {rows.length === 0 ? (
          <EmptyState title={t.emptyEnclosure} description={t.emptyEnclosureDesc} />
        ) : (
          <>
            <p className="text-[10px] text-[var(--text-muted)] mb-2">
              {t.colorHint}
              <span className="text-emerald-700 font-medium">{t.colorGreen}</span> ·{' '}
              <span className="text-amber-700 font-medium">{t.colorOrange}</span> ·{' '}
              <span className="text-red-600 font-medium">{t.colorRed}</span>
              {t.colorSuffix}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="slide-thead-row">
                    <th className="slide-th slide-th-left py-1.5 px-2">{t.colEnclosure}</th>
                    <th className="slide-th slide-th-left py-1.5 px-2">{t.colCC}</th>
                    <th className="slide-th slide-th-right py-1.5 px-2">
                      {t.colStudents} <BrandDot tooltip={t.colStudentsTip} />
                    </th>
                    <th className="slide-th slide-th-right py-1.5 px-2">
                      {t.colParticipation} <BrandDot tooltip={t.colParticipationTip} />
                    </th>
                    <th className="slide-th slide-th-right py-1.5 px-2">
                      {t.colNewCoef} <BrandDot tooltip={t.colNewCoefTip} />
                    </th>
                    <th className="slide-th slide-th-right py-1.5 px-2">
                      {t.colCargoRatio} <BrandDot tooltip={t.colCargoRatioTip} />
                    </th>
                    <th className="slide-th slide-th-right py-1.5 px-2">
                      {t.colCheckin} <BrandDot tooltip={t.colCheckinTip} />
                    </th>
                    <th className="slide-th slide-th-right py-1.5 px-2">{t.colRegistrations}</th>
                    <th className="slide-th slide-th-right py-1.5 px-2">
                      {t.colSSReach} <BrandDot tooltip={t.colSSReachTip} />
                    </th>
                    <th className="slide-th slide-th-right py-1.5 px-2">
                      {t.colLPReach} <BrandDot tooltip={t.colLPReachTip} />
                    </th>
                    <th className="slide-th slide-th-right py-1.5 px-2">付费数</th>
                    <th className="slide-th slide-th-right py-1.5 px-2">业绩(USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                      <td className="slide-td py-1 px-2 text-[var(--text-secondary)]">
                        {fmtEnc(r.enclosure)}
                      </td>
                      <td className="slide-td py-1 px-2 font-medium">{r.cc_name}</td>
                      <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                        {(r.students ?? 0).toLocaleString()}
                      </td>
                      <td
                        className={`slide-td py-1 px-2 text-right font-mono tabular-nums ${metricColor(r.participation_rate, [0.1, 0.2])}`}
                      >
                        {formatRate(r.participation_rate)}
                      </td>
                      <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                        {(r.new_coefficient ?? 0).toFixed(2)}
                      </td>
                      <td
                        className={`slide-td py-1 px-2 text-right font-mono tabular-nums ${metricColor(r.cargo_ratio, [0.05, 0.1])}`}
                      >
                        {formatRate(r.cargo_ratio)}
                      </td>
                      <td
                        className={`slide-td py-1 px-2 text-right font-mono tabular-nums ${metricColor(r.checkin_rate, [0.3, 0.5])}`}
                      >
                        {formatRate(r.checkin_rate)}
                      </td>
                      <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                        {(r.registrations ?? 0).toLocaleString()}
                      </td>
                      <td
                        className={`slide-td py-1 px-2 text-right font-mono tabular-nums ${metricColor(r.ss_reach_rate ?? 0, [0.3, 0.5])}`}
                      >
                        {formatRate(r.ss_reach_rate ?? 0)}
                      </td>
                      <td
                        className={`slide-td py-1 px-2 text-right font-mono tabular-nums ${metricColor(r.lp_reach_rate ?? 0, [0.3, 0.5])}`}
                      >
                        {formatRate(r.lp_reach_rate ?? 0)}
                      </td>
                      <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                        {(r.payments ?? 0).toLocaleString()}
                      </td>
                      <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                        ${(r.revenue_usd ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Enclosure funnel chart */}
      <Card title={t.cardFunnel}>
        {!benchmarkData || benchmarkData.length === 0 ? (
          <EmptyState title={t.emptyFunnel} description={t.emptyFunnelDesc} />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={benchmarkData.map((b) => ({
                name: b.segment,
                [t.chartParticipation]: Math.round(b.participation * 100),
                [t.chartConversion]: Math.round(b.conversion * 100),
                [t.chartReach]: Math.round(b.reach * 100),
              }))}
              margin={{ top: 8, right: 12, bottom: 20, left: 0 }}
              barCategoryGap="30%"
              barGap={3}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                unit="%"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(v: number) => [`${v}%`]}
                contentStyle={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey={t.chartParticipation} fill="var(--chart-2-hex)" radius={[2, 2, 0, 0]} />
              <Bar dataKey={t.chartConversion} fill="var(--chart-4-hex)" radius={[2, 2, 0, 0]} />
              <Bar dataKey={t.chartReach} fill="var(--chart-3-hex)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* CC ranking table */}
      <Card title={t.cardCCRank}>
        {rankings.length === 0 ? (
          <EmptyState title={t.emptyRank} description={t.emptyRankDesc} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-1.5 px-2">{t.colRank}</th>
                  <th className="slide-th slide-th-left py-1.5 px-2">{t.colCC}</th>
                  <th className="slide-th slide-th-left py-1.5 px-2">{t.colGroup}</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">{t.colParticipation}</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">{t.colCargoRatio}</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">{t.colRegistrations}</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">{t.colPayments}</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, i) => (
                  <tr
                    key={`${r.cc_name}-${i}`}
                    className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                  >
                    <td className="slide-td py-1 px-2">
                      <RankBadge rank={i + 1} />
                    </td>
                    <td className="slide-td py-1 px-2 font-medium">{r.cc_name}</td>
                    <td className="slide-td py-1 px-2 text-[var(--text-secondary)]">
                      {r.cc_group}
                    </td>
                    <td
                      className={`slide-td py-1 px-2 text-right font-mono tabular-nums ${metricColor(r.participation_rate, [0.1, 0.2])}`}
                    >
                      {formatRate(r.participation_rate)}
                    </td>
                    <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                      {formatRate(r.cargo_ratio)}
                    </td>
                    <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                      {(r.registrations ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                      {(r.payments ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── SS Tab 内容 ──────────────────────────────────────────── */

function SSTabContent({ filter, t }: { filter: string; t: (typeof I18N)['zh'] }) {
  const apiUrl = filter
    ? `/api/enclosure-ss?enclosure=${encodeURIComponent(filter)}`
    : '/api/enclosure-ss';
  const { data: ssData, isLoading, error } = useSWR<EnclosureSSMetrics[]>(apiUrl, swrFetcher);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) {
    return <EmptyState title={t.loadFailed} description={t.loadFailedDesc} />;
  }

  const rows = ssData ?? [];
  const sorted = [...rows]
    .filter((r) => r.ss_name)
    .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));

  const byEnclosure = rows.reduce<
    Record<string, { registrations: number; payments: number; students: number }>
  >((acc, r) => {
    const key = r.enclosure;
    if (!acc[key]) acc[key] = { registrations: 0, payments: 0, students: 0 };
    acc[key].registrations += r.registrations ?? 0;
    acc[key].payments += r.payments ?? 0;
    acc[key].students += r.students ?? 0;
    return acc;
  }, {});
  const enclosureSummary = Object.entries(byEnclosure).sort(
    (a, b) => b[1].registrations - a[1].registrations
  );

  return (
    <div className="space-y-5 md:space-y-6">
      <Card title={t.cardSSRank}>
        {sorted.length === 0 ? (
          <EmptyState title={t.emptySS} description={t.emptySSDesc} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">{t.colRank}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{t.colEnclosure}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{t.colName}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{t.colGroup}</th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {t.colStudents} <BrandDot tooltip={t.colStudentsTip} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {t.colParticipation} <BrandDot tooltip={t.colParticipationTip} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {t.colCheckin} <BrandDot tooltip={t.colCheckinTip} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {t.colReach} <BrandDot tooltip={t.colReachTip} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">{t.colRegistrations}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t.colPayments}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t.colRevenue}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr
                    key={`${r.ss_name}-${r.enclosure}-${i}`}
                    className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                  >
                    <td className="slide-td py-1.5 px-2">
                      <RankBadge rank={i + 1} />
                    </td>
                    <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                      {fmtEnc(r.enclosure)}
                    </td>
                    <td className="slide-td py-1.5 px-2 font-medium">{r.ss_name ?? '—'}</td>
                    <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                      {r.ss_group ?? '—'}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {safe(r.students)}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.participation_rate, [0.1, 0.2])}`}
                    >
                      {safeRate(r.participation_rate)}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.checkin_rate, [0.3, 0.5])}`}
                    >
                      {safeRate(r.checkin_rate)}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.ss_reach_rate, [0.3, 0.5])}`}
                    >
                      {safeRate(r.ss_reach_rate)}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {safe(r.registrations)}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {safe(r.payments)}
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

      <Card title={t.cardSSEncSum}>
        {enclosureSummary.length === 0 ? (
          <EmptyState title={t.emptySSSum} description={t.emptySSDesc2} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">{t.colEnclosure}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t.colStudents}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t.colRegistrations}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t.colPayments}</th>
                </tr>
              </thead>
              <tbody>
                {enclosureSummary.map(([enc, data], i) => (
                  <tr key={enc} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                      {fmtEnc(enc)}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(data.students ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(data.registrations ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(data.payments ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── LP Tab 内容 ──────────────────────────────────────────── */

function LPTabContent({ filter, t }: { filter: string; t: (typeof I18N)['zh'] }) {
  const apiUrl = filter
    ? `/api/enclosure-lp?enclosure=${encodeURIComponent(filter)}`
    : '/api/enclosure-lp';
  const { data: lpData, isLoading, error } = useSWR<EnclosureLPMetrics[]>(apiUrl, swrFetcher);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) {
    return <EmptyState title={t.loadFailed} description={t.loadFailedDesc} />;
  }

  const rows = lpData ?? [];
  const sorted = [...rows]
    .filter((r) => r.lp_name)
    .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));

  const byEnclosure = rows.reduce<
    Record<string, { registrations: number; payments: number; students: number }>
  >((acc, r) => {
    const key = r.enclosure;
    if (!acc[key]) acc[key] = { registrations: 0, payments: 0, students: 0 };
    acc[key].registrations += r.registrations ?? 0;
    acc[key].payments += r.payments ?? 0;
    acc[key].students += r.students ?? 0;
    return acc;
  }, {});
  const enclosureSummary = Object.entries(byEnclosure).sort(
    (a, b) => b[1].registrations - a[1].registrations
  );

  return (
    <div className="space-y-5 md:space-y-6">
      <Card title={t.cardLPRank}>
        {sorted.length === 0 ? (
          <EmptyState title={t.emptyLP} description={t.emptyLPDesc} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">{t.colRank}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{t.colEnclosure}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{t.colName}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{t.colGroup}</th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {t.colStudents} <BrandDot tooltip={t.colStudentsTip} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {t.colParticipation} <BrandDot tooltip={t.colParticipationTip} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {t.colCheckin} <BrandDot tooltip={t.colCheckinTip} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {t.colReach} <BrandDot tooltip={t.colReachTip} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">{t.colRegistrations}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t.colPayments}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t.colRevenue}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr
                    key={`${r.lp_name}-${r.enclosure}-${i}`}
                    className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                  >
                    <td className="slide-td py-1.5 px-2">
                      <RankBadge rank={i + 1} />
                    </td>
                    <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                      {fmtEnc(r.enclosure)}
                    </td>
                    <td className="slide-td py-1.5 px-2 font-medium">{r.lp_name ?? '—'}</td>
                    <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                      {r.lp_group ?? '—'}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {safe(r.students)}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.participation_rate, [0.1, 0.2])}`}
                    >
                      {safeRate(r.participation_rate)}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.checkin_rate, [0.3, 0.5])}`}
                    >
                      {safeRate(r.checkin_rate)}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.lp_reach_rate, [0.3, 0.5])}`}
                    >
                      {safeRate(r.lp_reach_rate)}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {safe(r.registrations)}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {safe(r.payments)}
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

      <Card title={t.cardLPEncSum}>
        {enclosureSummary.length === 0 ? (
          <EmptyState title={t.emptySSSum} description={t.emptySSDesc2} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">{t.colEnclosure}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t.colStudents}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t.colRegistrations}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t.colPayments}</th>
                </tr>
              </thead>
              <tbody>
                {enclosureSummary.map(([enc, data], i) => (
                  <tr key={enc} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                      {fmtEnc(enc)}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(data.students ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(data.registrations ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(data.payments ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── 全部汇总 Tab ─────────────────────────────────────────── */

function AllTabContent({ filter, t }: { filter: string; t: (typeof I18N)['zh'] }) {
  const ccUrl = filter
    ? `/api/enclosure?enclosure=${encodeURIComponent(filter)}`
    : '/api/enclosure';
  const ssUrl = filter
    ? `/api/enclosure-ss?enclosure=${encodeURIComponent(filter)}`
    : '/api/enclosure-ss';
  const lpUrl = filter
    ? `/api/enclosure-lp?enclosure=${encodeURIComponent(filter)}`
    : '/api/enclosure-lp';
  const { data: ccData } = useSWR<EnclosureResponse>(ccUrl, swrFetcher);
  const { data: ssData } = useSWR<EnclosureSSMetrics[]>(ssUrl, swrFetcher);
  const { data: lpData } = useSWR<EnclosureLPMetrics[]>(lpUrl, swrFetcher);

  const ccRows = Array.isArray(ccData) ? ccData : (ccData?.data ?? []);
  const ssRows = ssData ?? [];
  const lpRows = lpData ?? [];

  const ccTotal = { students: 0, registrations: 0, payments: 0, revenue: 0 };
  ccRows.forEach((r) => {
    ccTotal.students += r.students ?? 0;
    ccTotal.registrations += r.registrations ?? 0;
    ccTotal.payments += r.payments ?? 0;
    ccTotal.revenue += r.revenue_usd ?? 0;
  });

  const ssTotal = { students: 0, registrations: 0, payments: 0, revenue: 0 };
  ssRows.forEach((r) => {
    ssTotal.students += r.students ?? 0;
    ssTotal.registrations += r.registrations ?? 0;
    ssTotal.payments += r.payments ?? 0;
    ssTotal.revenue += r.revenue_usd ?? 0;
  });

  const lpTotal = { students: 0, registrations: 0, payments: 0, revenue: 0 };
  lpRows.forEach((r) => {
    lpTotal.students += r.students ?? 0;
    lpTotal.registrations += r.registrations ?? 0;
    lpTotal.payments += r.payments ?? 0;
    lpTotal.revenue += r.revenue_usd ?? 0;
  });

  const summaryItems = [
    { role: t.tabCC, color: 'border-action-accent', ...ccTotal },
    { role: t.tabSS, color: 'border-green-500', ...ssTotal },
    { role: t.tabLP, color: 'border-purple-500', ...lpTotal },
  ];

  // 围场效率 insight：按围场段汇总 CC 参与率，找最高/最低
  const enclosureParticipation = ccRows.reduce<Record<string, { rate: number; count: number }>>(
    (acc, r) => {
      if (!r.enclosure) return acc;
      if (!acc[r.enclosure]) acc[r.enclosure] = { rate: 0, count: 0 };
      acc[r.enclosure].rate += r.participation_rate ?? 0;
      acc[r.enclosure].count += 1;
      return acc;
    },
    {}
  );
  const enclosureAvgs = Object.entries(enclosureParticipation)
    .map(([seg, v]) => ({ seg, avg: v.count > 0 ? v.rate / v.count : 0 }))
    .sort((a, b) => b.avg - a.avg);
  const topEnclosure = enclosureAvgs[0];
  const lowEnclosures = enclosureAvgs.filter((e) => e.avg < 0.1 && e.avg > 0);

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Enclosure efficiency insight card */}
      {topEnclosure && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--border-default)] border-l-4 border-l-blue-400 bg-blue-50 px-4 py-3">
          <div className="text-sm font-semibold text-[var(--text-primary)]">{t.insightTitle}</div>
          <div className="text-xs text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">{topEnclosure.seg}</span>{' '}
            {t.insightHighest}
            <span className="font-semibold text-[var(--color-success)]">
              {Math.round(topEnclosure.avg * 100)}%
            </span>
            ）
            {lowEnclosures.length > 0 && (
              <>
                ，{lowEnclosures.map((e) => e.seg).join('、')} {t.insightLow}
              </>
            )}
            。
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {summaryItems.map((item) => (
          <div
            key={item.role}
            className={`bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] border-l-4 ${item.color} p-4 space-y-2`}
          >
            <div className="text-sm font-semibold text-[var(--text-primary)]">{item.role}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[var(--text-muted)]">{t.colEffStudents}</div>
                <div className="font-mono font-semibold text-[var(--text-primary)]">
                  {(item.students ?? 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-muted)]">{t.colRegCount}</div>
                <div className="font-mono font-semibold text-[var(--text-primary)]">
                  {(item.registrations ?? 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-muted)]">{t.colPaidCount}</div>
                <div className="font-mono font-semibold text-[var(--text-primary)]">
                  {(item.payments ?? 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-muted)]">{t.colRevUSD}</div>
                <div className="font-mono font-semibold text-[var(--text-primary)]">
                  ${(item.revenue ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 主页面内部（需要 useSearchParams） ───────────────────── */

function EnclosurePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') ?? 'cc') as TabKey;
  const [encFilter, setEncFilter] = useState('');
  const { exportCSV } = useExport();
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

  const { data: ccExportData } = useSWR<EnclosureResponse>('/api/enclosure', swrFetcher);
  const { data: ssExportData } = useSWR<EnclosureSSMetrics[]>('/api/enclosure-ss', swrFetcher);
  const { data: lpExportData } = useSWR<EnclosureLPMetrics[]>('/api/enclosure-lp', swrFetcher);

  function handleTabChange(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/enclosure?${params.toString()}`);
  }

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10);
    if (activeTab === 'cc' || activeTab === 'all') {
      const rows = Array.isArray(ccExportData) ? ccExportData : (ccExportData?.data ?? []);
      exportCSV(
        rows as unknown as Record<string, unknown>[],
        [
          { key: 'enclosure', label: t.colEnclosure },
          { key: 'cc_name', label: t.colCC },
          { key: 'students', label: t.colStudents },
          { key: 'participation_rate', label: t.colParticipation },
          { key: 'new_coefficient', label: t.colNewCoef },
          { key: 'cargo_ratio', label: t.colCargoRatio },
          { key: 'checkin_rate', label: t.colCheckin },
          { key: 'registrations', label: t.colRegistrations },
          { key: 'payments', label: t.colPayments },
          { key: 'revenue_usd', label: t.colRevenue },
        ],
        `enclosure_CC_${today}`
      );
    } else if (activeTab === 'ss') {
      const rows = ssExportData ?? [];
      exportCSV(
        rows as unknown as Record<string, unknown>[],
        [
          { key: 'enclosure', label: t.colEnclosure },
          { key: 'ss_name', label: t.colSS },
          { key: 'students', label: t.colStudents },
          { key: 'participation_rate', label: t.colParticipation },
          { key: 'checkin_rate', label: t.colCheckin },
          { key: 'registrations', label: t.colRegistrations },
          { key: 'payments', label: t.colPayments },
          { key: 'revenue_usd', label: t.colRevenue },
        ],
        `enclosure_SS_${today}`
      );
    } else {
      const rows = lpExportData ?? [];
      exportCSV(
        rows as unknown as Record<string, unknown>[],
        [
          { key: 'enclosure', label: t.colEnclosure },
          { key: 'lp_name', label: t.colLP },
          { key: 'students', label: t.colStudents },
          { key: 'participation_rate', label: t.colParticipation },
          { key: 'checkin_rate', label: t.colCheckin },
          { key: 'lp_reach_rate', label: t.colReach },
          { key: 'registrations', label: t.colRegistrations },
          { key: 'payments', label: t.colPayments },
          { key: 'revenue_usd', label: t.colRevenue },
        ],
        `enclosure_LP_${today}`
      );
    }
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="page-title">{t.pageTitle}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t.pageDesc}</p>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{t.pageDesc2}</p>
        </div>
        <ExportButton onExportCsv={handleExport} />
      </div>

      <TabBar active={activeTab} onChange={handleTabChange} t={t} />

      {/* Enclosure filter buttons */}
      <div className="flex flex-wrap gap-2">
        {ENCLOSURE_FILTER_VALUES.map((val) => (
          <button
            key={val}
            onClick={() => setEncFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              encFilter === val
                ? 'bg-action-accent text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--n-200)]'
            }`}
          >
            {val === '' ? t.filterAll : ENCLOSURE_FILTER_LABELS[val]}
          </button>
        ))}
      </div>

      {activeTab === 'all' && <AllTabContent filter={encFilter} t={t} />}
      {activeTab === 'cc' && (
        <CCTabContent filter={encFilter} onFilterChange={setEncFilter} t={t} />
      )}
      {activeTab === 'ss' && <SSTabContent filter={encFilter} t={t} />}
      {activeTab === 'lp' && <LPTabContent filter={encFilter} t={t} />}
    </div>
  );
}

/* ── 导出（Suspense 包裹 useSearchParams） ────────────────── */

export default function EnclosurePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      }
    >
      <EnclosurePageInner />
    </Suspense>
  );
}
