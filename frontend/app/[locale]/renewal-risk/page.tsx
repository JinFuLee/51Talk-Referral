'use client';

import { useLocale, useTranslations } from 'next-intl';
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
  const t = useTranslations('renewalRisk');

  const { data, isLoading, error, mutate } = useFilteredSWR<RenewalRiskData>(
    '/api/analysis/renewal-risk'
  );

  function riskBadge(days?: number | null): { label: string; cls: string } {
    if (days == null) return { label: t('riskUnknown'), cls: 'bg-subtle text-secondary-token' };
    if (days > 90)
      return {
        label: t('riskHigh'),
        cls: 'bg-danger-surface text-danger-token',
      };
    if (days > 60) return { label: t('riskMidHigh'), cls: 'bg-orange-100 text-orange-700' };
    if (days > 30)
      return {
        label: t('riskWatch'),
        cls: 'bg-warning-surface text-warning-token',
      };
    return {
      label: t('riskNormal'),
      cls: 'bg-success-surface text-success-token',
    };
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
        title={t('errorTitle')}
        description={t('errorDesc')}
        action={{ label: t('errorRetry'), onClick: () => mutate() }}
      />
    );
  }

  const segments = data?.segments ?? [];
  const highRiskStudents = data?.high_risk_students ?? [];
  const totalCount = segments.reduce((s, seg) => s + (seg.count ?? 0), 0);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="text-sm text-secondary-token mt-1">{t('subtitle')}</p>
      </div>

      {segments.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {segments.map((seg) => {
              const color = segmentColor(seg.label);
              const pct = totalCount > 0 ? (seg.count ?? 0) / totalCount : 0;
              return (
                <Card key={seg.segment_id ?? seg.label} title="">
                  <div className="pt-1">
                    <p className="text-xs text-muted-token mb-1">
                      {seg.label}（{seg.days_range ?? seg.label} 天）
                    </p>
                    <p className="text-2xl font-bold" style={{ color }}>
                      {(seg.count ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-secondary-token mt-1">
                      {t('cardProportion')} {formatRate(pct)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card title={t('chartTitle')}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={segments} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [v.toLocaleString(), t('chartStudentCount')]}
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
                  name={t('chartStudentCount')}
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

      <Card title={`${t('highRiskTitle')} ${highRiskStudents.length} ${t('highRiskTitleSuffix')}`}>
        {highRiskStudents.length === 0 ? (
          <EmptyState title={t('emptyHighRiskTitle')} description={t('emptyHighRiskDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th text-left">{t('colStudentId')}</th>
                  <th className="slide-th text-right">{t('colDays')}</th>
                  <th className="slide-th text-center">{t('colRiskLevel')}</th>
                  <th className="slide-th text-left">{t('colEnclosure')}</th>
                  <th className="slide-th text-left">{t('colCcName')}</th>
                  <th className="slide-th text-right">
                    <span className="inline-flex items-center gap-1 group relative cursor-default">
                      {t('colLessonPkg')}
                      <span
                        className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity"
                        title={t('colLessonPkgTip')}
                      >
                        ⓘ
                      </span>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-subtle text-white text-[10px] rounded px-2 py-1 whitespace-nowrap pointer-events-none shadow-lg">
                        {t('colLessonPkgTip')}
                      </span>
                    </span>
                  </th>
                  <th className="slide-th text-right">
                    <span className="inline-flex items-center gap-1 group relative cursor-default">
                      {t('colRenewalOrders')}
                      <span
                        className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity"
                        title={t('colRenewalOrdersTip')}
                      >
                        ⓘ
                      </span>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-subtle text-white text-[10px] rounded px-2 py-1 whitespace-nowrap pointer-events-none shadow-lg">
                        {t('colRenewalOrdersTip')}
                      </span>
                    </span>
                  </th>
                  <th className="slide-th text-right">{t('colMonthlyReg')}</th>
                </tr>
              </thead>
              <tbody>
                {highRiskStudents.map((s, i) => {
                  const badge = riskBadge(s.days_since_last_renewal);
                  return (
                    <tr key={s.stdt_id ?? i} className="even:bg-subtle hover:bg-subtle">
                      <td className="slide-td font-mono text-xs">{s.stdt_id ?? '—'}</td>
                      <td className="slide-td text-right font-mono tabular-nums font-semibold text-danger-token">
                        {s.days_since_last_renewal ?? '—'}
                      </td>
                      <td className="slide-td text-center">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="slide-td text-secondary-token">{s.enclosure ?? '—'}</td>
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
