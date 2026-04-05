'use client';

import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
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

// ── I18N ──────────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    pageTitle: '学员360全景档案',
    pageSubtitle: '多维搜索学员 · 点击行查看全景档案（学习/推荐/CC/付费/日报）',
    listTitle: (total: number) => `学员列表 (共 ${total} 条)`,
    listTitleEmpty: '学员列表',
    loadError: '加载失败',
    loadErrorDesc: '请检查后端服务是否正常运行',
    emptyTitle: '暂无学员数据',
    emptyDesc: '上传数据文件后自动刷新，或调整搜索/筛选条件',
    exportCols: {
      stdt_id: '学员ID',
      name: '姓名',
      region: '地区',
      enclosure: '围场',
      lifecycle: '生命周期',
      cc_name: 'CC',
      paid_amount: '付费金额',
      total_new: '带新数',
      checkin_rate: '打卡率',
      is_high_potential: '高潜',
      last_contact_date: '末次联系',
    },
    exportFilename: '学员360',
  },
  'zh-TW': {
    pageTitle: '學員360全景檔案',
    pageSubtitle: '多維搜尋學員 · 點擊行查看全景檔案（學習/推薦/CC/付費/日報）',
    listTitle: (total: number) => `學員列表 (共 ${total} 條)`,
    listTitleEmpty: '學員列表',
    loadError: '載入失敗',
    loadErrorDesc: '請檢查後端服務是否正常運行',
    emptyTitle: '暫無學員資料',
    emptyDesc: '上傳資料文件後自動刷新，或調整搜尋/篩選條件',
    exportCols: {
      stdt_id: '學員ID',
      name: '姓名',
      region: '地區',
      enclosure: '圍場',
      lifecycle: '生命週期',
      cc_name: 'CC',
      paid_amount: '付費金額',
      total_new: '帶新數',
      checkin_rate: '打卡率',
      is_high_potential: '高潛',
      last_contact_date: '末次聯繫',
    },
    exportFilename: '學員360',
  },
  en: {
    pageTitle: 'Student 360 Profile',
    pageSubtitle:
      'Multi-dimensional student search · Click row to view full profile (Learning/Referral/CC/Payment/Daily)',
    listTitle: (total: number) => `Student List (${total} total)`,
    listTitleEmpty: 'Student List',
    loadError: 'Load failed',
    loadErrorDesc: 'Please check if the backend service is running',
    emptyTitle: 'No student data',
    emptyDesc: 'Will refresh automatically after uploading data, or adjust search/filter criteria',
    exportCols: {
      stdt_id: 'Student ID',
      name: 'Name',
      region: 'Region',
      enclosure: 'Enclosure',
      lifecycle: 'Lifecycle',
      cc_name: 'CC',
      paid_amount: 'Paid Amount',
      total_new: 'New Referrals',
      checkin_rate: 'Check-in Rate',
      is_high_potential: 'High Potential',
      last_contact_date: 'Last Contact',
    },
    exportFilename: 'Student360',
  },
  th: {
    pageTitle: 'โปรไฟล์นักเรียน 360 องศา',
    pageSubtitle: 'ค้นหานักเรียนหลายมิติ · คลิกแถวเพื่อดูโปรไฟล์เต็ม',
    listTitle: (total: number) => `รายชื่อนักเรียน (รวม ${total} รายการ)`,
    listTitleEmpty: 'รายชื่อนักเรียน',
    loadError: 'โหลดล้มเหลว',
    loadErrorDesc: 'กรุณาตรวจสอบว่าบริการแบ็กเอนด์ทำงานอยู่',
    emptyTitle: 'ไม่มีข้อมูลนักเรียน',
    emptyDesc: 'จะรีเฟรชอัตโนมัติหลังอัปโหลดข้อมูล หรือปรับเงื่อนไขการค้นหา',
    exportCols: {
      stdt_id: 'รหัสนักเรียน',
      name: 'ชื่อ',
      region: 'ภูมิภาค',
      enclosure: 'ระยะเวลา',
      lifecycle: 'วงจรชีวิต',
      cc_name: 'CC',
      paid_amount: 'ยอดชำระ',
      total_new: 'แนะนำใหม่',
      checkin_rate: 'อัตราเช็คอิน',
      is_high_potential: 'ศักยภาพสูง',
      last_contact_date: 'ติดต่อล่าสุด',
    },
    exportFilename: 'Student360',
  },
};

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
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

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
        { key: 'stdt_id', label: t.exportCols.stdt_id },
        { key: 'name', label: t.exportCols.name },
        { key: 'region', label: t.exportCols.region },
        { key: 'enclosure', label: t.exportCols.enclosure },
        { key: 'lifecycle', label: t.exportCols.lifecycle },
        { key: 'cc_name', label: t.exportCols.cc_name },
        { key: 'paid_amount', label: t.exportCols.paid_amount },
        { key: 'total_new', label: t.exportCols.total_new },
        { key: 'checkin_rate', label: t.exportCols.checkin_rate },
        { key: 'is_high_potential', label: t.exportCols.is_high_potential },
        { key: 'last_contact_date', label: t.exportCols.last_contact_date },
      ],
      `${t.exportFilename}_${today}`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="page-title">{t.pageTitle}</h1>
          <p className="text-sm text-secondary-token mt-1">{t.pageSubtitle}</p>
        </div>
        <ExportButton onExportCsv={handleExport} />
      </div>

      <StudentSearch filters={filters} onChange={handleFiltersChange} />

      <Card title={data ? t.listTitle(data.total) : t.listTitleEmpty}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState title={t.loadError} description={t.loadErrorDesc} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title={t.emptyTitle} description={t.emptyDesc} />
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
