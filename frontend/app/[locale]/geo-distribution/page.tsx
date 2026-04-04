'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

interface GeoItem {
  country: string;
  student_count: number;
  pct: number;
  avg_referral_registrations: number | null;
  avg_payments: number | null;
}

function BarCell({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[var(--n-100)] rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full"
          style={{
            width: `${Math.min(pct, 100)}%`,
            backgroundColor: 'var(--n-600)',
          }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)] w-10 text-right shrink-0">
        {(pct ?? 0).toFixed(1)}%
      </span>
    </div>
  );
}

export default function GeoDistributionPage() {
  usePageDimensions({ country: true, dataRole: true });
  const locale = useLocale();
  const t = useTranslations('geoDistribution');

  const { data, isLoading, error, mutate } = useFilteredSWR<GeoItem[]>(
    '/api/analysis/geo-distribution'
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
        title={t('errorTitle')}
        description={t('errorDesc')}
        action={{ label: t('errorRetry'), onClick: () => mutate() }}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t('emptySubtitle')}</p>
        </div>
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      </div>
    );
  }

  const totalStudents = data.reduce((s, r) => s + r.student_count, 0);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {t('subtitle')} {totalStudents.toLocaleString()} {t('subtitleStudents')} {data.length}{' '}
          {t('subtitleRegions')}
        </p>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {data.slice(0, 4).map((item) => (
          <div
            key={item.country}
            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4"
          >
            <p className="text-xs text-[var(--text-muted)] mb-1">{item.country}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {(item.student_count ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {t('cardProportion')} {(item.pct ?? 0).toFixed(1)}%
            </p>
          </div>
        ))}
      </div>

      {/* 国家条形图 + 详细表格 */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row">
              <th className="slide-th text-left">{t('colCountry')}</th>
              <th className="slide-th text-right">{t('colStudents')}</th>
              <th className="slide-th" style={{ minWidth: '160px' }}>
                {t('colShare')}
              </th>
              <th className="slide-th text-right">{t('colAvgReg')}</th>
              <th className="slide-th text-right">{t('colAvgPay')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={item.country} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                <td className="slide-td font-medium text-[var(--text-primary)]">{item.country}</td>
                <td className="slide-td text-right font-mono tabular-nums">
                  {(item.student_count ?? 0).toLocaleString()}
                </td>
                <td className="slide-td" style={{ minWidth: '160px' }}>
                  <BarCell pct={item.pct} />
                </td>
                <td className="slide-td text-right font-mono tabular-nums">
                  {item.avg_referral_registrations != null ? (
                    (item.avg_referral_registrations ?? 0).toFixed(2)
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>
                <td className="slide-td text-right font-mono tabular-nums">
                  {item.avg_payments != null ? (
                    (item.avg_payments ?? 0).toFixed(2)
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 说明 */}
      <p className="text-xs text-[var(--text-muted)]">{t('footerNote')}</p>
    </div>
  );
}
