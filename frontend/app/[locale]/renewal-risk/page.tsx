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
  Cell,
  ResponsiveContainer,
} from 'recharts';

const I18N = {
  zh: {
    title: '续费风险',
    subtitle: '按未续费天数分布 · 高风险（90+ 天）学员列表',
    cardProportion: '占比',
    chartTitle: '未续费天数分布',
    chartStudentCount: '学员数',
    highRiskTitle: '高风险学员（90+ 天未续费）· 共',
    highRiskTitleSuffix: '人',
    colStudentId: '学员 ID',
    colDays: '未续费天数',
    colRiskLevel: '风险等级',
    colEnclosure: '围场',
    colCcName: '负责 CC',
    colLessonPkg: '总次卡数',
    colLessonPkgTip: '历史购买次卡总数，衡量学员历史购买规模',
    colRenewalOrders: '总续费订单',
    colRenewalOrdersTip: '1v1续费订单总数，高续费=高价值学员',
    colMonthlyReg: '本月推荐注册',
    riskUnknown: '未知',
    riskHigh: '高风险',
    riskMidHigh: '中高风险',
    riskWatch: '关注',
    riskNormal: '正常',
    errorTitle: '数据加载失败',
    errorDesc: '无法获取续费风险数据，请检查后端服务',
    errorRetry: '重试',
    emptyTitle: '暂无续费风险数据',
    emptyDesc: '上传数据文件后自动分析',
    emptyHighRiskTitle: '暂无高风险学员',
    emptyHighRiskDesc: '90 天以上未续费学员为空，数据良好',
  },
  'zh-TW': {
    title: '續費風險',
    subtitle: '按未續費天數分布 · 高風險（90+ 天）學員列表',
    cardProportion: '佔比',
    chartTitle: '未續費天數分布',
    chartStudentCount: '學員數',
    highRiskTitle: '高風險學員（90+ 天未續費）· 共',
    highRiskTitleSuffix: '人',
    colStudentId: '學員 ID',
    colDays: '未續費天數',
    colRiskLevel: '風險等級',
    colEnclosure: '圍場',
    colCcName: '負責 CC',
    colLessonPkg: '總次卡數',
    colLessonPkgTip: '歷史購買次卡總數，衡量學員歷史購買規模',
    colRenewalOrders: '總續費訂單',
    colRenewalOrdersTip: '1v1續費訂單總數，高續費=高價值學員',
    colMonthlyReg: '本月推薦註冊',
    riskUnknown: '未知',
    riskHigh: '高風險',
    riskMidHigh: '中高風險',
    riskWatch: '關注',
    riskNormal: '正常',
    errorTitle: '資料載入失敗',
    errorDesc: '無法取得續費風險資料，請檢查後端服務',
    errorRetry: '重試',
    emptyTitle: '暫無續費風險資料',
    emptyDesc: '上傳資料檔案後自動分析',
    emptyHighRiskTitle: '暫無高風險學員',
    emptyHighRiskDesc: '90 天以上未續費學員為空，資料良好',
  },
  en: {
    title: 'Renewal Risk',
    subtitle: 'Distribution by days since last renewal · High-risk (90+ days) student list',
    cardProportion: 'Share',
    chartTitle: 'Days Since Last Renewal Distribution',
    chartStudentCount: 'Students',
    highRiskTitle: 'High-Risk Students (90+ days no renewal) · Total',
    highRiskTitleSuffix: '',
    colStudentId: 'Student ID',
    colDays: 'Days Since Renewal',
    colRiskLevel: 'Risk Level',
    colEnclosure: 'Enclosure',
    colCcName: 'CC Owner',
    colLessonPkg: 'Total Packages',
    colLessonPkgTip: 'Total lesson packages purchased historically',
    colRenewalOrders: 'Total Renewals',
    colRenewalOrdersTip: 'Total 1v1 renewal orders, high renewals = high value',
    colMonthlyReg: 'Monthly Referral Reg.',
    riskUnknown: 'Unknown',
    riskHigh: 'High Risk',
    riskMidHigh: 'Mid-High Risk',
    riskWatch: 'Watch',
    riskNormal: 'Normal',
    errorTitle: 'Load Failed',
    errorDesc: 'Cannot load renewal risk data, please check backend service',
    errorRetry: 'Retry',
    emptyTitle: 'No Renewal Risk Data',
    emptyDesc: 'Upload data file to auto-analyze',
    emptyHighRiskTitle: 'No High-Risk Students',
    emptyHighRiskDesc: 'No students with 90+ days since renewal, data looks good',
  },
  th: {
    title: 'ความเสี่ยงการต่ออายุ',
    subtitle:
      'การกระจายตามจำนวนวันนับตั้งแต่ต่ออายุล่าสุด · รายชื่อนักเรียนความเสี่ยงสูง (90+ วัน)',
    cardProportion: 'สัดส่วน',
    chartTitle: 'การกระจายวันนับตั้งแต่ต่ออายุล่าสุด',
    chartStudentCount: 'นักเรียน',
    highRiskTitle: 'นักเรียนความเสี่ยงสูง (90+ วันไม่ต่ออายุ) · ทั้งหมด',
    highRiskTitleSuffix: 'คน',
    colStudentId: 'ID นักเรียน',
    colDays: 'วันนับตั้งแต่ต่ออายุ',
    colRiskLevel: 'ระดับความเสี่ยง',
    colEnclosure: 'ระยะเวลา',
    colCcName: 'CC ที่รับผิดชอบ',
    colLessonPkg: 'แพ็คเกจทั้งหมด',
    colLessonPkgTip: 'จำนวนแพ็คเกจทั้งหมดที่ซื้อในประวัติ',
    colRenewalOrders: 'การต่ออายุทั้งหมด',
    colRenewalOrdersTip: 'จำนวนการต่ออายุ 1v1 ทั้งหมด, ต่ออายุมาก = มูลค่าสูง',
    colMonthlyReg: 'การลงทะเบียนแนะนำรายเดือน',
    riskUnknown: 'ไม่ทราบ',
    riskHigh: 'ความเสี่ยงสูง',
    riskMidHigh: 'ความเสี่ยงปานกลาง-สูง',
    riskWatch: 'ติดตาม',
    riskNormal: 'ปกติ',
    errorTitle: 'โหลดข้อมูลล้มเหลว',
    errorDesc: 'ไม่สามารถโหลดข้อมูลความเสี่ยงการต่ออายุได้ กรุณาตรวจสอบบริการ backend',
    errorRetry: 'ลองใหม่',
    emptyTitle: 'ไม่มีข้อมูลความเสี่ยงการต่ออายุ',
    emptyDesc: 'อัปโหลดไฟล์ข้อมูลเพื่อวิเคราะห์อัตโนมัติ',
    emptyHighRiskTitle: 'ไม่มีนักเรียนความเสี่ยงสูง',
    emptyHighRiskDesc: 'ไม่มีนักเรียนที่ไม่ได้ต่ออายุ 90+ วัน ข้อมูลดูดี',
  },
};

export interface RenewalRiskSegment {
  segment_id: string;
  label: string;
  count: number;
  days_range: string;
}

export interface RenewalRiskStudent {
  stdt_id: string;
  days_since_last_renewal: number | null;
  enclosure: string | null;
  cc_name: string | null;
  days_to_expiry: number | null;
  monthly_referral_registrations: number | null;
  monthly_referral_payments: number | null;
  total_lesson_packages: number | null;
  total_renewal_orders: number | null;
}

export interface RenewalRiskData {
  segments: RenewalRiskSegment[];
  high_risk_students: RenewalRiskStudent[];
  total_students_with_data: number;
  high_risk_rate: number;
  renewal_col_used: string;
}

function segmentColor(label: string): string {
  if (
    label.includes('高风险') ||
    label.includes('90') ||
    label.includes('High') ||
    label.includes('สูง')
  )
    return 'var(--chart-5-hex)';
  if (
    label.includes('中高') ||
    label.includes('61') ||
    label.includes('Mid') ||
    label.includes('ปานกลาง')
  )
    return 'var(--chart-3-hex)';
  if (
    label.includes('关注') ||
    label.includes('31') ||
    label.includes('Watch') ||
    label.includes('ติดตาม')
  )
    return 'var(--chart-1-hex)';
  return 'var(--chart-4-hex)';
}

export default function RenewalRiskPage() {
  usePageDimensions({ country: true, enclosure: true, team: true });
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

  const { data, isLoading, error, mutate } = useFilteredSWR<RenewalRiskData>(
    '/api/analysis/renewal-risk'
  );

  function riskBadge(days?: number | null): { label: string; cls: string } {
    if (days == null)
      return { label: t.riskUnknown, cls: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]' };
    if (days > 90) return { label: t.riskHigh, cls: 'bg-red-100 text-red-700' };
    if (days > 60) return { label: t.riskMidHigh, cls: 'bg-orange-100 text-orange-700' };
    if (days > 30) return { label: t.riskWatch, cls: 'bg-yellow-100 text-yellow-700' };
    return { label: t.riskNormal, cls: 'bg-green-100 text-green-700' };
  }

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
        title={t.errorTitle}
        description={t.errorDesc}
        action={{ label: t.errorRetry, onClick: () => mutate() }}
      />
    );
  }

  const segments = data?.segments ?? [];
  const highRiskStudents = data?.high_risk_students ?? [];
  const totalCount = segments.reduce((s, seg) => s + (seg.count ?? 0), 0);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="page-title">{t.title}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{t.subtitle}</p>
      </div>

      {segments.length === 0 ? (
        <EmptyState title={t.emptyTitle} description={t.emptyDesc} />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {segments.map((seg) => {
              const color = segmentColor(seg.label);
              const pct = totalCount > 0 ? (seg.count ?? 0) / totalCount : 0;
              return (
                <Card key={seg.segment_id ?? seg.label} title="">
                  <div className="pt-1">
                    <p className="text-xs text-[var(--text-muted)] mb-1">
                      {seg.label}（{seg.days_range ?? seg.label} 天）
                    </p>
                    <p className="text-2xl font-bold" style={{ color }}>
                      {(seg.count ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {t.cardProportion} {formatRate(pct)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card title={t.chartTitle}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={segments} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [v.toLocaleString(), t.chartStudentCount]}
                  contentStyle={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md, 10px)',
                    boxShadow: 'var(--shadow-medium)',
                    fontSize: '12px',
                  }}
                  cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
                />
                <Bar
                  dataKey="count"
                  name={t.chartStudentCount}
                  radius={[4, 4, 0, 0]}
                  animationDuration={600}
                  animationEasing="ease-out"
                >
                  {segments.map((entry, i) => (
                    <Cell key={i} fill={segmentColor(entry.label)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      <Card title={`${t.highRiskTitle} ${highRiskStudents.length} ${t.highRiskTitleSuffix}`}>
        {highRiskStudents.length === 0 ? (
          <EmptyState title={t.emptyHighRiskTitle} description={t.emptyHighRiskDesc} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th text-left">{t.colStudentId}</th>
                  <th className="slide-th text-right">{t.colDays}</th>
                  <th className="slide-th text-center">{t.colRiskLevel}</th>
                  <th className="slide-th text-left">{t.colEnclosure}</th>
                  <th className="slide-th text-left">{t.colCcName}</th>
                  <th className="slide-th text-right">
                    <span className="inline-flex items-center gap-1 group relative cursor-default">
                      {t.colLessonPkg}
                      <span
                        className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity"
                        title={t.colLessonPkgTip}
                      >
                        ⓘ
                      </span>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap pointer-events-none shadow-lg">
                        {t.colLessonPkgTip}
                      </span>
                    </span>
                  </th>
                  <th className="slide-th text-right">
                    <span className="inline-flex items-center gap-1 group relative cursor-default">
                      {t.colRenewalOrders}
                      <span
                        className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity"
                        title={t.colRenewalOrdersTip}
                      >
                        ⓘ
                      </span>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap pointer-events-none shadow-lg">
                        {t.colRenewalOrdersTip}
                      </span>
                    </span>
                  </th>
                  <th className="slide-th text-right">{t.colMonthlyReg}</th>
                </tr>
              </thead>
              <tbody>
                {highRiskStudents.map((s, i) => {
                  const badge = riskBadge(s.days_since_last_renewal);
                  return (
                    <tr
                      key={s.stdt_id ?? i}
                      className="even:bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)]"
                    >
                      <td className="slide-td font-mono text-xs">{s.stdt_id ?? '—'}</td>
                      <td className="slide-td text-right font-mono tabular-nums font-semibold text-red-600">
                        {s.days_since_last_renewal ?? '—'}
                      </td>
                      <td className="slide-td text-center">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="slide-td text-[var(--text-secondary)]">
                        {s.enclosure ?? '—'}
                      </td>
                      <td className="slide-td">{s.cc_name ?? '—'}</td>
                      <td className="slide-td text-right font-mono tabular-nums">
                        {s.total_lesson_packages != null
                          ? s.total_lesson_packages.toLocaleString()
                          : '—'}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums">
                        {s.total_renewal_orders != null
                          ? s.total_renewal_orders.toLocaleString()
                          : '—'}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums">
                        {s.monthly_referral_registrations ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
