'use client';

import { useState, useMemo } from 'react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { ExportButton } from '@/components/ui/ExportButton';
import {
  HighPotentialFilters,
  type FilterState,
} from '@/components/high-potential/HighPotentialFilters';
import { HighPotentialTable } from '@/components/high-potential/HighPotentialTable';
import type { HighPotentialStudent } from '@/lib/types/member';
import type { WarroomStudent } from '@/lib/types/cross-analysis';
import { LayoutGrid, List, Star, Phone, Clock } from 'lucide-react';

const PAGE_SIZE = 20;

interface HighPotentialResponse {
  students: HighPotentialStudent[];
}

// ── 卡片视图子组件（保留备选）────────────────────────────────────────

function isValidValue(v: string | null | undefined): boolean {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s !== '' && s !== 'nan' && s !== 'none';
}

function urgencyBorderClass(level?: 'red' | 'yellow' | 'green'): string {
  if (level === 'red') return 'border-l-4 border-l-[var(--color-danger)]';
  if (level === 'yellow') return 'border-l-4 border-l-[var(--color-warning)]';
  if (level === 'green') return 'border-l-4 border-l-[var(--color-success)]';
  return 'border-l-4 border-l-transparent';
}

function urgencyBadgeClass(level?: 'red' | 'yellow' | 'green'): string {
  if (level === 'red') return 'bg-red-50 text-[var(--color-danger)]';
  if (level === 'yellow') return 'bg-amber-50 text-[var(--color-warning)]';
  if (level === 'green') return 'bg-emerald-50 text-[var(--color-success)]';
  return '';
}

function urgencyLabel(level?: 'red' | 'yellow' | 'green'): string {
  if (level === 'red') return '紧急';
  if (level === 'yellow') return '关注';
  if (level === 'green') return '稳定';
  return '';
}

function EnclosureBadge({ enclosure }: { enclosure: string }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-[var(--color-accent-surface)] text-[var(--color-accent)]">
      {enclosure}
    </span>
  );
}

function PaymentsBadge({ payments }: { payments: number }) {
  const hasPayment = payments > 0;
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
        hasPayment
          ? 'bg-emerald-50 text-[var(--color-success)]'
          : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
      }`}
    >
      付费 {payments}
    </span>
  );
}

function EngagementBadge({ deep }: { deep: boolean }) {
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
        deep
          ? 'bg-emerald-50 text-[var(--color-success)]'
          : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
      }`}
    >
      {deep ? '深度参与' : '浅度参与'}
    </span>
  );
}

function OwnerRow({ role, group, name }: { role: string; group: string; name: string }) {
  if (!isValidValue(name)) return null;
  const display = isValidValue(group) ? `${group} · ${name}` : name;
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-[var(--text-muted)] font-medium w-6 shrink-0">{role}</span>
      <span className="text-[var(--text-secondary)] truncate text-right">{display}</span>
    </div>
  );
}

function HighPotentialCard({
  student,
  warroom,
}: {
  student: HighPotentialStudent;
  warroom?: WarroomStudent;
}) {
  return (
    <div
      className={`card-base hover:shadow-[var(--shadow-medium)] transition-shadow duration-200 ${urgencyBorderClass(warroom?.urgency_level)}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Star className="w-3.5 h-3.5 text-[var(--color-warning)] shrink-0" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">#{student.id}</span>
          <EnclosureBadge enclosure={student.enclosure} />
          {warroom?.urgency_level && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${urgencyBadgeClass(warroom.urgency_level)}`}
            >
              {urgencyLabel(warroom.urgency_level)}
            </span>
          )}
        </div>
        <PaymentsBadge payments={student.payments} />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 rounded-lg bg-[var(--bg-subtle)] px-3 py-2.5">
        <div className="text-center">
          <div className="text-base font-bold text-[var(--text-primary)]">{student.total_new}</div>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">带新</p>
        </div>
        <div className="text-center border-x border-[var(--border-default)]">
          <div className="text-base font-bold text-[var(--text-primary)]">{student.attendance}</div>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">出席</p>
        </div>
        <div className="text-center">
          <div
            className={`text-base font-bold ${student.payments > 0 ? 'text-[var(--color-success)]' : 'text-[var(--text-primary)]'}`}
          >
            {student.payments}
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">付费</p>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        <OwnerRow role="CC" group={student.cc_group} name={student.cc_name} />
        <OwnerRow role="SS" group={student.ss_group} name={student.ss_name} />
        <OwnerRow role="LP" group={student.lp_group} name={student.lp_name} />
      </div>

      <div className="pt-2.5 border-t border-[var(--border-subtle)] space-y-1.5">
        {student.deep_engagement != null && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">参与深度</span>
            <EngagementBadge deep={!!student.deep_engagement} />
          </div>
        )}

        {student.days_since_last_cc_contact != null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">失联</span>
            <span
              className={`font-semibold ${
                student.days_since_last_cc_contact > 14
                  ? 'text-[var(--color-danger)]'
                  : student.days_since_last_cc_contact > 7
                    ? 'text-[var(--color-warning)]'
                    : 'text-[var(--color-success)]'
              }`}
            >
              {student.days_since_last_cc_contact} 天
            </span>
          </div>
        )}

        {warroom && (
          <div className="grid grid-cols-3 gap-1 pt-1.5 mt-1 border-t border-[var(--border-subtle)] text-center">
            <div>
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <Phone className="w-3 h-3 text-[var(--text-muted)]" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {warroom.checkin_7d}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">打卡</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {warroom.days_remaining}天
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">窗口</p>
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)] mb-0.5">
                {warroom.last_contact_date ?? '—'}
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">接通</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CSV 导出 ─────────────────────────────────────────────────────────

function exportCsv(students: HighPotentialStudent[], warroomMap: Map<string, WarroomStudent>) {
  const headers = [
    '学员ID',
    '围场',
    'CC姓名',
    'CC团队',
    'SS姓名',
    'SS团队',
    'LP姓名',
    'LP团队',
    '带新数',
    '出席数',
    '付费数',
    '参与深度',
    '失联天数',
    '打卡次数（7天）',
    '窗口期天数',
  ];
  const rows = students.map((s) => {
    const w = warroomMap.get(String(s.id));
    return [
      s.id,
      s.enclosure,
      s.cc_name,
      s.cc_group,
      s.ss_name,
      s.ss_group,
      s.lp_name,
      s.lp_group,
      s.total_new,
      s.attendance,
      s.payments,
      s.deep_engagement == null ? '' : s.deep_engagement ? '深度' : '浅度',
      s.days_since_last_cc_contact ?? '',
      w?.checkin_7d ?? '',
      w?.days_remaining ?? '',
    ]
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',');
  });
  const blob = new Blob(['\uFEFF' + [headers.join(','), ...rows].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `高潜学员_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── 主页面 ────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: FilterState = {
  search: '',
  enclosure: 'all',
  deepEngagement: 'all',
  hasPaid: 'all',
  ccGroup: 'all',
};

export default function HighPotentialPage() {
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useFilteredSWR<HighPotentialResponse>('/api/high-potential');
  const { data: warroomData } = useFilteredSWR<WarroomStudent[]>('/api/high-potential/warroom');

  const allStudents: HighPotentialStudent[] = useMemo(() => {
    return Array.isArray(data) ? data : (data?.students ?? []);
  }, [data]);

  const warroomMap = useMemo(() => {
    const list: WarroomStudent[] = Array.isArray(warroomData) ? warroomData : [];
    return new Map<string, WarroomStudent>(list.map((w) => [w.stdt_id, w]));
  }, [warroomData]);

  // 前端筛选
  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return allStudents.filter((s) => {
      if (q) {
        const idStr = String(s.id ?? '').toLowerCase();
        const ccStr = String(s.cc_name ?? '').toLowerCase();
        if (!idStr.includes(q) && !ccStr.includes(q)) return false;
      }
      if (filters.enclosure !== 'all' && s.enclosure !== filters.enclosure) return false;
      if (filters.deepEngagement !== 'all') {
        const isDeep = !!s.deep_engagement;
        if (filters.deepEngagement === 'deep' && !isDeep) return false;
        if (filters.deepEngagement === 'shallow' && isDeep) return false;
      }
      if (filters.hasPaid !== 'all') {
        const paid = (s.payments ?? 0) > 0;
        if (filters.hasPaid === 'yes' && !paid) return false;
        if (filters.hasPaid === 'no' && paid) return false;
      }
      if (filters.ccGroup !== 'all' && s.cc_group !== filters.ccGroup) return false;
      return true;
    });
  }, [allStudents, filters]);

  // 分页
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // 筛选变化时重置页码
  function handleFiltersChange(f: FilterState) {
    setFilters(f);
    setPage(1);
  }

  // ── 三态 ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="数据加载失败" description="无法获取高潜学员数据，请检查后端服务" />;
  }

  return (
    <div className="space-y-5">
      {/* ── 标题行 ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">高潜学员</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            带新数高 · 出席活跃 · 付费意向强 · 共 {allStudents.length} 人
          </p>
        </div>

        {/* 右侧操作 */}
        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-0.5 shadow-sm">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              表格
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'card'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              卡片
            </button>
          </div>

          {/* 导出 */}
          <ExportButton onExportCsv={() => exportCsv(filtered, warroomMap)} />
        </div>
      </div>

      {/* ── 筛选栏 ── */}
      <div className="card-compact">
        <HighPotentialFilters
          filters={filters}
          onChange={handleFiltersChange}
          students={allStudents}
          totalFiltered={filtered.length}
          totalAll={allStudents.length}
        />
      </div>

      {/* ── 内容区 ── */}
      {filtered.length === 0 ? (
        <EmptyState
          title={allStudents.length === 0 ? '暂无高潜学员数据' : '无匹配结果'}
          description={
            allStudents.length === 0 ? '上传数据文件后自动识别高潜学员' : '尝试调整筛选条件'
          }
        />
      ) : viewMode === 'table' ? (
        <>
          <HighPotentialTable students={pageSlice} warroomMap={warroomMap} />
          {totalPages > 1 && (
            <div className="flex justify-end">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filtered.length}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pageSlice.map((s) => (
              <HighPotentialCard key={s.id} student={s} warroom={warroomMap.get(String(s.id))} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-end">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filtered.length}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
