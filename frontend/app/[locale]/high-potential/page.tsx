'use client';

import { useState, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
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

const I18N = {
  zh: {
    title: '高潜学员',
    subtitle: '带新数高 · 出席活跃 · 付费意向强 · 共',
    subtitlePeople: '人',
    urgencyLabel: '紧急状态：',
    urgencyRed: '紧急',
    urgencyYellow: '关注',
    urgencyGreen: '稳定',
    urgencyRedDesc: '= 窗口期<7天或>14天未联系；',
    urgencyYellowDesc: '= 7-14天未联系；',
    urgencyGreenDesc: '= 近期有联系',
    viewTable: '表格',
    viewCard: '卡片',
    paid: '付费',
    deepEngagement: '深度参与',
    shallowEngagement: '浅度参与',
    engagementDepth: '参与深度',
    lostContact: '失联',
    days: '天',
    checkin: '打卡',
    window: '窗口',
    connected: '接通',
    new: '带新',
    attendance: '出席',
    errorTitle: '数据加载失败',
    errorDesc: '无法获取高潜学员数据，请检查后端服务',
    emptyNoData: '暂无高潜学员数据',
    emptyNoDataDesc: '上传数据文件后自动识别高潜学员',
    emptyNoMatch: '无匹配结果',
    emptyNoMatchDesc: '尝试调整筛选条件',
    csvHeaders: [
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
    ],
    csvDeep: '深度',
    csvShallow: '浅度',
    csvFilename: '高潜学员',
  },
  'zh-TW': {
    title: '高潛學員',
    subtitle: '帶新數高 · 出席活躍 · 付費意向強 · 共',
    subtitlePeople: '人',
    urgencyLabel: '緊急狀態：',
    urgencyRed: '緊急',
    urgencyYellow: '關注',
    urgencyGreen: '穩定',
    urgencyRedDesc: '= 窗口期<7天或>14天未聯繫；',
    urgencyYellowDesc: '= 7-14天未聯繫；',
    urgencyGreenDesc: '= 近期有聯繫',
    viewTable: '表格',
    viewCard: '卡片',
    paid: '付費',
    deepEngagement: '深度參與',
    shallowEngagement: '淺度參與',
    engagementDepth: '參與深度',
    lostContact: '失聯',
    days: '天',
    checkin: '打卡',
    window: '窗口',
    connected: '接通',
    new: '帶新',
    attendance: '出席',
    errorTitle: '資料載入失敗',
    errorDesc: '無法取得高潛學員資料，請檢查後端服務',
    emptyNoData: '暫無高潛學員資料',
    emptyNoDataDesc: '上傳資料檔案後自動識別高潛學員',
    emptyNoMatch: '無符合結果',
    emptyNoMatchDesc: '嘗試調整篩選條件',
    csvHeaders: [
      '學員ID',
      '圍場',
      'CC姓名',
      'CC團隊',
      'SS姓名',
      'SS團隊',
      'LP姓名',
      'LP團隊',
      '帶新數',
      '出席數',
      '付費數',
      '參與深度',
      '失聯天數',
      '打卡次數（7天）',
      '窗口期天數',
    ],
    csvDeep: '深度',
    csvShallow: '淺度',
    csvFilename: '高潛學員',
  },
  en: {
    title: 'High Potential Students',
    subtitle: 'High referrals · Active attendance · Strong payment intent · Total',
    subtitlePeople: '',
    urgencyLabel: 'Urgency: ',
    urgencyRed: 'Urgent',
    urgencyYellow: 'Watch',
    urgencyGreen: 'Stable',
    urgencyRedDesc: '= Window <7d or >14d no contact;',
    urgencyYellowDesc: '= 7-14d no contact;',
    urgencyGreenDesc: '= Recent contact',
    viewTable: 'Table',
    viewCard: 'Card',
    paid: 'Paid',
    deepEngagement: 'Deep',
    shallowEngagement: 'Shallow',
    engagementDepth: 'Engagement',
    lostContact: 'No contact',
    days: 'd',
    checkin: 'Check-in',
    window: 'Window',
    connected: 'Contact',
    new: 'New',
    attendance: 'Attend',
    errorTitle: 'Load Failed',
    errorDesc: 'Cannot load high potential student data, please check backend service',
    emptyNoData: 'No High Potential Data',
    emptyNoDataDesc: 'Upload data file to auto-identify high potential students',
    emptyNoMatch: 'No Matching Results',
    emptyNoMatchDesc: 'Try adjusting the filter conditions',
    csvHeaders: [
      'Student ID',
      'Enclosure',
      'CC Name',
      'CC Team',
      'SS Name',
      'SS Team',
      'LP Name',
      'LP Team',
      'New Referrals',
      'Attendance',
      'Payments',
      'Engagement Depth',
      'Days Since Contact',
      'Check-ins (7d)',
      'Window Days',
    ],
    csvDeep: 'Deep',
    csvShallow: 'Shallow',
    csvFilename: 'high_potential_students',
  },
  th: {
    title: 'นักเรียนศักยภาพสูง',
    subtitle: 'แนะนำสูง · เข้าเรียนสม่ำเสมอ · มีแนวโน้มชำระเงิน · ทั้งหมด',
    subtitlePeople: 'คน',
    urgencyLabel: 'ระดับความเร่งด่วน: ',
    urgencyRed: 'เร่งด่วน',
    urgencyYellow: 'ติดตาม',
    urgencyGreen: 'ปกติ',
    urgencyRedDesc: '= ช่วงเวลา<7วัน หรือ>14วันไม่ติดต่อ;',
    urgencyYellowDesc: '= 7-14 วันไม่ติดต่อ;',
    urgencyGreenDesc: '= ติดต่อล่าสุด',
    viewTable: 'ตาราง',
    viewCard: 'การ์ด',
    paid: 'ชำระแล้ว',
    deepEngagement: 'มีส่วนร่วมสูง',
    shallowEngagement: 'มีส่วนร่วมน้อย',
    engagementDepth: 'ระดับการมีส่วนร่วม',
    lostContact: 'ไม่ติดต่อ',
    days: 'วัน',
    checkin: 'เช็คอิน',
    window: 'ช่วงเวลา',
    connected: 'ติดต่อ',
    new: 'แนะนำใหม่',
    attendance: 'เข้าเรียน',
    errorTitle: 'โหลดข้อมูลล้มเหลว',
    errorDesc: 'ไม่สามารถโหลดข้อมูลนักเรียนศักยภาพสูงได้ กรุณาตรวจสอบบริการ backend',
    emptyNoData: 'ไม่มีข้อมูลนักเรียนศักยภาพสูง',
    emptyNoDataDesc: 'อัปโหลดไฟล์ข้อมูลเพื่อระบุนักเรียนศักยภาพสูงโดยอัตโนมัติ',
    emptyNoMatch: 'ไม่พบผลลัพธ์',
    emptyNoMatchDesc: 'ลองปรับเงื่อนไขการกรอง',
    csvHeaders: [
      'Student ID',
      'Enclosure',
      'CC Name',
      'CC Team',
      'SS Name',
      'SS Team',
      'LP Name',
      'LP Team',
      'New Referrals',
      'Attendance',
      'Payments',
      'Engagement',
      'Days No Contact',
      'Check-ins (7d)',
      'Window Days',
    ],
    csvDeep: 'Deep',
    csvShallow: 'Shallow',
    csvFilename: 'high_potential_students',
  },
};

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

function EnclosureBadge({ enclosure }: { enclosure: string }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-[var(--color-accent-surface)] text-[var(--color-accent)]">
      {enclosure}
    </span>
  );
}

function PaymentsBadge({ payments, label }: { payments: number; label: string }) {
  const hasPayment = payments > 0;
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
        hasPayment
          ? 'bg-emerald-50 text-[var(--color-success)]'
          : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
      }`}
    >
      {label} {payments}
    </span>
  );
}

function EngagementBadge({
  deep,
  labels,
}: {
  deep: boolean;
  labels: { deep: string; shallow: string };
}) {
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
        deep
          ? 'bg-emerald-50 text-[var(--color-success)]'
          : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
      }`}
    >
      {deep ? labels.deep : labels.shallow}
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
  t,
}: {
  student: HighPotentialStudent;
  warroom?: WarroomStudent;
  t: (typeof I18N)['zh'];
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
              {warroom.urgency_level === 'red'
                ? t.urgencyRed
                : warroom.urgency_level === 'yellow'
                  ? t.urgencyYellow
                  : t.urgencyGreen}
            </span>
          )}
        </div>
        <PaymentsBadge payments={student.payments} label={t.paid} />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 rounded-lg bg-[var(--bg-subtle)] px-3 py-2.5">
        <div className="text-center">
          <div className="text-base font-bold text-[var(--text-primary)]">{student.total_new}</div>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t.new}</p>
        </div>
        <div className="text-center border-x border-[var(--border-default)]">
          <div className="text-base font-bold text-[var(--text-primary)]">{student.attendance}</div>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t.attendance}</p>
        </div>
        <div className="text-center">
          <div
            className={`text-base font-bold ${student.payments > 0 ? 'text-[var(--color-success)]' : 'text-[var(--text-primary)]'}`}
          >
            {student.payments}
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t.paid}</p>
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
            <span className="text-xs text-[var(--text-muted)]">{t.engagementDepth}</span>
            <EngagementBadge
              deep={!!student.deep_engagement}
              labels={{ deep: t.deepEngagement, shallow: t.shallowEngagement }}
            />
          </div>
        )}

        {student.days_since_last_cc_contact != null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">{t.lostContact}</span>
            <span
              className={`font-semibold ${
                student.days_since_last_cc_contact > 14
                  ? 'text-[var(--color-danger)]'
                  : student.days_since_last_cc_contact > 7
                    ? 'text-[var(--color-warning)]'
                    : 'text-[var(--color-success)]'
              }`}
            >
              {student.days_since_last_cc_contact} {t.days}
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
              <p className="text-[10px] text-[var(--text-muted)]">{t.checkin}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {warroom.days_remaining}
                  {t.days}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">{t.window}</p>
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)] mb-0.5">
                {warroom.last_contact_date ?? '—'}
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">{t.connected}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CSV 导出 ─────────────────────────────────────────────────────────

function exportCsv(
  students: HighPotentialStudent[],
  warroomMap: Map<string, WarroomStudent>,
  t: (typeof I18N)['zh']
) {
  const headers = t.csvHeaders;
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
      s.deep_engagement == null ? '' : s.deep_engagement ? t.csvDeep : t.csvShallow,
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
  a.download = `${t.csvFilename}_${new Date().toISOString().slice(0, 10)}.csv`;
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
  usePageDimensions({ country: true, enclosure: true, team: true });
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

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
    return <EmptyState title={t.errorTitle} description={t.errorDesc} />;
  }

  return (
    <div className="space-y-5">
      {/* ── 标题行 ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">{t.title}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {t.subtitle} {allStudents.length} {t.subtitlePeople}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            {t.urgencyLabel}
            <span className="inline-flex items-center gap-1 mx-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              <span className="text-red-600 font-medium">{t.urgencyRed}</span>
            </span>
            {t.urgencyRedDesc}
            <span className="inline-flex items-center gap-1 mx-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span className="text-amber-600 font-medium">{t.urgencyYellow}</span>
            </span>
            {t.urgencyYellowDesc}
            <span className="inline-flex items-center gap-1 mx-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="text-emerald-600 font-medium">{t.urgencyGreen}</span>
            </span>
            {t.urgencyGreenDesc}
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
              {t.viewTable}
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
              {t.viewCard}
            </button>
          </div>

          {/* 导出 */}
          <ExportButton onExportCsv={() => exportCsv(filtered, warroomMap, t)} />
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
          title={allStudents.length === 0 ? t.emptyNoData : t.emptyNoMatch}
          description={allStudents.length === 0 ? t.emptyNoDataDesc : t.emptyNoMatchDesc}
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
              <HighPotentialCard
                key={s.id}
                student={s}
                warroom={warroomMap.get(String(s.id))}
                t={t}
              />
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
