'use client';

import { useLocale } from 'next-intl';
import { useState } from 'react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';

const I18N = {
  zh: {
    pageTitle: '推荐者价值贡献',
    pageSubtitle: '高价值推荐者识别 · 四渠道贡献拆分 · 历史转码汇总',
    pageDesc: '窄口：CC/SS/LP 绑定 UserB 推荐 · 宽口：UserA 学员链接绑定 UserB 推荐',
    loadFailed: '数据加载失败',
    loadFailedDesc: '无法获取推荐者贡献数据，请检查后端服务是否正常运行',
    retry: '重试',
    emptyTitle: '暂无推荐者数据',
    emptyDesc: '当前数据源无推荐记录，上传含转介绍明细的数据文件后自动解析',
    totalContributors: '贡献者总数',
    totalPaid: '总带新付费',
    totalNew: '总带新注册',
    overallConv: '整体转化率',
    chartTitle: '四渠道带新 / 付费对比',
    rankTableTitle: 'TOP 推荐者排行（共',
    rankTableMid: '人，展示前',
    rankTableSuffix: '名）',
    colRank: '排名',
    colStudentId: '学员 ID',
    colEnclosure: '围场',
    colCCNew: 'CC带新',
    colSSNew: 'SS带新',
    colLPNew: 'LP带新',
    colWideNew: '宽口带新',
    colTotalNew: '总带新',
    colTotalPaid: '总付费',
    colConvRate: '转化率',
    colHistCoding: '历史转码',
    tableFooter:
      '点击列标题排序 · CC/SS/LP 为窄口渠道 · 宽口为学员自发传播 · 历史转码 = 累计带新付费总数',
    barNew: '带新',
    barPaid: '付费',
    exportStudentId: '学员ID',
    exportEnclosure: '围场',
    exportCCNew: 'CC带新',
    exportSSNew: 'SS带新',
    exportLPNew: 'LP带新',
    exportWideNew: '宽口带新',
    exportTotalNew: '总带新',
    exportCCPaid: 'CC付费',
    exportSSPaid: 'SS付费',
    exportLPPaid: 'LP付费',
    exportWidePaid: '宽口付费',
    exportTotalPaid: '总付费',
    exportConvRate: '转化率',
    exportHistCoding: '历史转码',
    chCCNarrow: 'CC 窄口',
    chSSNarrow: 'SS 窄口',
    chLPNarrow: 'LP 窄口',
    chWide: '宽口',
  },
  'zh-TW': {
    pageTitle: '推薦者價值貢獻',
    pageSubtitle: '高價值推薦者識別 · 四渠道貢獻拆分 · 歷史轉碼匯總',
    pageDesc: '窄口：CC/SS/LP 綁定 UserB 推薦 · 寬口：UserA 學員鏈接綁定 UserB 推薦',
    loadFailed: '資料載入失敗',
    loadFailedDesc: '無法取得推薦者貢獻資料，請檢查後端服務是否正常運行',
    retry: '重試',
    emptyTitle: '暫無推薦者資料',
    emptyDesc: '當前資料來源無推薦記錄，上傳含轉介紹明細的資料文件後自動解析',
    totalContributors: '貢獻者總數',
    totalPaid: '總帶新付費',
    totalNew: '總帶新註冊',
    overallConv: '整體轉化率',
    chartTitle: '四渠道帶新 / 付費對比',
    rankTableTitle: 'TOP 推薦者排行（共',
    rankTableMid: '人，展示前',
    rankTableSuffix: '名）',
    colRank: '排名',
    colStudentId: '學員 ID',
    colEnclosure: '圍場',
    colCCNew: 'CC帶新',
    colSSNew: 'SS帶新',
    colLPNew: 'LP帶新',
    colWideNew: '寬口帶新',
    colTotalNew: '總帶新',
    colTotalPaid: '總付費',
    colConvRate: '轉化率',
    colHistCoding: '歷史轉碼',
    tableFooter:
      '點擊列標題排序 · CC/SS/LP 為窄口渠道 · 寬口為學員自發傳播 · 歷史轉碼 = 累計帶新付費總數',
    barNew: '帶新',
    barPaid: '付費',
    exportStudentId: '學員ID',
    exportEnclosure: '圍場',
    exportCCNew: 'CC帶新',
    exportSSNew: 'SS帶新',
    exportLPNew: 'LP帶新',
    exportWideNew: '寬口帶新',
    exportTotalNew: '總帶新',
    exportCCPaid: 'CC付費',
    exportSSPaid: 'SS付費',
    exportLPPaid: 'LP付費',
    exportWidePaid: '寬口付費',
    exportTotalPaid: '總付費',
    exportConvRate: '轉化率',
    exportHistCoding: '歷史轉碼',
    chCCNarrow: 'CC 窄口',
    chSSNarrow: 'SS 窄口',
    chLPNarrow: 'LP 窄口',
    chWide: '寬口',
  },
  en: {
    pageTitle: 'Referrer Value Contribution',
    pageSubtitle: 'High-Value Referrer Identification · 4-Channel Breakdown · Historical Coding',
    pageDesc: 'Narrow: CC/SS/LP binds UserB referrals · Wide: UserA links bind UserB referrals',
    loadFailed: 'Load Failed',
    loadFailedDesc: 'Cannot load referrer contribution data, please check backend service',
    retry: 'Retry',
    emptyTitle: 'No Referrer Data',
    emptyDesc:
      'No referral records in current data source. Upload a file with referral details to parse automatically.',
    totalContributors: 'Total Contributors',
    totalPaid: 'Total Paid Referrals',
    totalNew: 'Total New Registrations',
    overallConv: 'Overall Conversion',
    chartTitle: '4-Channel New / Paid Comparison',
    rankTableTitle: 'TOP Referrer Ranking (total',
    rankTableMid: ', showing',
    rankTableSuffix: ')',
    colRank: 'Rank',
    colStudentId: 'Student ID',
    colEnclosure: 'Enclosure',
    colCCNew: 'CC New',
    colSSNew: 'SS New',
    colLPNew: 'LP New',
    colWideNew: 'Wide New',
    colTotalNew: 'Total New',
    colTotalPaid: 'Total Paid',
    colConvRate: 'Conv Rate',
    colHistCoding: 'Hist Coding',
    tableFooter:
      'Click column header to sort · CC/SS/LP = narrow channel · Wide = organic · Historical Coding = cumulative paid referrals',
    barNew: 'New',
    barPaid: 'Paid',
    exportStudentId: 'StudentID',
    exportEnclosure: 'Enclosure',
    exportCCNew: 'CC New',
    exportSSNew: 'SS New',
    exportLPNew: 'LP New',
    exportWideNew: 'Wide New',
    exportTotalNew: 'Total New',
    exportCCPaid: 'CC Paid',
    exportSSPaid: 'SS Paid',
    exportLPPaid: 'LP Paid',
    exportWidePaid: 'Wide Paid',
    exportTotalPaid: 'Total Paid',
    exportConvRate: 'Conv Rate',
    exportHistCoding: 'Hist Coding',
    chCCNarrow: 'CC Narrow',
    chSSNarrow: 'SS Narrow',
    chLPNarrow: 'LP Narrow',
    chWide: 'Wide',
  },
  th: {
    pageTitle: 'การมีส่วนร่วมของผู้แนะนำ',
    pageSubtitle: 'ระบุผู้แนะนำมูลค่าสูง · แบ่งตาม 4 ช่องทาง · ประวัติการแปลงรหัส',
    pageDesc: 'ช่องทางแคบ: CC/SS/LP ผูก UserB · ช่องทางกว้าง: UserA ผูก UserB',
    loadFailed: 'โหลดข้อมูลล้มเหลว',
    loadFailedDesc: 'ไม่สามารถโหลดข้อมูลผู้แนะนำ กรุณาตรวจสอบบริการ backend',
    retry: 'ลองใหม่',
    emptyTitle: 'ไม่มีข้อมูลผู้แนะนำ',
    emptyDesc:
      'ไม่มีบันทึกการแนะนำในแหล่งข้อมูลปัจจุบัน อัปโหลดไฟล์ที่มีรายละเอียดการแนะนำเพื่อแยกวิเคราะห์อัตโนมัติ',
    totalContributors: 'ผู้มีส่วนร่วมทั้งหมด',
    totalPaid: 'การชำระเงินจากการแนะนำทั้งหมด',
    totalNew: 'การลงทะเบียนใหม่ทั้งหมด',
    overallConv: 'อัตราแปลงรวม',
    chartTitle: 'การเปรียบเทียบใหม่ / ชำระเงินตาม 4 ช่องทาง',
    rankTableTitle: 'อันดับผู้แนะนำ TOP (ทั้งหมด',
    rankTableMid: ' คน แสดง',
    rankTableSuffix: ' อันดับ)',
    colRank: 'อันดับ',
    colStudentId: 'ID นักเรียน',
    colEnclosure: 'ระยะเวลา',
    colCCNew: 'CC ใหม่',
    colSSNew: 'SS ใหม่',
    colLPNew: 'LP ใหม่',
    colWideNew: 'กว้าง ใหม่',
    colTotalNew: 'ยอดใหม่รวม',
    colTotalPaid: 'ยอดชำระรวม',
    colConvRate: 'อัตราแปลง',
    colHistCoding: 'ประวัติการแปลงรหัส',
    tableFooter:
      'คลิกหัวคอลัมน์เพื่อเรียงลำดับ · CC/SS/LP = ช่องทางแคบ · กว้าง = อินทรีย์ · ประวัติการแปลงรหัส = การชำระเงินจากการแนะนำสะสม',
    barNew: 'ใหม่',
    barPaid: 'ชำระเงิน',
    exportStudentId: 'ID นักเรียน',
    exportEnclosure: 'ระยะเวลา',
    exportCCNew: 'CC ใหม่',
    exportSSNew: 'SS ใหม่',
    exportLPNew: 'LP ใหม่',
    exportWideNew: 'กว้าง ใหม่',
    exportTotalNew: 'ยอดใหม่รวม',
    exportCCPaid: 'CC ชำระ',
    exportSSPaid: 'SS ชำระ',
    exportLPPaid: 'LP ชำระ',
    exportWidePaid: 'กว้าง ชำระ',
    exportTotalPaid: 'ยอดชำระรวม',
    exportConvRate: 'อัตราแปลง',
    exportHistCoding: 'ประวัติการแปลงรหัส',
    chCCNarrow: 'CC แคบ',
    chSSNarrow: 'SS แคบ',
    chLPNarrow: 'LP แคบ',
    chWide: 'กว้าง',
  },
} as const;
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
import { CHART_PALETTE } from '@/lib/chart-palette';
import { formatRate, fmtEnc } from '@/lib/utils';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';

/* ── 类型定义 ─────────────────────────────────────────────── */

interface ContributorRow {
  stdt_id: string;
  enclosure: string;
  cc_new_count: number;
  ss_new_count: number;
  lp_new_count: number;
  wide_new_count: number;
  cc_paid_count: number;
  ss_paid_count: number;
  lp_paid_count: number;
  wide_paid_count: number;
  total_new: number;
  total_paid: number;
  conversion_rate: number;
  historical_coding_count: number;
}

interface ReferralContributorResponse {
  total_contributors: number;
  top_contributors: ContributorRow[];
}

/* ── 工具函数 ─────────────────────────────────────────────── */

type SortKey = keyof ContributorRow;

function fmt(v: number | null | undefined, decimals = 0): string {
  if (v == null) return '—';
  if (decimals > 0) return v.toFixed(decimals);
  return v.toLocaleString();
}

function pct(v: number | null | undefined): string {
  return formatRate(v);
}

/* ── 主页面 ─────────────────────────────────────────────── */

export default function ReferralContributorPage() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
    channel: true,
  });
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const { data, isLoading, error, mutate } = useFilteredSWR<ReferralContributorResponse>(
    '/api/analysis/referral-contributor'
  );

  const [sortKey, setSortKey] = useState<SortKey>('total_new');
  const [sortAsc, setSortAsc] = useState(false);
  const { exportCSV } = useExport();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title={t.loadFailed}
        description={t.loadFailedDesc}
        action={{ label: t.retry, onClick: () => mutate() }}
      />
    );
  }

  const contributors = data?.top_contributors ?? [];

  if (contributors.length === 0) {
    return <EmptyState title={t.emptyTitle} description={t.emptyDesc} />;
  }

  /* 汇总计算 */
  const totalNew = contributors.reduce((s, r) => s + r.total_new, 0);
  const totalPaid = contributors.reduce((s, r) => s + r.total_paid, 0);
  const ccNew = contributors.reduce((s, r) => s + r.cc_new_count, 0);
  const ssNew = contributors.reduce((s, r) => s + r.ss_new_count, 0);
  const lpNew = contributors.reduce((s, r) => s + r.lp_new_count, 0);
  const wideNew = contributors.reduce((s, r) => s + r.wide_new_count, 0);
  const ccPaid = contributors.reduce((s, r) => s + r.cc_paid_count, 0);
  const ssPaid = contributors.reduce((s, r) => s + r.ss_paid_count, 0);
  const lpPaid = contributors.reduce((s, r) => s + r.lp_paid_count, 0);
  const widePaid = contributors.reduce((s, r) => s + r.wide_paid_count, 0);

  /* 渠道条形图数据 */
  const channelChartData = [
    { channel: t.chCCNarrow, [t.barNew]: ccNew, [t.barPaid]: ccPaid },
    { channel: t.chSSNarrow, [t.barNew]: ssNew, [t.barPaid]: ssPaid },
    { channel: t.chLPNarrow, [t.barNew]: lpNew, [t.barPaid]: lpPaid },
    { channel: t.chWide, [t.barNew]: wideNew, [t.barPaid]: widePaid },
  ];

  /* 排序 */
  const sorted = [...contributors].sort((a, b) => {
    const av = a[sortKey] as number | string;
    const bv = b[sortKey] as number | string;
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <span className="text-[var(--text-muted)] ml-0.5">⇅</span>;
    return <span className="text-[var(--text-primary)] ml-0.5">{sortAsc ? '↑' : '↓'}</span>;
  }

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10);
    exportCSV(
      sorted as unknown as Record<string, unknown>[],
      [
        { key: 'stdt_id', label: t.exportStudentId },
        { key: 'enclosure', label: t.exportEnclosure },
        { key: 'cc_new_count', label: t.exportCCNew },
        { key: 'ss_new_count', label: t.exportSSNew },
        { key: 'lp_new_count', label: t.exportLPNew },
        { key: 'wide_new_count', label: t.exportWideNew },
        { key: 'total_new', label: t.exportTotalNew },
        { key: 'cc_paid_count', label: t.exportCCPaid },
        { key: 'ss_paid_count', label: t.exportSSPaid },
        { key: 'lp_paid_count', label: t.exportLPPaid },
        { key: 'wide_paid_count', label: t.exportWidePaid },
        { key: 'total_paid', label: t.exportTotalPaid },
        { key: 'conversion_rate', label: t.exportConvRate },
        { key: 'historical_coding_count', label: t.exportHistCoding },
      ],
      `转介绍贡献_${today}`
    );
  }

  return (
    <div className="space-y-3">
      {/* 页头 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">{t.pageTitle}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t.pageSubtitle}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.pageDesc}</p>
        </div>
        <ExportButton onExportCsv={handleExport} />
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card title="">
          <div className="text-center py-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">{t.totalContributors}</p>
            <p className="text-3xl font-bold text-[var(--text-primary)]">
              {(data?.total_contributors ?? contributors.length).toLocaleString()}
            </p>
          </div>
        </Card>
        <Card title="">
          <div className="text-center py-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">{t.totalPaid}</p>
            <p className="text-3xl font-bold text-[var(--color-success)]">
              {totalPaid.toLocaleString()}
            </p>
          </div>
        </Card>
        <Card title="">
          <div className="text-center py-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">{t.totalNew}</p>
            <p className="text-3xl font-bold text-action-accent">{totalNew.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {t.overallConv} {totalNew > 0 ? formatRate(totalPaid / totalNew) : '—'}
            </p>
          </div>
        </Card>
      </div>

      {/* 渠道汇总条形图 */}
      <Card title={t.chartTitle}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={channelChartData} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
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
              dataKey={t.barNew}
              fill="var(--chart-2-hex)"
              radius={[3, 3, 0, 0]}
              animationDuration={600}
              animationEasing="ease-out"
            />
            <Bar
              dataKey={t.barPaid}
              fill="var(--chart-4-hex)"
              radius={[3, 3, 0, 0]}
              animationDuration={600}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* TOP 推荐者排行表 */}
      <Card
        title={`${t.rankTableTitle} ${(data?.total_contributors ?? contributors.length).toLocaleString()} ${t.rankTableMid} ${sorted.length} ${t.rankTableSuffix}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th text-center w-10">{t.colRank}</th>
                <th className="slide-th text-left">{t.colStudentId}</th>
                <th
                  className="slide-th text-center cursor-pointer select-none"
                  onClick={() => handleSort('enclosure')}
                >
                  {t.colEnclosure}
                  {sortIcon('enclosure')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('cc_new_count')}
                >
                  {t.colCCNew}
                  {sortIcon('cc_new_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('ss_new_count')}
                >
                  {t.colSSNew}
                  {sortIcon('ss_new_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('lp_new_count')}
                >
                  {t.colLPNew}
                  {sortIcon('lp_new_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('wide_new_count')}
                >
                  {t.colWideNew}
                  {sortIcon('wide_new_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('total_new')}
                >
                  {t.colTotalNew}
                  {sortIcon('total_new')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('total_paid')}
                >
                  {t.colTotalPaid}
                  {sortIcon('total_paid')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('conversion_rate')}
                >
                  {t.colConvRate}
                  {sortIcon('conversion_rate')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('historical_coding_count')}
                >
                  {t.colHistCoding}
                  {sortIcon('historical_coding_count')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.stdt_id} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="slide-td text-center text-[var(--text-muted)] font-mono">
                    {i + 1}
                  </td>
                  <td className="slide-td font-mono text-xs text-[var(--text-secondary)]">
                    {r.stdt_id}
                  </td>
                  <td className="slide-td text-center">
                    <span className="text-xs bg-[var(--bg-subtle)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded">
                      {fmtEnc(r.enclosure)}
                    </span>
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    {r.cc_new_count > 0 ? (
                      <span className="text-action-accent font-semibold">{r.cc_new_count}</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    {r.ss_new_count > 0 ? (
                      <span className="text-[var(--color-accent)] font-semibold">
                        {r.ss_new_count}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    {r.lp_new_count > 0 ? (
                      <span className="text-orange-600 font-semibold">{r.lp_new_count}</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    {r.wide_new_count > 0 ? (
                      <span className="text-cyan-600 font-semibold">{r.wide_new_count}</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums font-bold text-[var(--text-primary)]">
                    {r.total_new}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums font-bold text-[var(--color-success)]">
                    {r.total_paid > 0 ? (
                      r.total_paid
                    ) : (
                      <span className="text-[var(--text-muted)] font-normal">0</span>
                    )}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    <span
                      className={
                        r.conversion_rate >= 0.3
                          ? 'text-[var(--color-success)] font-semibold'
                          : r.conversion_rate > 0
                            ? 'text-[var(--color-warning)]'
                            : 'text-[var(--text-muted)]'
                      }
                    >
                      {pct(r.conversion_rate)}
                    </span>
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {fmt(r.historical_coding_count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2 px-1">{t.tableFooter}</p>
      </Card>
    </div>
  );
}
