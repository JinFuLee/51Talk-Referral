'use client';

import useSWR from 'swr';
import { useState, Fragment } from 'react';
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
import { swrFetcher } from '@/lib/api';

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

function PageHeader() {
  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--text-primary)] font-display">数据管线诊断</h1>
      <p className="text-sm text-[var(--text-muted)] mt-0.5">
        端到端字段健康检查 · 根因诊断 · 时效监控
      </p>
    </div>
  );
}

// ── Loading 态 ────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card-base h-24 animate-pulse bg-[var(--n-100)]" />
      ))}
      <p className="text-center text-sm text-[var(--text-muted)]">正在检查所有端点，请稍候…</p>
    </div>
  );
}

// ── Error 态 ──────────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="card-base flex flex-col items-center justify-center py-12 gap-3">
      <p className="text-base font-semibold text-red-600">诊断加载失败</p>
      <p className="text-sm text-[var(--text-muted)]">
        后端服务未运行，或 /api/data-health/data-quality 端点不存在
      </p>
      <button onClick={onRetry} className="btn-secondary">
        重试
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
}: {
  report: DataHealthReport;
  onRefresh: () => void;
  autoRefresh: boolean;
  onToggleAuto: (v: boolean) => void;
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
              {report.total_endpoints} 端点 &middot; {report.total_fields.toLocaleString()} 字段
              &middot; {report.overall_health_pct}% 健康
            </div>
            <div className="text-xs text-[var(--text-muted)] flex flex-wrap items-center gap-2 mt-0.5">
              <span>耗时 {report.check_duration_ms}ms</span>
              {diff.last_checked_at && (
                <>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    vs 上次：
                    {diff.new_issues > 0 && (
                      <span className="text-red-500">+{diff.new_issues} 新异常</span>
                    )}
                    {diff.resolved_issues > 0 && (
                      <span className="text-emerald-500"> {diff.resolved_issues} 已修复</span>
                    )}
                    {diff.new_issues === 0 && diff.resolved_issues === 0 && <span>无变化</span>}
                    <span className="ml-1">{trendIcon[diff.trend]}</span>
                  </span>
                </>
              )}
              {!diff.last_checked_at && <span className="text-amber-500">首次检查</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onRefresh} className="btn-secondary text-xs px-3 py-1.5">
            刷新检查
          </button>
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => onToggleAuto(e.target.checked)}
              className="rounded"
            />
            自动 30s
          </label>
        </div>
      </div>
    </div>
  );
}

// ── 管线状态条 ────────────────────────────────────────────────────────────────

function PipelineBar({ pipeline }: { pipeline: PipelineLayer[] }) {
  if (!pipeline || pipeline.length === 0) return null;
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1">
      {pipeline.map((layer, i) => (
        <Fragment key={layer.layer}>
          {i > 0 && <span className="text-[var(--text-muted)] shrink-0">→</span>}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 ${layerBadgeClass(layer.status)}`}
          >
            <span>{layer.layer}</span>
            <span className="font-mono text-[10px] opacity-75">{layer.detail}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

// ── 根因卡片 ──────────────────────────────────────────────────────────────────

function RootCauseCards({ causes }: { causes: RootCause[] }) {
  if (!causes || causes.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        根因诊断
      </h3>
      {causes.map((rc, i) => (
        <div
          key={i}
          className="card-base p-3 flex items-center justify-between gap-3 border-l-4 border-amber-400"
        >
          <div className="min-w-0">
            <span className="text-sm font-medium text-[var(--text-primary)]">{rc.cause}</span>
            <span className="ml-2 text-xs text-[var(--text-muted)]">
              → {rc.affected_fields} 字段受影响
            </span>
            {rc.sample_paths && rc.sample_paths.length > 0 && (
              <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 truncate">
                如：{rc.sample_paths.slice(0, 2).join(' / ')}
              </div>
            )}
          </div>
          {rc.remediation &&
            (rc.remediation.link ? (
              <a href={rc.remediation.link} className="btn-primary text-xs px-3 py-1 shrink-0">
                {rc.remediation.action}
              </a>
            ) : (
              <span className="text-xs text-[var(--text-muted)] shrink-0">
                {rc.remediation.manual}
              </span>
            ))}
        </div>
      ))}
    </div>
  );
}

// ── 数据时效 ──────────────────────────────────────────────────────────────────

function FreshnessSection({ freshness }: { freshness: DataFreshness[] }) {
  if (!freshness || freshness.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        数据时效
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
            f.status === 'fresh' ? '新鲜' : f.status === 'stale' ? '偏旧' : '过期';
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

function FieldTable({ fields }: { fields: FieldCheck[] }) {
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
                ? `全部 (${fields.length})`
                : f === 'warn'
                  ? `异常 (${warnCount})`
                  : `null (${nullCount})`}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="搜索字段路径…"
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
              <th className="slide-th text-left">路径</th>
              <th className="slide-th text-center w-16">类型</th>
              <th className="slide-th text-left">值预览</th>
              <th className="slide-th text-center w-10">状态</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="slide-td text-center text-[var(--text-muted)] py-4">
                  无匹配字段
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
                    title="点击复制路径"
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
        显示 {filtered.length} / {fields.length} 字段
      </p>
    </div>
  );
}

// ── L2 端点列表 ───────────────────────────────────────────────────────────────

function EndpointList({ endpoints }: { endpoints: EndpointResult[] }) {
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
                <span>{ep.total_fields} 字段</span>
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
            {isExpanded && ep.fields && ep.fields.length > 0 && <FieldTable fields={ep.fields} />}
            {isExpanded && (!ep.fields || ep.fields.length === 0) && (
              <div className="px-6 py-3 bg-[var(--bg-subtle)] text-xs text-[var(--text-muted)]">
                {ep.error ? `请求失败：${ep.error}` : '无字段数据'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── L1 模块卡片组 ─────────────────────────────────────────────────────────────

function ModuleCards({ modules }: { modules: ModuleResult[] }) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  if (!modules || modules.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        模块检查
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
                <span className="text-sm font-medium text-[var(--text-primary)]">{mod.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] shrink-0">
                <span>{mod.endpoints.length} 端点</span>
                <span>{mod.total_fields.toLocaleString()} 字段</span>
                {mod.null_fields > 0 && (
                  <span className="text-amber-500">{mod.null_fields} null</span>
                )}
                <span>{isExpanded ? '▾' : '▸'}</span>
              </div>
            </button>

            {/* L2 端点详情 */}
            {isExpanded && <EndpointList endpoints={mod.endpoints} />}
          </div>
        );
      })}
    </div>
  );
}

// ── 跨端点一致性 ──────────────────────────────────────────────────────────────

function CrossChecks({ checks }: { checks: CrossCheck[] }) {
  if (!checks || checks.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        跨端点一致性
      </h3>
      {checks.map((c, i) => (
        <div
          key={i}
          className={`card-base p-3 border-l-4 ${c.passed ? 'border-emerald-400' : 'border-red-400'}`}
        >
          <span className="text-sm text-[var(--text-primary)]">{c.name}</span>
          {c.note && <span className="ml-2 text-xs text-[var(--text-muted)]">{c.note}</span>}
        </div>
      ))}
    </div>
  );
}

// ── 前端错误 ──────────────────────────────────────────────────────────────────

function FrontendErrorsSection({ errors }: { errors: FrontendErrors }) {
  if (!errors || errors.last_24h === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
        前端错误（24h）
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
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data, isLoading, error, mutate } = useSWR<DataHealthReport>(
    '/api/data-health/data-quality',
    swrFetcher,
    { refreshInterval: autoRefresh ? 30000 : 0 }
  );

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader />

      {isLoading && <LoadingState />}

      {error && !isLoading && <ErrorState onRetry={() => mutate()} />}

      {!isLoading && !error && !data && (
        <div className="card-base flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-base font-semibold text-[var(--text-secondary)]">暂无诊断数据</p>
          <p className="text-sm text-[var(--text-muted)]">
            后端需实现 GET /api/data-health/data-quality 端点
          </p>
          <button onClick={() => mutate()} className="btn-secondary">
            重试
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
          />
          <PipelineBar pipeline={data.pipeline_status} />
          <RootCauseCards causes={data.root_causes} />
          <FreshnessSection freshness={data.data_freshness} />
          <ModuleCards modules={data.modules} />
          <CrossChecks checks={data.cross_checks} />
          <FrontendErrorsSection errors={data.frontend_errors} />
        </>
      )}
    </div>
  );
}
