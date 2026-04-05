'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { formatRate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { HealthScoreCards } from '@/components/enclosure-health/HealthScoreCards';
import { SegmentBenchmark } from '@/components/enclosure-health/SegmentBenchmark';
import { CCVarianceBox } from '@/components/enclosure-health/CCVarianceBox';
import type {
  EnclosureHealthScore,
  EnclosureBenchmarkRow,
  EnclosureVarianceRow,
} from '@/lib/types/cross-analysis';

export default function EnclosureHealthPage() {
  const locale = useLocale();
  const t = useTranslations('enclosureHealth');

  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
  });

  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);

  const {
    data: scoresData,
    isLoading: loadingScores,
    error: scoresError,
  } = useFilteredSWR<EnclosureHealthScore[]>('/api/enclosure-health/scores');

  const {
    data: benchmarkData,
    isLoading: loadingBenchmark,
    error: benchmarkError,
  } = useFilteredSWR<EnclosureBenchmarkRow[]>('/api/enclosure-health/benchmark');

  const {
    data: varianceData,
    isLoading: loadingVariance,
    error: varianceError,
  } = useFilteredSWR<EnclosureVarianceRow[]>('/api/enclosure-health/variance');

  const scores = Array.isArray(scoresData) ? scoresData : [];
  const benchmarks = Array.isArray(benchmarkData) ? benchmarkData : [];
  const variances = Array.isArray(varianceData) ? varianceData : [];

  const greenCount = scores.filter((s) => s.level === 'green').length;
  const yellowCount = scores.filter((s) => s.level === 'yellow').length;
  const redCount = scores.filter((s) => s.level === 'red').length;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="text-sm text-secondary-token mt-1">{t('subtitle')}</p>
      </div>

      {/* 顶部汇总 */}
      {scores.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="px-3 py-1.5 bg-success-surface border border-success-token rounded-lg text-xs flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success-token" />
            <span className="font-medium text-success-token">{t('badgeHealthy')}</span>
            <span className="font-bold text-success-token">{greenCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-warning-surface border border-warning-token rounded-lg text-xs flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-warning-token" />
            <span className="font-medium text-warning-token">{t('badgeWarning')}</span>
            <span className="font-bold text-warning-token">{yellowCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-danger-surface border border-danger-token rounded-lg text-xs flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-danger-token" />
            <span className="font-medium text-danger-token">{t('badgeDanger')}</span>
            <span className="font-bold text-danger-token">{redCount}</span>
          </div>
        </div>
      )}

      {/* 健康分卡片 */}
      <Card title={t('cardScores')}>
        {loadingScores ? (
          <div className="flex items-center justify-center h-32">
            <Spinner size="lg" />
          </div>
        ) : scoresError ? (
          <div className="text-center py-8">
            <p className="text-base font-semibold text-danger-token">{t('errorLoad')}</p>
            <p className="text-sm text-muted-token mt-1">{t('errorCheck')}</p>
          </div>
        ) : !scores.length ? (
          <EmptyState title={t('emptyScores')} description={t('emptyScoresDesc')} />
        ) : (
          <HealthScoreCards
            data={scores}
            onSegmentClick={(seg) => setExpandedSegment(expandedSegment === seg ? null : seg)}
          />
        )}
      </Card>

      {/* 展开的围场段 CC 列表 */}
      {expandedSegment && (
        <Card
          title={`${expandedSegment} — ${t('segmentCcList')}`}
          actions={
            <button
              className="text-xs text-muted-token hover:text-primary-token transition-colors"
              onClick={() => setExpandedSegment(null)}
            >
              {t('collapseBtn')}
            </button>
          }
        >
          {(() => {
            const seg = scores.find((s) => s.segment === expandedSegment);
            if (!seg) return <div className="text-sm text-muted-token">{t('noData')}</div>;
            return (
              <div className="text-sm text-secondary-token">
                <p>
                  {expandedSegment} {t('segmentHealthScore')}{' '}
                  <strong>{(seg.health_score ?? 0).toFixed(0)}</strong>
                </p>
                <p className="text-xs mt-1 text-muted-token">
                  {t('segmentParticipation')} {formatRate(seg.participation)} ·{' '}
                  {t('segmentConversion')} {formatRate(seg.conversion)} ·{t('segmentCheckin')}{' '}
                  {formatRate(seg.checkin)}
                </p>
                <p className="text-xs mt-2 text-muted-token">{t('segmentApiNote')}</p>
              </div>
            );
          })()}
        </Card>
      )}

      {/* 围场间对标柱图 */}
      <Card title={t('cardBenchmark')}>
        {loadingBenchmark ? (
          <div className="flex items-center justify-center h-48">
            <Spinner />
          </div>
        ) : benchmarkError ? (
          <div className="text-center py-8">
            <p className="text-base font-semibold text-danger-token">{t('errorLoad')}</p>
            <p className="text-sm text-muted-token mt-1">{t('errorCheck')}</p>
          </div>
        ) : !benchmarks.length ? (
          <EmptyState title={t('emptyBenchmark')} description={t('emptyBenchmarkDesc')} />
        ) : (
          <SegmentBenchmark data={benchmarks} />
        )}
      </Card>

      {/* CC 方差箱线图 */}
      <Card title={t('cardVariance')}>
        {loadingVariance ? (
          <div className="flex items-center justify-center h-32">
            <Spinner />
          </div>
        ) : varianceError ? (
          <div className="text-center py-8">
            <p className="text-base font-semibold text-danger-token">{t('errorLoad')}</p>
            <p className="text-sm text-muted-token mt-1">{t('errorCheck')}</p>
          </div>
        ) : !variances.length ? (
          <EmptyState title={t('emptyVariance')} description={t('emptyVarianceDesc')} />
        ) : (
          <CCVarianceBox data={variances} />
        )}
      </Card>
    </div>
  );
}
