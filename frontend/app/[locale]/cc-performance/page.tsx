'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import type { CCPerformanceResponse } from '@/lib/types/cc-performance';
import { CCPerformanceSummaryCards } from '@/components/cc-performance/CCPerformanceSummaryCards';
import { CCPerformanceTable } from '@/components/cc-performance/CCPerformanceTable';
import type { ViewMode } from '@/components/cc-performance/CCPerformanceTable';
import { CCTargetUpload } from '@/components/cc-performance/CCTargetUpload';

export default function CCPerformancePage() {
  usePageDimensions({
    country: true,
    dataRole: 'cc',
    enclosure: false, // CC 负责全漏斗转化，业绩不按围场过滤
    team: true,
  });
  const locale = useLocale();
  const t = useTranslations('ccPerformance');
  const { data, isLoading, error, mutate } =
    useFilteredSWR<CCPerformanceResponse>('/api/cc-performance');

  // 达标 / BM 参照系，全局同步到卡片和表格
  const [viewMode, setViewMode] = useState<ViewMode>('target');

  return (
    <div className="space-y-6 px-6 py-6">
      {/* 页头 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t('subtitle')}</p>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{t('scope')}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-1">
          <CCTargetUpload
            month={data?.month || new Date().toISOString().slice(0, 7).replace('-', '')}
            onUploadSuccess={() => mutate()}
          />
        </div>
      </div>

      {/* L0：汇总 KPI 卡片（跟随 viewMode 切换） */}
      <CCPerformanceSummaryCards
        grandTotal={data?.grand_total ?? null}
        timeProgressPct={data?.time_progress_pct ?? 0}
        exchangeRate={data?.exchange_rate ?? 34}
        viewMode={viewMode}
      />

      {/* L1：个人业绩明细表（含 L2 展开详情，含 达标/BM 切换按钮） */}
      <CCPerformanceTable
        teams={data?.teams ?? []}
        exchangeRate={data?.exchange_rate ?? 34}
        isLoading={isLoading}
        error={error}
        onRetry={() => mutate()}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
    </div>
  );
}
