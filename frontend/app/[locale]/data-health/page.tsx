'use client';

import { useState, Fragment } from 'react';
import { useLocale, useTranslations } from 'next-intl';
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

// ── 引擎状态类型（API 返回但前端类型未声明） ────────────────────────────────
interface EngineTable {
  rows?: number;
  cols?: number;
  status: string;
}
interface EngineStatus {
  status: string;
  tables: Record<string, EngineTable>;
  total_rows: number;
  table_count: number;
}

// ── 辅助：语义状态色 CSS 类（全用 design token，暗色模式友好） ────────────────

function statusDotClass(status: string): string {
  switch (status) {
    case 'healthy':
    case 'ok':
      return 'bg-success-token';
    case 'warning':
      return 'bg-warning-token';
    case 'critical':
    case 'error':
      return 'bg-danger-token';
    default:
      return 'text-muted-bg';
  }
}

function layerBadgeClass(status: PipelineLayer['status']): string {
  switch (status) {
    case 'ok':
      return 'bg-success-surface text-success-token';
    case 'warning':
      return 'bg-warning-surface text-warning-token';
    case 'critical':
    case 'error':
      return 'bg-danger-surface text-danger-token';
    default:
      return 'bg-subtle text-muted-token';
  }
}

function fieldTypeBadgeClass(type: string): string {
  switch (type) {
    case 'null':
      return 'bg-warning-surface text-warning-token';
    case 'number':
      return 'bg-accent-surface text-accent-token';
    case 'string':
      return 'bg-success-surface text-success-token';
    case 'array':
      return 'badge-info';
    default:
      return 'bg-subtle text-muted-token';
  }
}

// ── 页面顶部 Header ───────────────────────────────────────────────────────────

function PageHeader({ t }: { t: (key: string) => string }) {
  return (
    <div>
      <h1 className="page-title">{t('pageTitle')}</h1>
      <p className="page-subtitle">{t('pageSubtitle')}</p>
    </div>
  );
}

// ── Loading 态 ────────────────────────────────────────────────────────────────

function LoadingState({ t }: { t: (key: string) => string }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card-base h-24 animate-pulse bg-subtle" />
      ))}
      <p className="text-center text-sm text-muted-token">{t('loading')}</p>
    </div>
  );
}

// ── Error 态 ──────────────────────────────────────────────────────────────────

function ErrorState({ onRetry, t }: { onRetry: () => void; t: (key: string) => string }) {
  return (
    <div className="state-empty card-base">
      <p className="text-base font-semibold text-danger-token">{t('errorTitle')}</p>
      <p className="text-sm text-muted-token">{t('errorDesc')}</p>
      <button onClick={onRetry} className="btn-secondary mt-2">
        {t('retry')}
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
  t: (key: string) => string;
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
            className={`w-3 h-3 rounded-full shrink-0 ${statusDotClass(report.overall_status)}`}
          />
          <div>
            <div className="text-sm font-semibold text-primary-token">
              {report.total_endpoints} {t('endpoints')} &middot;{' '}
              {report.total_fields.toLocaleString()} {t('fields')}
              &middot; {report.overall_health_pct}% {t('health')}
            </div>
            <div className="text-xs text-muted-token flex flex-wrap items-center gap-2 mt-0.5">
              <span>
                {t('duration')} {report.check_duration_ms}ms
              </span>
              {diff.last_checked_at && (
                <>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    {t('vsLast')}
                    {diff.new_issues > 0 && (
                      <span className="text-danger-token">
                        +{diff.new_issues} {t('newIssues')}
                      </span>
                    )}
                    {diff.resolved_issues > 0 && (
                      <span className="text-success-token">
                        {' '}
                        {diff.resolved_issues} {t('resolved')}
                      </span>
                    )}
                    {diff.new_issues === 0 && diff.resolved_issues === 0 && (
                      <span>{t('noChange')}</span>
                    )}
                    <span className="ml-1">{trendIcon[diff.trend]}</span>
                  </span>
                </>
              )}
              {!diff.last_checked_at && <span className="text-warning-token">{t('firstRun')}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onRefresh} className="btn-secondary text-xs px-3 py-1.5">
            {t('refresh')}
          </button>
          <label className="flex items-center gap-1.5 text-xs text-muted-token cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => onToggleAuto(e.target.checked)}
              className="rounded"
            />
            {t('autoRefresh')}
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
          {i > 0 && <span className="text-muted-token shrink-0">→</span>}
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

// ── 引擎状态卡片（新增） ────────────────────────────────────────────────────

function EngineStatusSection({ engine, t }: { engine: EngineStatus; t: (key: string) => string }) {
  if (!engine) return null;

  const tables = Object.entries(engine.tables);

  return (
    <div className="space-y-2">
      <h3 className="table-header flex items-center gap-2">
        {t('engineStatus')}
        <span className={`badge-${engine.status === 'ok' ? 'success' : 'warning'}`}>
          {engine.table_count} {t('engineTable')} &middot; {engine.total_rows.toLocaleString()}{' '}
          {t('engineRows')}
        </span>
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {tables.map(([name, tbl]) => (
          <div
            key={name}
            className={`card-compact border-l-4 ${tbl.status === 'ok' ? 'border-success-token' : tbl.status === 'unknown' ? 'border-muted-token' : 'border-warning-token'}`}
          >
            <div className="text-xs font-medium text-primary-token truncate" title={name}>
              {name}
            </div>
            <div className="text-[10px] text-muted-token mt-1 font-mono">
              {tbl.rows != null ? (
                <>
                  {tbl.rows.toLocaleString()} {t('engineRows')} &middot; {tbl.cols}{' '}
                  {t('engineCols')}
                </>
              ) : (
                tbl.status
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 根因卡片 ──────────────────────────────────────────────────────────────────

function RootCauseCards({ causes, t }: { causes: RootCause[]; t: (key: string) => string }) {
  const label = useLabel();
  if (!causes || causes.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="table-header">{t('rootCauses')}</h3>
      {causes.map((rc, i) => (
        <div
          key={i}
          className="card-compact flex items-center justify-between gap-3 border-l-4 border-warning-token"
        >
          <div className="min-w-0">
            <span className="text-sm font-medium text-primary-token">
              {label(ROOT_CAUSE_LABELS, rc.cause)}
            </span>
            <span className="ml-2 text-xs text-muted-token">
              → {rc.affected_fields} {t('fieldAffected')}
            </span>
            {rc.sample_paths && rc.sample_paths.length > 0 && (
              <div className="text-[10px] text-muted-token font-mono mt-0.5 truncate">
                {t('sample')}
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
              <span className="text-xs text-muted-token shrink-0">
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
  t: (key: string) => string;
}) {
  if (!freshness || freshness.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="table-header">{t('freshness')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {freshness.map((f) => {
          const borderColor =
            f.status === 'fresh'
              ? 'border-success-token'
              : f.status === 'stale'
                ? 'border-warning-token'
                : 'border-danger-token';
          const statusLabel =
            f.status === 'fresh' ? t('fresh') : f.status === 'stale' ? t('stale') : t('expired');
          return (
            <div key={f.file} className={`card-compact border-l-4 ${borderColor}`}>
              <div className="text-xs font-medium text-primary-token truncate" title={f.source}>
                {f.source}
              </div>
              <div className="text-[10px] text-muted-token mt-1">
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

function FieldTable({ fields, t }: { fields: FieldCheck[]; t: (key: string) => string }) {
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
    <div className="px-6 py-3 bg-subtle space-y-2">
      {/* 筛选栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          {(['all', 'warn', 'null'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                filter === f
                  ? 'bg-accent-token text-accent-text-token'
                  : 'bg-surface text-muted-token'
              }`}
            >
              {f === 'all'
                ? `${t('filterAll')} (${fields.length})`
                : f === 'warn'
                  ? `${t('filterWarn')} (${warnCount})`
                  : `null (${nullCount})`}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base flex-1 min-w-0 !px-2 !py-1 !text-xs"
        />
      </div>

      {/* 字段表格 */}
      <div className="max-h-96 overflow-y-auto rounded border border-default-token">
        <table className="w-full text-xs">
          <thead className="sticky top-0">
            <tr className="slide-thead-row">
              <th className="slide-th text-left">{t('colPath')}</th>
              <th className="slide-th text-center w-16">{t('colType')}</th>
              <th className="slide-th text-left">{t('colPreview')}</th>
              <th className="slide-th text-center w-10">{t('colStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="slide-td text-center text-muted-token py-4">
                  {t('noMatch')}
                </td>
              </tr>
            ) : (
              filtered.map((f, i) => (
                <tr
                  key={`${f.path}-${i}`}
                  className={
                    f.status === 'warn'
                      ? 'row-warning'
                      : i % 2 === 0
                        ? 'slide-row-even'
                        : 'slide-row-odd'
                  }
                >
                  <td
                    className="slide-td font-mono text-[10px] text-secondary-token cursor-pointer hover:text-primary-token transition-colors"
                    onClick={() => copyPath(f.path)}
                    title={t('clickCopy')}
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
                    className="slide-td font-mono text-[10px] text-muted-token truncate max-w-[200px]"
                    title={f.value_preview}
                  >
                    {f.value_preview}
                  </td>
                  <td className="slide-td text-center">
                    {f.status === 'ok' ? (
                      <span className="inline-block w-2 h-2 rounded-full bg-success-token" />
                    ) : (
                      <span className="inline-block w-2 h-2 rounded-full bg-warning-token" />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-token">
        {t('showing')} {filtered.length} / {fields.length} {t('fields')}
      </p>
    </div>
  );
}

// ── L2 端点列表 ───────────────────────────────────────────────────────────────

function EndpointList({
  endpoints,
  t,
}: {
  endpoints: EndpointResult[];
  t: (key: string) => string;
}) {
  const [expandedEp, setExpandedEp] = useState<string | null>(null);

  return (
    <div className="border-t border-default-token">
      {endpoints.map((ep) => {
        const healthPct =
          ep.total_fields > 0 ? ((ep.total_fields - ep.null_fields) / ep.total_fields) * 100 : 100;
        const isExpanded = expandedEp === ep.path;

        return (
          <div key={ep.path} className="border-b border-subtle-token last:border-b-0">
            <button
              onClick={() => setExpandedEp(isExpanded ? null : ep.path)}
              className="w-full px-6 py-2.5 flex items-center justify-between hover:bg-subtle transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    ep.status_code === 200
                      ? 'bg-success-surface text-success-token'
                      : 'bg-danger-surface text-danger-token'
                  }`}
                >
                  {ep.status_code}
                </span>
                <span className="text-xs font-mono text-secondary-token truncate">
                  {ep.method} {ep.path}
                </span>
                {ep.error && (
                  <span className="text-[10px] text-danger-token truncate" title={ep.error}>
                    {ep.error.slice(0, 60)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-token shrink-0 ml-2">
                <span>{ep.response_ms}ms</span>
                <span>
                  {ep.total_fields} {t('fields')}
                </span>
                {ep.null_fields > 0 && (
                  <span className="text-warning-token">{ep.null_fields} null</span>
                )}
                {/* 健康进度条 */}
                <div className="w-16 h-1.5 progress-track overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 bg-success-token"
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
              <div className="px-6 py-3 bg-subtle text-xs text-muted-token">
                {ep.error ? `${t('requestFailed')}${ep.error}` : t('noFieldData')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── L1 模块卡片组 ─────────────────────────────────────────────────────────────

function ModuleCards({ modules, t }: { modules: ModuleResult[]; t: (key: string) => string }) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const label = useLabel();

  if (!modules || modules.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="table-header">{t('moduleCheck')}</h3>
      {modules.map((mod) => {
        const isExpanded = expandedModule === mod.name;
        return (
          <div key={mod.name} className="card-base overflow-hidden">
            {/* L1 卡片头 */}
            <button
              onClick={() => setExpandedModule(isExpanded ? null : mod.name)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-subtle transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${mod.all_ok ? 'bg-success-token' : 'bg-danger-token'}`}
                />
                <span className="text-sm font-medium text-primary-token">
                  {label(DATA_MODULE_LABELS, mod.name)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-token shrink-0">
                <span>
                  {mod.endpoints.length} {t('endpoints')}
                </span>
                <span>
                  {mod.total_fields.toLocaleString()} {t('fields')}
                </span>
                {mod.null_fields > 0 && (
                  <span className="text-warning-token">{mod.null_fields} null</span>
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

function CrossChecks({ checks, t }: { checks: CrossCheck[]; t: (key: string) => string }) {
  const label = useLabel();
  if (!checks || checks.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="table-header">{t('crossChecks')}</h3>
      {checks.map((c, i) => (
        <div
          key={i}
          className={`card-compact border-l-4 ${c.passed ? 'border-success-token' : 'border-danger-token'}`}
        >
          <span className="text-sm text-primary-token">{label(CROSS_CHECK_LABELS, c.name)}</span>
          {c.note && <span className="ml-2 text-xs text-muted-token">{c.note}</span>}
        </div>
      ))}
    </div>
  );
}

// ── 前端错误 ──────────────────────────────────────────────────────────────────

function FrontendErrorsSection({
  errors,
  t,
}: {
  errors: FrontendErrors;
  t: (key: string) => string;
}) {
  if (!errors || errors.last_24h === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="table-header flex items-center gap-2">
        {t('feErrors')}
        <span className="badge-danger normal-case">{errors.last_24h}</span>
      </h3>
      {errors.top_errors.map((e, i) => (
        <div key={i} className="card-compact border-l-4 border-danger-token">
          <div className="text-xs font-mono text-danger-token truncate" title={e.message}>
            {e.message}
          </div>
          <div className="text-[10px] text-muted-token mt-0.5">
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
  const t = useTranslations('dataHealth');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data, isLoading, error, mutate } = useFilteredSWR<
    DataHealthReport & { engine_status?: EngineStatus }
  >('/api/data-health/data-quality', { refreshInterval: autoRefresh ? 30000 : 0 });

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader t={t} />

      {isLoading && <LoadingState t={t} />}

      {error && !isLoading && <ErrorState onRetry={() => mutate()} t={t} />}

      {!isLoading && !error && !data && (
        <div className="state-empty card-base">
          <p className="text-base font-semibold text-secondary-token">{t('emptyTitle')}</p>
          <p className="text-sm text-muted-token">{t('emptyDesc')}</p>
          <button onClick={() => mutate()} className="btn-secondary mt-2">
            {t('retry')}
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
          {data.engine_status && <EngineStatusSection engine={data.engine_status} t={t} />}
          <ModuleCards modules={data.modules} t={t} />
          <CrossChecks checks={data.cross_checks} t={t} />
          <FrontendErrorsSection errors={data.frontend_errors} t={t} />
        </>
      )}
    </div>
  );
}
