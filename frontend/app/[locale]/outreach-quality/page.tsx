'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { formatRate } from '@/lib/utils';
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

// ── I18N ──────────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    pageTitle: '接通质量',
    pageSubtitle: 'CC / SS / LP 各角色接通数 · 有效打卡 · 转介绍产出',
    ccConnected: 'CC 接通数',
    ssConnected: 'SS 接通数',
    lpConnected: 'LP 接通数',
    effectiveCheckin: '有效打卡',
    reachRate: '接通率',
    referralReg: '转介绍注册数',
    referralPay: '转介绍付费数',
    referralRevenue: '带新付费金额',
    chartTitle: '按围场接通质量',
    tableTitle: '分围场明细',
    colEnclosure: '围场',
    colStudents: '学员数',
    colCCConn: 'CC 接通',
    colCCRate: 'CC 接通率',
    colSSConn: 'SS 接通',
    colLPConn: 'LP 接通',
    colCheckin: '有效打卡',
    colReg: '转介绍注册',
    colPay: '转介绍付费',
    colRevenue: '带新金额 USD',
    unknown: '未知',
    emptyChart: '暂无分围场数据',
    emptyChartDesc: '上传数据后自动刷新',
    loadError: '数据加载失败',
    loadErrorDesc: '无法获取接通质量数据，请检查后端服务',
    retry: '重试',
    chartBarCC: 'CC接通',
    chartBarSS: 'SS接通',
    chartBarLP: 'LP接通',
    chartBarCheckin: '有效打卡',
  },
  'zh-TW': {
    pageTitle: '接通質量',
    pageSubtitle: 'CC / SS / LP 各角色接通數 · 有效打卡 · 轉介紹產出',
    ccConnected: 'CC 接通數',
    ssConnected: 'SS 接通數',
    lpConnected: 'LP 接通數',
    effectiveCheckin: '有效打卡',
    reachRate: '接通率',
    referralReg: '轉介紹註冊數',
    referralPay: '轉介紹付費數',
    referralRevenue: '帶新付費金額',
    chartTitle: '按圍場接通質量',
    tableTitle: '分圍場明細',
    colEnclosure: '圍場',
    colStudents: '學員數',
    colCCConn: 'CC 接通',
    colCCRate: 'CC 接通率',
    colSSConn: 'SS 接通',
    colLPConn: 'LP 接通',
    colCheckin: '有效打卡',
    colReg: '轉介紹註冊',
    colPay: '轉介紹付費',
    colRevenue: '帶新金額 USD',
    unknown: '未知',
    emptyChart: '暫無分圍場資料',
    emptyChartDesc: '上傳資料後自動刷新',
    loadError: '資料載入失敗',
    loadErrorDesc: '無法獲取接通質量資料，請檢查後端服務',
    retry: '重試',
    chartBarCC: 'CC接通',
    chartBarSS: 'SS接通',
    chartBarLP: 'LP接通',
    chartBarCheckin: '有效打卡',
  },
  en: {
    pageTitle: 'Outreach Quality',
    pageSubtitle: 'CC / SS / LP contact counts · Effective Check-ins · Referral output',
    ccConnected: 'CC Connected',
    ssConnected: 'SS Connected',
    lpConnected: 'LP Connected',
    effectiveCheckin: 'Effective Check-in',
    reachRate: 'Reach Rate',
    referralReg: 'Referral Registrations',
    referralPay: 'Referral Payments',
    referralRevenue: 'New Revenue',
    chartTitle: 'Outreach Quality by Enclosure',
    tableTitle: 'Enclosure Breakdown',
    colEnclosure: 'Enclosure',
    colStudents: 'Students',
    colCCConn: 'CC Connected',
    colCCRate: 'CC Reach Rate',
    colSSConn: 'SS Connected',
    colLPConn: 'LP Connected',
    colCheckin: 'Eff. Check-in',
    colReg: 'Referral Reg.',
    colPay: 'Referral Pay.',
    colRevenue: 'New Revenue USD',
    unknown: 'Unknown',
    emptyChart: 'No enclosure data',
    emptyChartDesc: 'Will refresh automatically after data upload',
    loadError: 'Failed to load data',
    loadErrorDesc: 'Unable to fetch outreach quality data, please check the backend service',
    retry: 'Retry',
    chartBarCC: 'CC Connected',
    chartBarSS: 'SS Connected',
    chartBarLP: 'LP Connected',
    chartBarCheckin: 'Eff. Check-in',
  },
  th: {
    pageTitle: 'คุณภาพการติดต่อ',
    pageSubtitle: 'จำนวนการติดต่อ CC / SS / LP · การเช็คอินที่มีประสิทธิภาพ · ผลการแนะนำ',
    ccConnected: 'CC ติดต่อได้',
    ssConnected: 'SS ติดต่อได้',
    lpConnected: 'LP ติดต่อได้',
    effectiveCheckin: 'เช็คอินที่มีผล',
    reachRate: 'อัตราการเข้าถึง',
    referralReg: 'ลงทะเบียนจากการแนะนำ',
    referralPay: 'ชำระจากการแนะนำ',
    referralRevenue: 'รายได้ใหม่',
    chartTitle: 'คุณภาพการติดต่อตามระยะเวลา',
    tableTitle: 'รายละเอียดตามระยะเวลา',
    colEnclosure: 'ระยะเวลา',
    colStudents: 'นักเรียน',
    colCCConn: 'CC ติดต่อ',
    colCCRate: 'อัตรา CC',
    colSSConn: 'SS ติดต่อ',
    colLPConn: 'LP ติดต่อ',
    colCheckin: 'เช็คอินที่มีผล',
    colReg: 'ลงทะเบียน',
    colPay: 'ชำระ',
    colRevenue: 'รายได้ใหม่ USD',
    unknown: 'ไม่ทราบ',
    emptyChart: 'ไม่มีข้อมูลระยะเวลา',
    emptyChartDesc: 'จะรีเฟรชอัตโนมัติหลังอัปโหลดข้อมูล',
    loadError: 'โหลดข้อมูลล้มเหลว',
    loadErrorDesc: 'ไม่สามารถดึงข้อมูลคุณภาพการติดต่อได้ กรุณาตรวจสอบบริการแบ็กเอนด์',
    retry: 'ลองใหม่',
    chartBarCC: 'CC ติดต่อ',
    chartBarSS: 'SS ติดต่อ',
    chartBarLP: 'LP ติดต่อ',
    chartBarCheckin: 'เช็คอินที่มีผล',
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface OutreachQualityRow {
  enclosure?: string | null;
  cc_group?: string | null;
  cc_connected?: number | null;
  ss_connected?: number | null;
  lp_connected?: number | null;
  effective_checkin?: number | null;
  referral_registrations?: number | null;
  referral_payments?: number | null;
  referral_revenue_usd?: number | null;
  students?: number | null;
}

interface OutreachQualitySummary {
  summary: OutreachQualityRow;
  by_enclosure: OutreachQualityRow[];
}

function safeRate(numerator?: number | null, denominator?: number | null): string {
  if (!numerator || !denominator || denominator === 0) return '—';
  return formatRate(numerator / denominator);
}

function safeNum(v?: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString();
}

// ── 主页面 ────────────────────────────────────────────────────────────────────

export default function OutreachQualityPage() {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
    granularity: true,
  });

  const { data, isLoading, error, mutate } = useFilteredSWR<OutreachQualitySummary>(
    '/api/analysis/outreach-quality'
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title={t.loadError}
        description={t.loadErrorDesc}
        action={{ label: t.retry, onClick: () => mutate() }}
      />
    );
  }

  const summary = data?.summary ?? {};
  const byEnclosure = data?.by_enclosure ?? [];

  const chartData = byEnclosure.map((row) => ({
    name: row.enclosure ?? t.unknown,
    [t.chartBarCC]: row.cc_connected ?? 0,
    [t.chartBarSS]: row.ss_connected ?? 0,
    [t.chartBarLP]: row.lp_connected ?? 0,
    [t.chartBarCheckin]: row.effective_checkin ?? 0,
  }));

  return (
    <div className="space-y-3">
      <div>
        <h1 className="page-title">{t.pageTitle}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{t.pageSubtitle}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t.ccConnected, value: summary.cc_connected, students: summary.students },
          { label: t.ssConnected, value: summary.ss_connected, students: summary.students },
          { label: t.lpConnected, value: summary.lp_connected, students: summary.students },
          {
            label: t.effectiveCheckin,
            value: summary.effective_checkin,
            students: summary.students,
          },
        ].map(({ label, value, students }) => (
          <Card key={label} title="">
            <div className="pt-1">
              <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{safeNum(value)}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {t.reachRate} {safeRate(value, students)}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card title="">
          <div className="pt-1">
            <p className="text-xs text-[var(--text-muted)] mb-1">{t.referralReg}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {safeNum(summary.referral_registrations)}
            </p>
          </div>
        </Card>
        <Card title="">
          <div className="pt-1">
            <p className="text-xs text-[var(--text-muted)] mb-1">{t.referralPay}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {safeNum(summary.referral_payments)}
            </p>
          </div>
        </Card>
        <Card title="">
          <div className="pt-1">
            <p className="text-xs text-[var(--text-muted)] mb-1">{t.referralRevenue}</p>
            <p className="text-2xl font-bold text-emerald-800">
              {summary.referral_revenue_usd != null
                ? `$${summary.referral_revenue_usd.toLocaleString()}`
                : '—'}
            </p>
          </div>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card title={t.chartTitle}>
          <ResponsiveContainer width="100%" height={260}>
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
                dataKey={t.chartBarCC}
                fill={CHART_PALETTE.c1}
                radius={[3, 3, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
              <Bar
                dataKey={t.chartBarSS}
                fill={CHART_PALETTE.c2}
                radius={[3, 3, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
              <Bar
                dataKey={t.chartBarLP}
                fill={CHART_PALETTE.c3}
                radius={[3, 3, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
              <Bar
                dataKey={t.chartBarCheckin}
                fill={CHART_PALETTE.c4}
                radius={[3, 3, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card title={t.tableTitle}>
        {byEnclosure.length === 0 ? (
          <EmptyState title={t.emptyChart} description={t.emptyChartDesc} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th text-left">{t.colEnclosure}</th>
                  <th className="slide-th text-right">{t.colStudents}</th>
                  <th className="slide-th text-right">{t.colCCConn}</th>
                  <th className="slide-th text-right">{t.colCCRate}</th>
                  <th className="slide-th text-right">{t.colSSConn}</th>
                  <th className="slide-th text-right">{t.colLPConn}</th>
                  <th className="slide-th text-right">{t.colCheckin}</th>
                  <th className="slide-th text-right">{t.colReg}</th>
                  <th className="slide-th text-right">{t.colPay}</th>
                  <th className="slide-th text-right">{t.colRevenue}</th>
                </tr>
              </thead>
              <tbody>
                {byEnclosure.map((row, i) => (
                  <tr key={i} className="even:bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)]">
                    <td className="slide-td font-medium">{row.enclosure ?? '—'}</td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {safeNum(row.students)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums font-semibold text-action-accent">
                      {safeNum(row.cc_connected)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {safeRate(row.cc_connected, row.students)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-purple-600">
                      {safeNum(row.ss_connected)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-amber-800">
                      {safeNum(row.lp_connected)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-emerald-800">
                      {safeNum(row.effective_checkin)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {safeNum(row.referral_registrations)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {safeNum(row.referral_payments)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-[var(--color-success)] font-medium">
                      {row.referral_revenue_usd != null
                        ? `$${row.referral_revenue_usd.toLocaleString()}`
                        : '—'}
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
