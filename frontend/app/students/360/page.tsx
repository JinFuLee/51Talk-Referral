'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StudentSearch, type SearchFilters } from '@/components/student-360/StudentSearch';
import { StudentTable } from '@/components/student-360/StudentTable';
import { Profile360Drawer } from '@/components/student-360/Profile360Drawer';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';
import type { Student360SearchResponse } from '@/lib/types/cross-analysis';

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  segment: '',
  lifecycle: '',
  cc_name: '',
  is_hp: undefined,
};

export default function Students360Page() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('paid_amount:desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { exportCSV } = useExport();

  const PAGE_SIZE = 20;

  // Build query string
  const qs = new URLSearchParams();
  if (filters.query) qs.set('query', filters.query);
  if (filters.segment) qs.set('segment', filters.segment);
  if (filters.lifecycle) qs.set('lifecycle', filters.lifecycle);
  if (filters.cc_name) qs.set('cc_name', filters.cc_name);
  if (filters.is_hp !== undefined) qs.set('is_hp', String(filters.is_hp));
  if (sort) qs.set('sort', sort);
  qs.set('page', String(page));
  qs.set('page_size', String(PAGE_SIZE));

  const { data, isLoading, error } = useSWR<Student360SearchResponse>(
    `/api/students/360/search?${qs.toString()}`,
    swrFetcher
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
        { key: 'stdt_id', label: '学员ID' },
        { key: 'name', label: '姓名' },
        { key: 'region', label: '地区' },
        { key: 'enclosure', label: '围场' },
        { key: 'lifecycle', label: '生命周期' },
        { key: 'cc_name', label: 'CC' },
        { key: 'paid_amount', label: '付费金额' },
        { key: 'total_new', label: '带新数' },
        { key: 'checkin_rate', label: '打卡率' },
        { key: 'is_high_potential', label: '高潜' },
        { key: 'last_contact_date', label: '末次联系' },
      ],
      `学员360_${today}`
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">学员360全景档案</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            多维搜索学员 · 点击行查看全景档案（学习/推荐/CC/付费/日报）
          </p>
        </div>
        <ExportButton onExportCsv={handleExport} />
      </div>

      {/* 搜索与筛选 */}
      <StudentSearch filters={filters} onChange={handleFiltersChange} />

      {/* 数据表格 */}
      <Card title={data ? `学员列表 (共 ${data.total} 条)` : '学员列表'}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState title="加载失败" description="请检查后端服务是否正常运行" />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="暂无学员数据"
            description="上传数据文件后自动刷新，或调整搜索/筛选条件"
          />
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

      {/* 360 档案抽屉 */}
      <Profile360Drawer stdtId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
