'use client';

import { useLocale } from 'next-intl';
import { useState } from 'react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';

const I18N = {
  zh: {
    pageTitle: '渠道分析',
    pageSubtitle: 'CC窄/SS窄/LP窄 + CC宽/LP宽/运营宽 · 业绩归因',
    pageDesc:
      'CC窄/SS窄/LP窄 = 学员直接绑定关系；宽口按围场-岗位配置拆分为 CC宽/LP宽/运营宽（Settings 可调）',
    loadFailed: '数据加载失败',
    loadFailedMsg: '请检查后端服务是否正常运行',
    tabPerf: '业绩贡献',
    tabNet: '净拆解',
    tabThree: '三因素对标',
    tabContributor: '渠道推荐者',
    channelSummaryTitle: '渠道业绩汇总',
    channelSummaryDesc:
      '各渠道业绩按带新参与数占比分摊。宽口按围场-岗位配置拆分为 CC宽/LP宽/运营宽（Settings 可调）。',
    emptyChannel: '暂无渠道数据',
    emptyChannelDesc: '上传数据后自动刷新',
    colChannel: '渠道',
    colRegPart: '注册 / 参与',
    colAppt: '预约',
    colAttend: '出席',
    colPay: '付费',
    colRevenue: '业绩',
    fullFunnelTip: 'CC窄 完整漏斗数据；SS/LP/宽口 无此指标',
    channelShareTitle: '渠道业绩占比',
    revLabel: '业绩',
    netTitle: '渠道净业绩拆解',
    emptyAttr: '暂无归因数据',
    emptyAttrDesc: '上传数据后自动刷新',
    colNetRev: '净业绩 (USD)',
    colShare: '占比',
    colPerCapita: '人均业绩',
    contributorTitle: 'TOP5 推荐者',
    emptyContributor: '暂无数据',
    emptyContributorDesc: '该渠道尚无带新付费记录',
    colRank: '#',
    colStudentId: '学员 ID',
    colEnclosure: '围场',
    colChannelPaid: '该渠道带新付费',
    colTotalNew: '总带新',
    threeTitle: '三因素对标：预约 × 出席 × 付费',
    emptyThree: '暂无三因素数据',
    emptyThreeDesc: '上传数据后自动刷新',
    colExpected: '预期量',
    colActual: '实际量',
    colGap: '差距',
    colApptFactor: '预约因子',
    colShowFactor: '出席因子',
    colPayFactor: '付费因子',
  },
  'zh-TW': {
    pageTitle: '渠道分析',
    pageSubtitle: 'CC窄/SS窄/LP窄 + CC寬/LP寬/運營寬 · 業績歸因',
    pageDesc:
      'CC窄/SS窄/LP窄 = 學員直接綁定關係；寬口按圍場-崗位配置拆分為 CC寬/LP寬/運營寬（Settings 可調）',
    loadFailed: '資料載入失敗',
    loadFailedMsg: '請檢查後端服務是否正常運行',
    tabPerf: '業績貢獻',
    tabNet: '淨拆解',
    tabThree: '三因素對標',
    tabContributor: '渠道推薦者',
    channelSummaryTitle: '渠道業績匯總',
    channelSummaryDesc:
      '各渠道業績按帶新參與數占比分攤。寬口按圍場-崗位配置拆分為 CC寬/LP寬/運營寬（Settings 可調）。',
    emptyChannel: '暫無渠道資料',
    emptyChannelDesc: '上傳資料後自動刷新',
    colChannel: '渠道',
    colRegPart: '註冊 / 參與',
    colAppt: '預約',
    colAttend: '出席',
    colPay: '付費',
    colRevenue: '業績',
    fullFunnelTip: 'CC窄 完整漏斗資料；SS/LP/寬口 無此指標',
    channelShareTitle: '渠道業績占比',
    revLabel: '業績',
    netTitle: '渠道淨業績拆解',
    emptyAttr: '暫無歸因資料',
    emptyAttrDesc: '上傳資料後自動刷新',
    colNetRev: '淨業績 (USD)',
    colShare: '占比',
    colPerCapita: '人均業績',
    contributorTitle: 'TOP5 推薦者',
    emptyContributor: '暫無資料',
    emptyContributorDesc: '該渠道尚無帶新付費記錄',
    colRank: '#',
    colStudentId: '學員 ID',
    colEnclosure: '圍場',
    colChannelPaid: '該渠道帶新付費',
    colTotalNew: '總帶新',
    threeTitle: '三因素對標：預約 × 出席 × 付費',
    emptyThree: '暫無三因素資料',
    emptyThreeDesc: '上傳資料後自動刷新',
    colExpected: '預期量',
    colActual: '實際量',
    colGap: '差距',
    colApptFactor: '預約因子',
    colShowFactor: '出席因子',
    colPayFactor: '付費因子',
  },
  en: {
    pageTitle: 'Channel Analysis',
    pageSubtitle: 'Narrow CC/SS/LP + Wide CC/LP/Ops · Revenue Attribution',
    pageDesc: 'Narrow = direct student binding; Wide = split by Enclosure-Role config in Settings',
    loadFailed: 'Load Failed',
    loadFailedMsg: 'Please check if the backend service is running',
    tabPerf: 'Performance',
    tabNet: 'Net Breakdown',
    tabThree: '3-Factor Benchmark',
    tabContributor: 'Channel Referrers',
    channelSummaryTitle: 'Channel Revenue Summary',
    channelSummaryDesc:
      'Revenue allocated proportionally by new-referral participation. Wide channel split by Enclosure-Role config in Settings.',
    emptyChannel: 'No Channel Data',
    emptyChannelDesc: 'Will refresh automatically after data upload',
    colChannel: 'Channel',
    colRegPart: 'Reg / Part',
    colAppt: 'Appt',
    colAttend: 'Attend',
    colPay: 'Pay',
    colRevenue: 'Revenue',
    fullFunnelTip: 'Full funnel data for CC Narrow; SS/LP/Wide have no this metric',
    channelShareTitle: 'Channel Revenue Share',
    revLabel: 'Revenue',
    netTitle: 'Net Channel Revenue Breakdown',
    emptyAttr: 'No Attribution Data',
    emptyAttrDesc: 'Will refresh automatically after data upload',
    colNetRev: 'Net Revenue (USD)',
    colShare: 'Share',
    colPerCapita: 'Per Capita',
    contributorTitle: 'TOP5 Referrers',
    emptyContributor: 'No Data',
    emptyContributorDesc: 'No paid-referral records for this channel',
    colRank: '#',
    colStudentId: 'Student ID',
    colEnclosure: 'Enclosure',
    colChannelPaid: 'Channel Paid Referrals',
    colTotalNew: 'Total New',
    threeTitle: '3-Factor Benchmark: Appt × Show × Pay',
    emptyThree: 'No 3-Factor Data',
    emptyThreeDesc: 'Will refresh automatically after data upload',
    colExpected: 'Expected',
    colActual: 'Actual',
    colGap: 'Gap',
    colApptFactor: 'Appt Factor',
    colShowFactor: 'Show Factor',
    colPayFactor: 'Pay Factor',
  },
  th: {
    pageTitle: 'การวิเคราะห์ช่องทาง',
    pageSubtitle: 'ช่องทางแคบ CC/SS/LP + ช่องทางกว้าง CC/LP/Ops · การระบุแหล่งที่มารายได้',
    pageDesc:
      'ช่องทางแคบ = การผูกนักเรียนโดยตรง; ช่องทางกว้าง = แบ่งตามการกำหนดค่า Enclosure-Role ใน Settings',
    loadFailed: 'โหลดข้อมูลล้มเหลว',
    loadFailedMsg: 'กรุณาตรวจสอบว่าบริการ backend ทำงานปกติ',
    tabPerf: 'ผลงาน',
    tabNet: 'การแจกแจงสุทธิ',
    tabThree: 'เกณฑ์มาตรฐาน 3 ปัจจัย',
    tabContributor: 'ผู้แนะนำช่องทาง',
    channelSummaryTitle: 'สรุปรายได้ตามช่องทาง',
    channelSummaryDesc:
      'รายได้แบ่งตามสัดส่วนการมีส่วนร่วมในการแนะนำใหม่ ช่องทางกว้างแบ่งตามการกำหนดค่า Enclosure-Role ใน Settings',
    emptyChannel: 'ไม่มีข้อมูลช่องทาง',
    emptyChannelDesc: 'จะรีเฟรชอัตโนมัติหลังอัปโหลดข้อมูล',
    colChannel: 'ช่องทาง',
    colRegPart: 'ลงทะเบียน / มีส่วนร่วม',
    colAppt: 'นัดหมาย',
    colAttend: 'เข้าร่วม',
    colPay: 'ชำระเงิน',
    colRevenue: 'รายได้',
    fullFunnelTip: 'ข้อมูล Funnel ครบสำหรับ CC Narrow; SS/LP/Wide ไม่มีตัวชี้วัดนี้',
    channelShareTitle: 'สัดส่วนรายได้ตามช่องทาง',
    revLabel: 'รายได้',
    netTitle: 'การแจกแจงรายได้สุทธิตามช่องทาง',
    emptyAttr: 'ไม่มีข้อมูลการระบุแหล่งที่มา',
    emptyAttrDesc: 'จะรีเฟรชอัตโนมัติหลังอัปโหลดข้อมูล',
    colNetRev: 'รายได้สุทธิ (USD)',
    colShare: 'สัดส่วน',
    colPerCapita: 'รายได้ต่อคน',
    contributorTitle: 'TOP5 ผู้แนะนำ',
    emptyContributor: 'ไม่มีข้อมูล',
    emptyContributorDesc: 'ไม่มีบันทึกการชำระเงินจากการแนะนำสำหรับช่องทางนี้',
    colRank: '#',
    colStudentId: 'ID นักเรียน',
    colEnclosure: 'ระยะเวลา',
    colChannelPaid: 'การชำระเงินจากการแนะนำในช่องทางนี้',
    colTotalNew: 'ยอดแนะนำทั้งหมด',
    threeTitle: 'เกณฑ์มาตรฐาน 3 ปัจจัย: นัดหมาย × เข้าร่วม × ชำระเงิน',
    emptyThree: 'ไม่มีข้อมูล 3 ปัจจัย',
    emptyThreeDesc: 'จะรีเฟรชอัตโนมัติหลังอัปโหลดข้อมูล',
    colExpected: 'คาดการณ์',
    colActual: 'จริง',
    colGap: 'ส่วนต่าง',
    colApptFactor: 'ปัจจัยนัดหมาย',
    colShowFactor: 'ปัจจัยเข้าร่วม',
    colPayFactor: 'ปัจจัยชำระเงิน',
  },
} as const;
import { formatRate } from '@/lib/utils';
import { useLabel, CHANNEL_LABELS } from '@/lib/label-maps';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type {
  ChannelMetrics,
  RevenueContribution,
  ThreeFactorComparison,
} from '@/lib/types/channel';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CHART_PALETTE } from '@/lib/chart-palette';

interface TopContributor {
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
}

interface ContributorResponse {
  total_contributors: number;
  top_contributors: TopContributor[];
  channel_summary: Record<string, { new_total: number; paid_total: number }>;
}

const CHANNEL_KEY_MAP: Record<string, { paid: keyof TopContributor; label: string }> = {
  CC窄: { paid: 'cc_paid_count', label: 'CC窄' },
  SS窄: { paid: 'ss_paid_count', label: 'SS窄' },
  LP窄: { paid: 'lp_paid_count', label: 'LP窄' },
  宽口: { paid: 'wide_paid_count', label: '宽口' },
};

const CHANNEL_COLORS = CHART_PALETTE.series;

// Render a cell: null → "—", number → formatted
function fmtNum(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString();
}

function fmtUsd(v: number | null | undefined): string {
  if (v == null) return '—';
  return `$${v.toLocaleString()}`;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return formatRate(v);
}

function fmtGap(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toLocaleString()}`;
}

// Tooltip for limited-scope columns
function HeaderWithTip({ children, tip }: { children: React.ReactNode; tip: string }) {
  return (
    <span className="inline-flex items-center gap-1 group relative cursor-default">
      {children}
      <span
        className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity"
        title={tip}
      >
        ⓘ
      </span>
      <span
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10
 bg-[var(--bg-subtle)] text-white text-[10px] rounded px-2 py-1 whitespace-nowrap pointer-events-none shadow-lg"
      >
        {tip}
      </span>
    </span>
  );
}

interface ChannelResponse {
  channels: ChannelMetrics[];
}
interface AttributionResponse {
  contributions: RevenueContribution[];
}
interface ThreeFactorResponse {
  comparisons: ThreeFactorComparison[];
}

export default function ChannelPage() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
    channel: true,
  });
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const label = useLabel();
  type Tab = 'perf' | 'net' | 'three' | 'contributor';
  const TABS: { key: Tab; label: string }[] = [
    { key: 'perf', label: t.tabPerf },
    { key: 'net', label: t.tabNet },
    { key: 'three', label: t.tabThree },
    { key: 'contributor', label: t.tabContributor },
  ];
  const [tab, setTab] = useState<Tab>('perf');
  const {
    data: channelData,
    isLoading: c1,
    error: cerr1,
  } = useFilteredSWR<ChannelResponse>('/api/channel');
  const {
    data: attrData,
    isLoading: c2,
    error: cerr2,
  } = useFilteredSWR<AttributionResponse>('/api/channel/attribution');
  const {
    data: threeData,
    isLoading: c3,
    error: cerr3,
  } = useFilteredSWR<ThreeFactorResponse>('/api/channel/three-factor');
  const {
    data: contributorData,
    isLoading: c4,
    error: cerr4,
  } = useFilteredSWR<ContributorResponse>('/api/analysis/referral-contributor?top=200');

  const isLoading = c1 || c2 || c3 || c4;
  const pageError = cerr1 || cerr2 || cerr3 || cerr4;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="p-8 text-center text-[var(--text-muted)]">
        <p>{t.loadFailed}</p>
        <p className="text-xs mt-1">{pageError.message ?? t.loadFailedMsg}</p>
      </div>
    );
  }

  const channels = Array.isArray(channelData) ? channelData : (channelData?.channels ?? []);
  const contributions = Array.isArray(attrData) ? attrData : (attrData?.contributions ?? []);
  const comparisons = Array.isArray(threeData) ? threeData : (threeData?.comparisons ?? []);
  const allContributors: TopContributor[] = contributorData?.top_contributors ?? [];

  const pieData = channels
    .filter((c) => c.revenue_usd != null && c.revenue_usd > 0)
    .map((c) => ({
      name: c.channel,
      value: c.revenue_usd as number,
    }));

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="mb-2">
        <h1 className="page-title">{t.pageTitle}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{t.pageSubtitle}</p>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">{t.pageDesc}</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-[var(--bg-subtle)] p-1 rounded-xl w-fit">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === tb.key
                ? 'bg-[var(--bg-surface)] shadow-sm text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'perf' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <Card title={t.channelSummaryTitle}>
            {channels.length === 0 ? (
              <EmptyState title={t.emptyChannel} description={t.emptyChannelDesc} />
            ) : (
              <>
                <p className="text-[11px] text-[var(--text-secondary)] mb-2">
                  {t.channelSummaryDesc}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="slide-thead-row text-xs">
                        <th className="py-1.5 px-2 border-0 text-left">{t.colChannel}</th>
                        <th className="py-1.5 px-2 border-0 text-right">{t.colRegPart}</th>
                        <th className="py-1.5 px-2 border-0 text-right">
                          <HeaderWithTip tip={t.fullFunnelTip}>{t.colAppt}</HeaderWithTip>
                        </th>
                        <th className="py-1.5 px-2 border-0 text-right">
                          <HeaderWithTip tip={t.fullFunnelTip}>{t.colAttend}</HeaderWithTip>
                        </th>
                        <th className="py-1.5 px-2 border-0 text-right">
                          <HeaderWithTip tip={t.fullFunnelTip}>{t.colPay}</HeaderWithTip>
                        </th>
                        <th className="py-1.5 px-2 border-0 text-right">
                          <HeaderWithTip tip={t.fullFunnelTip}>{t.colRevenue}</HeaderWithTip>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {channels.map((c) => (
                        <tr key={c.channel} className="even:bg-[var(--bg-subtle)]">
                          <td className="py-2 px-2 text-xs font-medium">
                            {label(CHANNEL_LABELS, c.channel)}
                          </td>
                          <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                            {fmtNum(c.registrations)}
                          </td>
                          <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {fmtNum(c.appointments)}
                          </td>
                          <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {fmtNum(c.attendance)}
                          </td>
                          <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {fmtNum(c.payments)}
                          </td>
                          <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {fmtUsd(c.revenue_usd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          <Card title={t.channelShareTitle}>
            {pieData.length === 0 ? (
              <EmptyState title={t.emptyChannel} description={t.emptyChannelDesc} />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${label(CHANNEL_LABELS, name as string)} ${formatRate(percent, 0)}`
                    }
                    labelLine={false}
                    animationDuration={600}
                    animationEasing="ease-out"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`$${v.toLocaleString()}`, t.revLabel]}
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md, 10px)',
                      boxShadow: 'var(--shadow-medium)',
                      fontSize: '12px',
                    }}
                    cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ paddingTop: 12 }}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}

      {tab === 'net' && (
        <Card title={t.netTitle}>
          {contributions.length === 0 ? (
            <EmptyState title={t.emptyAttr} description={t.emptyAttrDesc} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="slide-thead-row text-xs">
                    <th className="py-1.5 px-2 border-0 text-left">{t.colChannel}</th>
                    <th className="py-1.5 px-2 border-0 text-right">{t.colNetRev}</th>
                    <th className="py-1.5 px-2 border-0 text-right">{t.colShare}</th>
                    <th className="py-1.5 px-2 border-0 text-right">{t.colPerCapita}</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((c) => (
                    <tr key={c.channel} className="even:bg-[var(--bg-subtle)]">
                      <td className="py-2 px-2 text-xs font-medium">
                        {label(CHANNEL_LABELS, c.channel)}
                      </td>
                      <td className="py-2 px-2 text-xs text-right font-mono tabular-nums font-semibold">
                        {fmtUsd(c.revenue)}
                      </td>
                      <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                        {fmtPct(c.share)}
                      </td>
                      <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                        {fmtUsd(c.per_capita)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'contributor' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {Object.entries(CHANNEL_KEY_MAP).map(([channelLabel, { paid }]) => {
            const top5 = [...allContributors]
              .filter((c) => (c[paid] as number) > 0)
              .sort((a, b) => (b[paid] as number) - (a[paid] as number))
              .slice(0, 5);
            return (
              <Card
                key={channelLabel}
                title={`${label(CHANNEL_LABELS, channelLabel)} · ${t.contributorTitle}`}
              >
                {top5.length === 0 ? (
                  <EmptyState title={t.emptyContributor} description={t.emptyContributorDesc} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="slide-thead-row">
                          <th className="slide-th text-left">{t.colRank}</th>
                          <th className="slide-th text-left">{t.colStudentId}</th>
                          <th className="slide-th text-left">{t.colEnclosure}</th>
                          <th className="slide-th text-right">{t.colChannelPaid}</th>
                          <th className="slide-th text-right">{t.colTotalNew}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {top5.map((c, i) => (
                          <tr
                            key={c.stdt_id || i}
                            className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                          >
                            <td className="slide-td text-[var(--text-muted)] font-mono">{i + 1}</td>
                            <td className="slide-td font-mono text-xs">{c.stdt_id || '—'}</td>
                            <td className="slide-td text-[var(--text-secondary)]">
                              {c.enclosure || '—'}
                            </td>
                            <td className="slide-td text-right font-mono tabular-nums font-semibold text-action-accent">
                              {fmtNum(c[paid] as number)}
                            </td>
                            <td className="slide-td text-right font-mono tabular-nums text-[var(--text-secondary)]">
                              {fmtNum(c.total_new)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'three' && (
        <Card title={t.threeTitle}>
          {comparisons.length === 0 ? (
            <EmptyState title={t.emptyThree} description={t.emptyThreeDesc} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="slide-thead-row text-xs">
                    <th className="py-1.5 px-2 border-0 text-left">{t.colChannel}</th>
                    <th className="py-1.5 px-2 border-0 text-right">{t.colExpected}</th>
                    <th className="py-1.5 px-2 border-0 text-right">{t.colActual}</th>
                    <th className="py-1.5 px-2 border-0 text-right">{t.colGap}</th>
                    <th className="py-1.5 px-2 border-0 text-right">{t.colApptFactor}</th>
                    <th className="py-1.5 px-2 border-0 text-right">{t.colShowFactor}</th>
                    <th className="py-1.5 px-2 border-0 text-right">{t.colPayFactor}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((c) => {
                    const gap = c.gap;
                    return (
                      <tr key={c.channel} className="even:bg-[var(--bg-subtle)]">
                        <td className="py-2 px-2 text-xs font-medium">
                          {label(CHANNEL_LABELS, c.channel)}
                        </td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                          {fmtNum(c.expected_volume)}
                        </td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums font-semibold">
                          {fmtNum(c.actual_volume)}
                        </td>
                        <td
                          className={`py-2 px-2 text-xs text-right font-mono tabular-nums font-medium ${
                            gap == null
                              ? 'text-[var(--text-secondary)]'
                              : gap >= 0
                                ? 'text-[var(--color-success)]'
                                : 'text-[var(--color-danger)]'
                          }`}
                        >
                          {fmtGap(gap)}
                        </td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                          {fmtPct(c.appt_factor)}
                        </td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                          {fmtPct(c.show_factor)}
                        </td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                          {fmtPct(c.pay_factor)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
