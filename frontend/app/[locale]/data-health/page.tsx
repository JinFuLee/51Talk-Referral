'use client';

import { useState, Fragment } from 'react';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import {
  useLabel,
  PIPELINE_LAYER_LABELS,
  DATA_MODULE_LABELS,
  ROOT_CAUSE_LABELS,
  REMEDIATION_ACTION_LABELS,
  REMEDIATION_MANUAL_LABELS,
  CROSS_CHECK_LABELS,
} from '@/lib/label-maps';
import type {
  DataHealthReport,
  ModuleResult,
  EndpointResult,
  FieldCheck,
  RootCause,
  CrossCheck,
  PipelineLayer,
  FrontendErrors,
  DataFreshness,
  DiffFromLast,
} from '@/lib/types/data-health';

// ── I18N ──────────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    pageTitle: '数据管线诊断',
    pageSubtitle: '端到端字段健康检查 · 根因诊断 · 时效监控',
    loading: '正在检查所有端点，请稍候…',
    errorTitle: '诊断加载失败',
    errorDesc: '后端服务未运行，或 /api/data-health/data-quality 端点不存在',
    retry: '重试',
    emptyTitle: '暂无诊断数据',
    emptyDesc: '后端需实现 GET /api/data-health/data-quality 端点',
    refresh: '刷新检查',
    autoRefresh: '自动 30s',
    vsLast: 'vs 上次：',
    newIssues: '新异常',
    resolved: '已修复',
    noChange: '无变化',
    firstRun: '首次检查',
    rootCauses: '根因诊断',
    fieldAffected: '字段受影响',
    sample: '如：',
    freshness: '数据时效',
    moduleCheck: '模块检查',
    crossChecks: '跨端点一致性',
    feErrors: '前端错误（24h）',
    endpoints: '端点',
    fields: '字段',
    health: '健康',
    duration: '耗时',
    filterAll: '全部',
    filterWarn: '异常',
    searchPlaceholder: '搜索字段路径…',
    colPath: '路径',
    colType: '类型',
    colPreview: '值预览',
    colStatus: '状态',
    noMatch: '无匹配字段',
    showing: '显示',
    requestFailed: '请求失败：',
    noFieldData: '无字段数据',
    fresh: '新鲜',
    stale: '偏旧',
    expired: '过期',
    clickCopy: '点击复制路径',
  },
  'zh-TW': {
    pageTitle: '資料管線診斷',
    pageSubtitle: '端到端欄位健康檢查 · 根因診斷 · 時效監控',
    loading: '正在檢查所有端點，請稍候…',
    errorTitle: '診斷載入失敗',
    errorDesc: '後端服務未運行，或 /api/data-health/data-quality 端點不存在',
    retry: '重試',
    emptyTitle: '暫無診斷資料',
    emptyDesc: '後端需實現 GET /api/data-health/data-quality 端點',
    refresh: '刷新檢查',
    autoRefresh: '自動 30s',
    vsLast: 'vs 上次：',
    newIssues: '新異常',
    resolved: '已修復',
    noChange: '無變化',
    firstRun: '首次檢查',
    rootCauses: '根因診斷',
    fieldAffected: '欄位受影響',
    sample: '如：',
    freshness: '資料時效',
    moduleCheck: '模組檢查',
    crossChecks: '跨端點一致性',
    feErrors: '前端錯誤（24h）',
    endpoints: '端點',
    fields: '欄位',
    health: '健康',
    duration: '耗時',
    filterAll: '全部',
    filterWarn: '異常',
    searchPlaceholder: '搜尋欄位路徑…',
    colPath: '路徑',
    colType: '類型',
    colPreview: '值預覽',
    colStatus: '狀態',
    noMatch: '無匹配欄位',
    showing: '顯示',
    requestFailed: '請求失敗：',
    noFieldData: '無欄位資料',
    fresh: '新鮮',
    stale: '偏舊',
    expired: '過期',
    clickCopy: '點擊複製路徑',
  },
  en: {
    pageTitle: 'Data Pipeline Diagnostics',
    pageSubtitle: 'End-to-end field health check · Root cause diagnosis · Freshness monitor',
    loading: 'Checking all endpoints, please wait…',
    errorTitle: 'Diagnostics failed to load',
    errorDesc:
      'Backend service is not running, or /api/data-health/data-quality endpoint does not exist',
    retry: 'Retry',
    emptyTitle: 'No diagnostic data',
    emptyDesc: 'Backend must implement GET /api/data-health/data-quality',
    refresh: 'Refresh check',
    autoRefresh: 'Auto 30s',
    vsLast: 'vs last: ',
    newIssues: 'new issues',
    resolved: 'resolved',
    noChange: 'no change',
    firstRun: 'First run',
    rootCauses: 'Root Cause Diagnosis',
    fieldAffected: 'fields affected',
    sample: 'e.g.: ',
    freshness: 'Data Freshness',
    moduleCheck: 'Module Check',
    crossChecks: 'Cross-endpoint Consistency',
    feErrors: 'Frontend Errors (24h)',
    endpoints: 'endpoints',
    fields: 'fields',
    health: 'healthy',
    duration: 'took',
    filterAll: 'All',
    filterWarn: 'Warn',
    searchPlaceholder: 'Search field path…',
    colPath: 'Path',
    colType: 'Type',
    colPreview: 'Value Preview',
    colStatus: 'Status',
    noMatch: 'No matching fields',
    showing: 'Showing',
    requestFailed: 'Request failed: ',
    noFieldData: 'No field data',
    fresh: 'Fresh',
    stale: 'Stale',
    expired: 'Expired',
    clickCopy: 'Click to copy path',
  },
  th: {
    pageTitle: 'วินิจฉัยท่อส่งข้อมูล',
    pageSubtitle: 'ตรวจสอบฟิลด์ตลอดเส้นทาง · วินิจฉัยสาเหตุ · ติดตามความทันสมัย',
    loading: 'กำลังตรวจสอบทุก endpoint กรุณารอสักครู่…',
    errorTitle: 'โหลดการวินิจฉัยล้มเหลว',
    errorDesc: 'บริการแบ็กเอนด์ไม่ทำงาน หรือ endpoint /api/data-health/data-quality ไม่มีอยู่',
    retry: 'ลองใหม่',
    emptyTitle: 'ไม่มีข้อมูลการวินิจฉัย',
    emptyDesc: 'แบ็กเอนด์ต้องใช้งาน GET /api/data-health/data-quality',
    refresh: 'รีเฟรช',
    autoRefresh: 'อัตโนมัติ 30s',
    vsLast: 'เทียบครั้งที่แล้ว: ',
    newIssues: 'ปัญหาใหม่',
    resolved: 'แก้ไขแล้ว',
    noChange: 'ไม่มีการเปลี่ยนแปลง',
    firstRun: 'ครั้งแรก',
    rootCauses: 'การวินิจฉัยสาเหตุ',
    fieldAffected: 'ฟิลด์ที่ได้รับผลกระทบ',
    sample: 'เช่น: ',
    freshness: 'ความทันสมัยของข้อมูล',
    moduleCheck: 'ตรวจสอบโมดูล',
    crossChecks: 'ความสอดคล้องข้าม endpoint',
    feErrors: 'ข้อผิดพลาดฟรอนต์เอนด์ (24h)',
    endpoints: 'endpoint',
    fields: 'ฟิลด์',
    health: 'สุขภาพดี',
    duration: 'ใช้เวลา',
    filterAll: 'ทั้งหมด',
    filterWarn: 'คำเตือน',
    searchPlaceholder: 'ค้นหาเส้นทางฟิลด์…',
    colPath: 'เส้นทาง',
    colType: 'ประเภท',
    colPreview: 'ตัวอย่างค่า',
    colStatus: 'สถานะ',
    noMatch: 'ไม่พบฟิลด์ที่ตรงกัน',
    showing: 'แสดง',
    requestFailed: 'คำขอล้มเหลว: ',
    noFieldData: 'ไม่มีข้อมูลฟิลด์',
    fresh: 'สด',
    stale: 'เก่า',
    expired: 'หมดอายุ',
    clickCopy: 'คลิกเพื่อคัดลอกเส้นทาง',
  },
};

// ── 辅助函数 ──────────────────────────────────────────────────────────────────

function statusBgClass(status: 'healthy' | 'warning' | 'critical' | 'ok' | 'error'): string {
  switch (status) {
    case 'healthy':
    case 'ok':
      return 'bg-emerald-500';
    case 'warning':
      return 'bg-amber-500';
    case 'critical':
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-[var(--text-muted)]';
  }
}

function layerBadgeClass(status: PipelineLayer['status']): string {
  switch (status) {
    case 'ok':
      return 'bg-emerald-50 text-emerald-700';
    case 'warning':
      return 'bg-amber-50 text-amber-700';
    case 'critical':
    case 'error':
      return 'bg-red-50 text-red-700';
    default:
      return 'bg-[var(--bg-subtle)] text-[var(--text-muted)]';
  }
}

function fieldTypeBadgeClass(type: string): string {
  switch (type) {
    case 'null':
      return 'bg-amber-100 text-amber-700';
    case 'number':
      return 'bg-blue-50 text-blue-700';
    case 'string':
      return 'bg-emerald-50 text-emerald-700';
    case 'array':
      return 'bg-purple-50 text-purple-700';
    default:
      return 'bg-[var(--bg-subtle)] text-[var(--text-muted)]';
  }
}

// ── 页面顶部 Header ───────────────────────────────────────────────────────────

function PageHeader({ t }: { t: (typeof I18N)['zh'] }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--text-primary)] font-display">{t.pageTitle}</h1>
      <p className="text-sm text-[var(--text-muted)] mt-0.5">{t.pageSubtitle}</p>
    </div>
  );
}

// ── Loading 态 ────────────────────────────────────────────────────────────────

function LoadingState({ t }: { t: (typeof I18N)['zh'] }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card-base h-24 animate-pulse bg-[var(--n-100)]" />
      ))}
      <p className="text-center text-sm text-[var(--text-muted)]">{t.loading}</p>
    </div>
  );
}

// ── Error 态 ──────────────────────────────────────────────────────────────────

function ErrorState({ onRetry, t }: { onRetry: () => void; t: (typeof I18N)['zh'] }) {
  return (
    <div className="card-base flex flex-col items-center justify-center py-12 gap-3">
      <p className="text-base font-semibold text-red-600">{t.errorTitle}</p>
      <p className="text-sm text-[var(--text-muted)]">{t.errorDesc}</p>
      <button onClick={onRetry} className="btn-secondary">
        {t.retry}
      </button>
    </div>
  );
}

// ── L0 总览横幅 ───────────────────────────────────────────────────────────────

function L0Banner({
  report,
  onRefresh,
  autoRefresh,
  onToggleAuto,
  t,
}: {
  report: DataHealthReport;
  onRefresh: () => void;
  autoRefresh: boolean;
  onToggleAuto: (v: boolean) => void;
  t: (typeof I18N)['zh'];
}) {
  const diff: DiffFromLast = report.vs_last_check;
  const trendIcon: Record<DiffFromLast['trend'], string> = {
    improving: '↗',
    degrading: '↘',
    stable: '→',
    first_run: '•',
  };

  return (
    <div className="card-base p-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full shrink-0 ${statusBgClass(report.overall_status)}`}
          />
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {report.total_endpoints} {t.endpoints} &middot; {report.total_fields.toLocaleString()}{' '}
              {t.fields}
              &middot; {report.overall_health_pct}% {t.health}
            </div>
            <div className="text-xs text-[var(--text-muted)] flex flex-wrap items-center gap-2 mt-0.5">
              <span>
                {t.duration} {report.check_duration_ms}ms
              </span>
              {diff.last_checked_at && (
                <>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    {t.vsLast}
                    {diff.new_issues > 0 && (
                      <span className="text-red-500">
                        +{diff.new_issues} {t.newIssues}
                      </span>
                    )}
                    {diff.resolved_issues > 0 && (
                      <span className="text-emerald-500">
                        {' '}
                        {diff.resolved_issues} {t.resolved}
                      </span>
                    )}
                    {diff.new_issues === 0 && diff.resolved_issues === 0 && (
                      <span>{t.noChange}</span>
                    )}
                    <span className="ml-1">{trendIcon[diff.trend]}</span>
                  </span>
                </>
              )}
              {!diff.last_checked_at && <span className="text-amber-500">{t.firstRun}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onRefresh} className="btn-secondary text-xs px-3 py-1.5">
            {t.refresh}
          </button>
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => onToggleAuto(e.target.checked)}
              className="rounded"
            />
            {t.autoRefresh}
          </label>
        </div>
      </div>
    </div>
  );
}

// ── 管线状态条 ────────────────────────────────────────────────────────────────

function PipelineBar({ pipeline }: { pipeline: PipelineLayer[] }) {
  const label = useLabel();
  if (!pipeline || pipeline.length === 0) return null;
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1">
      {pipeline.map((layer, i) => (
        <Fragment key={layer.layer}>
          {i > 0 && <span className="text-[var(--text-muted)] shrink-0">→</span>}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 ${layerBadgeClass(layer.status)}`}
          >
            <span>{label(PIPELINE_LAYER_LABELS, layer.layer)}</span>
            <span className="font-mono text-[10px] opacity-75">{layer.detail}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

// ── 根因卡片 ──────────────────────────────────────────────────────────────────

function RootCauseCards({ causes, t }: { causes: RootCause[]; t: (typeof I18N)['zh'] }) {
  const label = useLabel();
  if (!causes || causes.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        {t.rootCauses}
      </h3>
      {causes.map((rc, i) => (
        <div
          key={i}
          className="card-base p-3 flex items-center justify-between gap-3 border-l-4 border-amber-400"
        >
          <div className="min-w-0">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {label(ROOT_CAUSE_LABELS, rc.cause)}
            </span>
            <span className="ml-2 text-xs text-[var(--text-muted)]">
              → {rc.affected_fields} {t.fieldAffected}
            </span>
            {rc.sample_paths && rc.sample_paths.length > 0 && (
              <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 truncate">
                {t.sample}
                {rc.sample_paths.slice(0, 2).join(' / ')}
              </div>
            )}
          </div>
          {rc.remediation &&
            (rc.remediation.link ? (
              <a href={rc.remediation.link} className="btn-primary text-xs px-3 py-1 shrink-0">
                {label(REMEDIATION_ACTION_LABELS, rc.remediation.action)}
              </a>
            ) : (
              <span className="text-xs text-[var(--text-muted)] shrink-0">
                {label(REMEDIATION_MANUAL_LABELS, rc.remediation.manual ?? '')}
              </span>
            ))}
        </div>
      ))}
    </div>
  );
}

// ── 数据时效 ──────────────────────────────────────────────────────────────────

function FreshnessSection({
  freshness,
  t,
}: {
  freshness: DataFreshness[];
  t: (typeof I18N)['zh'];
}) {
  if (!freshness || freshness.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        {t.freshness}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {freshness.map((f) => {
          const borderColor =
            f.status === 'fresh'
              ? 'border-emerald-400'
              : f.status === 'stale'
                ? 'border-amber-400'
                : 'border-red-400';
          const statusLabel =
            f.status === 'fresh' ? t.fresh : f.status === 'stale' ? t.stale : t.expired;
          return (
            <div key={f.file} className={`card-base p-3 border-l-4 ${borderColor}`}>
              <div
                className="text-xs font-medium text-[var(--text-primary)] truncate"
                title={f.source}
              >
                {f.source}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">
                T-{f.age_days} · {statusLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── L3 字段表格 ───────────────────────────────────────────────────────────────

function FieldTable({ fields, t }: { fields: FieldCheck[]; t: (typeof I18N)['zh'] }) {
  const [filter, setFilter] = useState<'all' | 'warn' | 'null'>('all');
  const [search, setSearch] = useState('');

  const warnCount = fields.filter((f) => f.status === 'warn').length;
  const nullCount = fields.filter((f) => f.type === 'null').length;

  const filtered = fields.filter((f) => {
    if (filter === 'warn' && f.status !== 'warn') return false;
    if (filter === 'null' && f.type !== 'null') return false;
    if (search && !f.path.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function copyPath(path: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(path).catch(() => null);
    }
  }

  return (
    <div className="px-6 py-3 bg-[var(--bg-subtle)] space-y-2">
      {/* 筛选栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          {(['all', 'warn', 'null'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                filter === f
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
              }`}
            >
              {f === 'all'
                ? `${t.filterAll} (${fields.length})`
                : f === 'warn'
                  ? `${t.filterWarn} (${warnCount})`
                  : `null (${nullCount})`}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1 text-xs rounded border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
      </div>

      {/* 字段表格 */}
      <div className="max-h-96 overflow-y-auto rounded border border-[var(--border-default)]">
        <table className="w-full text-xs">
          <thead className="sticky top-0">
            <tr className="slide-thead-row">
              <th className="slide-th text-left">{t.colPath}</th>
              <th className="slide-th text-center w-16">{t.colType}</th>
              <th className="slide-th text-left">{t.colPreview}</th>
              <th className="slide-th text-center w-10">{t.colStatus}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="slide-td text-center text-[var(--text-muted)] py-4">
                  {t.noMatch}
                </td>
              </tr>
            ) : (
              filtered.map((f, i) => (
                <tr
                  key={`${f.path}-${i}`}
                  className={
                    f.status === 'warn'
                      ? 'bg-amber-50'
                      : i % 2 === 0
                        ? 'slide-row-even'
                        : 'slide-row-odd'
                  }
                >
                  <td
                    className="slide-td font-mono text-[10px] text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                    onClick={() => copyPath(f.path)}
                    title={t.clickCopy}
                  >
                    {f.path}
                  </td>
                  <td className="slide-td text-center">
                    <span
                      className={`px-1 py-0.5 rounded text-[10px] ${fieldTypeBadgeClass(f.type)}`}
                    >
                      {f.type}
                    </span>
                  </td>
                  <td
                    className="slide-td font-mono text-[10px] text-[var(--text-muted)] truncate max-w-[200px]"
                    title={f.value_preview}
                  >
                    {f.value_preview}
                  </td>
                  <td className="slide-td text-center">{f.status === 'ok' ? '🟢' : '🟡'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[var(--text-muted)]">
        {t.showing} {filtered.length} / {fields.length} {t.fields}
      </p>
    </div>
  );
}

// ── L2 端点列表 ───────────────────────────────────────────────────────────────

function EndpointList({ endpoints, t }: { endpoints: EndpointResult[]; t: (typeof I18N)['zh'] }) {
  const [expandedEp, setExpandedEp] = useState<string | null>(null);

  return (
    <div className="border-t border-[var(--border-default)]">
      {endpoints.map((ep) => {
        const healthPct =
          ep.total_fields > 0 ? ((ep.total_fields - ep.null_fields) / ep.total_fields) * 100 : 100;
        const isExpanded = expandedEp === ep.path;

        return (
          <div key={ep.path} className="border-b border-[var(--border-subtle)] last:border-b-0">
            <button
              onClick={() => setExpandedEp(isExpanded ? null : ep.path)}
              className="w-full px-6 py-2.5 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    ep.status_code === 200
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {ep.status_code}
                </span>
                <span className="text-xs font-mono text-[var(--text-secondary)] truncate">
                  {ep.method} {ep.path}
                </span>
                {ep.error && (
                  <span className="text-[10px] text-red-500 truncate" title={ep.error}>
                    {ep.error.slice(0, 60)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] shrink-0 ml-2">
                <span>{ep.response_ms}ms</span>
                <span>
                  {ep.total_fields} {t.fields}
                </span>
                {ep.null_fields > 0 && (
                  <span className="text-amber-500">{ep.null_fields} null</span>
                )}
                {/* 健康进度条 */}
                <div className="w-16 h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${healthPct}%` }}
                  />
                </div>
                <span>{isExpanded ? '▾' : '▸'}</span>
              </div>
            </button>

            {/* L3 字段表格 */}
            {isExpanded && ep.fields && ep.fields.length > 0 && (
              <FieldTable fields={ep.fields} t={t} />
            )}
            {isExpanded && (!ep.fields || ep.fields.length === 0) && (
              <div className="px-6 py-3 bg-[var(--bg-subtle)] text-xs text-[var(--text-muted)]">
                {ep.error ? `${t.requestFailed}${ep.error}` : t.noFieldData}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── L1 模块卡片组 ─────────────────────────────────────────────────────────────

function ModuleCards({ modules, t }: { modules: ModuleResult[]; t: (typeof I18N)['zh'] }) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const label = useLabel();

  if (!modules || modules.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        {t.moduleCheck}
      </h3>
      {modules.map((mod) => {
        const isExpanded = expandedModule === mod.name;
        return (
          <div key={mod.name} className="card-base overflow-hidden">
            {/* L1 卡片头 */}
            <button
              onClick={() => setExpandedModule(isExpanded ? null : mod.name)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${mod.all_ok ? 'bg-emerald-500' : 'bg-red-500'}`}
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {label(DATA_MODULE_LABELS, mod.name)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] shrink-0">
                <span>
                  {mod.endpoints.length} {t.endpoints}
                </span>
                <span>
                  {mod.total_fields.toLocaleString()} {t.fields}
                </span>
                {mod.null_fields > 0 && (
                  <span className="text-amber-500">{mod.null_fields} null</span>
                )}
                <span>{isExpanded ? '▾' : '▸'}</span>
              </div>
            </button>

            {/* L2 端点详情 */}
            {isExpanded && <EndpointList endpoints={mod.endpoints} t={t} />}
          </div>
        );
      })}
    </div>
  );
}

// ── 跨端点一致性 ──────────────────────────────────────────────────────────────

function CrossChecks({ checks, t }: { checks: CrossCheck[]; t: (typeof I18N)['zh'] }) {
  const label = useLabel();
  if (!checks || checks.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        {t.crossChecks}
      </h3>
      {checks.map((c, i) => (
        <div
          key={i}
          className={`card-base p-3 border-l-4 ${c.passed ? 'border-emerald-400' : 'border-red-400'}`}
        >
          <span className="text-sm text-[var(--text-primary)]">
            {label(CROSS_CHECK_LABELS, c.name)}
          </span>
          {c.note && <span className="ml-2 text-xs text-[var(--text-muted)]">{c.note}</span>}
        </div>
      ))}
    </div>
  );
}

// ── 前端错误 ──────────────────────────────────────────────────────────────────

function FrontendErrorsSection({ errors, t }: { errors: FrontendErrors; t: (typeof I18N)['zh'] }) {
  if (!errors || errors.last_24h === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
        {t.feErrors}
        <span className="text-red-500 font-mono normal-case">{errors.last_24h}</span>
      </h3>
      {errors.top_errors.map((e, i) => (
        <div key={i} className="card-base p-3 border-l-4 border-red-400">
          <div className="text-xs font-mono text-red-600 truncate" title={e.message}>
            {e.message}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
            {e.page} &middot; {e.count}x
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────

export default function DataHealthPage() {
  usePageDimensions({});
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data, isLoading, error, mutate } = useFilteredSWR<DataHealthReport>(
    '/api/data-health/data-quality',
    { refreshInterval: autoRefresh ? 30000 : 0 }
  );

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader t={t} />

      {isLoading && <LoadingState t={t} />}

      {error && !isLoading && <ErrorState onRetry={() => mutate()} t={t} />}

      {!isLoading && !error && !data && (
        <div className="card-base flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-base font-semibold text-[var(--text-secondary)]">{t.emptyTitle}</p>
          <p className="text-sm text-[var(--text-muted)]">{t.emptyDesc}</p>
          <button onClick={() => mutate()} className="btn-secondary">
            {t.retry}
          </button>
        </div>
      )}

      {data && !isLoading && !error && (
        <>
          <L0Banner
            report={data}
            onRefresh={() => mutate()}
            autoRefresh={autoRefresh}
            onToggleAuto={setAutoRefresh}
            t={t}
          />
          <PipelineBar pipeline={data.pipeline_status} />
          <RootCauseCards causes={data.root_causes} t={t} />
          <FreshnessSection freshness={data.data_freshness} t={t} />
          <ModuleCards modules={data.modules} t={t} />
          <CrossChecks checks={data.cross_checks} t={t} />
          <FrontendErrorsSection errors={data.frontend_errors} t={t} />
        </>
      )}
    </div>
  );
}
