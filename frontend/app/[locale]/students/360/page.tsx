'use client';

import { useTranslations } from 'next-intl';
import { useState, useCallback } from 'react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StudentSearch, type SearchFilters } from '@/components/student-360/StudentSearch';
import { StudentTable } from '@/components/student-360/StudentTable';
import { Profile360Drawer } from '@/components/student-360/Profile360Drawer';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';
import type { Student360SearchResponse } from '@/lib/types/cross-analysis';

// ── 常量 ──────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  segment: '',
  lifecycle: '',
  cc_name: '',
  is_hp: undefined,
};

// ── 主页面 ────────────────────────────────────────────────────────────────────

export default function Students360Page() {
  usePageDimensions({ country: true, enclosure: true, team: true });
  const t = useTranslations('studentsPage');

  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('paid_amount:desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { exportCSV } = useExport();

  const PAGE_SIZE = 20;

  const qs = new URLSearchParams();
  if (filters.query) qs.set('query', filters.query);
  if (filters.segment) qs.set('segment', filters.segment);
  if (filters.lifecycle) qs.set('lifecycle', filters.lifecycle);
  if (filters.cc_name) qs.set('cc_name', filters.cc_name);
  if (filters.is_hp !== undefined) qs.set('is_hp', String(filters.is_hp));
  if (sort) qs.set('sort', sort);
  qs.set('page', String(page));
  qs.set('page_size', String(PAGE_SIZE));

  const { data, isLoading, error } = useFilteredSWR<Student360SearchResponse>(
    `/api/students/360/search?${qs.toString()}`
  );

  const handleFiltersChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((newSort: string) => {
    setSort(newSort);
    setPage(1);
  }, []);

  function handleExport() {
    const items = data?.items ?? [];
    const today = new Date().toISOString().slice(0, 10);
    exportCSV(
      items as unknown as Record<string, unknown>[],
      [
        { key: 'stdt_id', label: t('exportCols.stdt_id') },
        { key: 'name', label: t('exportCols.name') },
        { key: 'region', label: t('exportCols.region') },
        { key: 'enclosure', label: t('exportCols.enclosure') },
        { key: 'lifecycle', label: t('exportCols.lifecycle') },
        { key: 'cc_name', label: t('exportCols.cc_name') },
        { key: 'paid_amount', label: t('exportCols.paid_amount') },
        { key: 'total_new', label: t('exportCols.total_new') },
        { key: 'checkin_rate', label: t('exportCols.checkin_rate') },
        { key: 'is_high_potential', label: t('exportCols.is_high_potential') },
        { key: 'last_contact_date', label: t('exportCols.last_contact_date') },
      ],
      `${t('exportFilename')}_${today}`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="page-title">{t('pageTitle')}</h1>
          <p className="text-sm text-secondary-token mt-1">{t('pageSubtitle')}</p>
        </div>
        <ExportButton onExportCsv={handleExport} />
      </div>

      <StudentSearch filters={filters} onChange={handleFiltersChange} />

      <Card title={data ? t('listTitle', { total: data.total }) : t('listTitleEmpty')}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState title={t('loadError')} description={t('loadErrorDesc')} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
        ) : (
          <StudentTable
            items={data.items}
            total={data.total}
            page={page}
            pageSize={PAGE_SIZE}
            sort={sort}
            onSortChange={handleSortChange}
            onPageChange={setPage}
            onRowClick={setSelectedId}
          />
        )}
      </Card>

      <Profile360Drawer stdtId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
