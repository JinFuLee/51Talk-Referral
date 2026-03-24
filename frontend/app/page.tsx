'use client';

import useSWR from 'swr';
import { useState, useMemo } from 'react';
import { swrFetcher } from '@/lib/api';
import { formatRevenue, formatRate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/shared/StatCard';
import { PercentBar } from '@/components/shared/PercentBar';
import { useIndicatorMatrix } from '@/lib/hooks/useIndicatorMatrix';
import { useDataSources } from '@/lib/hooks';
import type { AttributionSummary } from '@/lib/types/cross-analysis';
import type { IndicatorCategory } from '@/lib/types/indicator-matrix';
import { CATEGORY_LABELS_ZH } from '@/lib/types/indicator-matrix';
import { DataSourceSection } from '@/components/datasources/DataSourceSection';

/* ── 岗位视角类型 ──────────────────────────────────────────────── */

type RoleView = 'all' | 'CC' | 'SS' | 'LP';

const ROLE_LABELS: Record<RoleView, string> = {
  all: '全部',
  CC: 'CC 前端',
  SS: 'SS 后端',
  LP: 'LP 服务',
};

/* ── 岗位筛选器 ─────────────────────────────────────────────────── */

function RoleFilter({ value, onChange }: { value: RoleView; onChange: (v: RoleView) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {(Object.keys(ROLE_LABELS) as RoleView[]).map((role) => (
        <button
          key={role}
          onClick={() => onChange(role)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            value === role
              ? 'bg-[var(--text-primary)] text-[var(--bg-surface)]'
              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
          }`}
        >
          {ROLE_LABELS[role]}
        </button>
      ))}
    </div>
  );
}

/* ── 指标矩阵摘要卡片 ──────────────────────────────────────────── */

function IndicatorMatrixSummary({ role }: { role: RoleView }) {
  const { registry, matrix, isLoading } = useIndicatorMatrix();

  if (isLoading) return null;
  if (role === 'all' || !matrix) return null;

  const activeIds = new Set(matrix[role as 'CC' | 'SS' | 'LP'].active);
  const activeIndicators = registry.filter((ind) => activeIds.has(ind.id));

  // 按分类汇总
  const categoryCount = activeIndicators.reduce<Record<IndicatorCategory, number>>(
    (acc, ind) => {
      acc[ind.category] = (acc[ind.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<IndicatorCategory, number>
  );

  const categories = Object.entries(categoryCount) as [IndicatorCategory, number][];

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--text-primary)]">
          {ROLE_LABELS[role]} 活跃指标
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          共{' '}
          <span className="font-semibold text-[var(--text-primary)]">
            {activeIndicators.length}
          </span>{' '}
          项
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map(([cat, count]) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)]"
          >
            {CATEGORY_LABELS_ZH[cat]}
            <span className="font-semibold text-[var(--text-primary)]">{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── 后端实际返回结构 ────────────────────────────────────────────── */

interface TimeProgressInfo {
  today: string;
  month_start: string;
  month_end: string;
  elapsed_workdays: number;
  remaining_workdays: number;
  total_workdays: number;
  time_progress: number; // 0~1
  elapsed_calendar_days: number;
  total_calendar_days: number;
}

interface KpiPaceItem {
  actual: number | null;
  target: number | null;
  daily_avg: number | null;
  pace_daily_needed: number | null;
}

interface KPI8Item {
  actual: number | null;
  target: number | null;
  absolute_gap: number | null;
  pace_gap: number | null;
  remaining_daily_avg: number | null;
  pace_daily_needed: number | null;
  efficiency_needed: number | null;
  current_daily_avg: number | null;
}

interface D2bSummary {
  total_students: number | null;
  new_coefficient: number | null;
  cargo_ratio: number | null;
  participation_count: number | null;
  participation_rate: number | null;
  checkin_rate: number | null;
  cc_reach_rate: number | null;
}

interface OverviewResponse {
  metrics: Record<string, number | string | null>;
  data_sources: { id: string; name: string; has_file: boolean; row_count: number }[];
  time_progress?: TimeProgressInfo;
  kpi_pace?: Record<string, KpiPaceItem | null>;
  kpi_8item?: Record<string, KPI8Item | null>;
  d2b_summary?: D2bSummary | null;
}

/* ── KPI 8项卡片 ─────────────────────────────────────────────── */

interface KPI8CardProps {
  label: string;
  item: KPI8Item;
  format?: 'currency' | 'count';
}

function fmt8(v: number | null, format: 'currency' | 'count' = 'count'): string {
  if (v === null || v === undefined) return '—';
  if (format === 'currency') return formatRevenue(v);
  return v % 1 === 0 ? v.toLocaleString() : v.toFixed(1);
}

function gapColor(v: number | null): string {
  if (v === null) return 'text-[var(--text-muted)]';
  if (v > 0) return 'text-green-600';
  if (v < 0) return 'text-red-500';
  return 'text-[var(--text-secondary)]';
}

// KPI8 各行的 L1 副标题说明
const KPI8_SUBTITLES: Record<string, string> = {
  时间进度差: '实际达成率 - 时间进度，正值=跑赢进度线，负值=落后于时间',
  达标需日均: '完成月目标每天需新增量，基于剩余工作日均摊',
  追进度需日均: '追上时间进度线每天需新增量（比达标更紧迫）',
  效率提升需求: '当前日均速度需提升的百分比才能完成月目标',
};

function KPI8Card({ label, item, format = 'count' }: KPI8CardProps) {
  const rows: { label: string; value: string; colorFn?: (v: number | null) => string }[] = [
    { label: '当前实际', value: fmt8(item.actual, format) },
    { label: '本月目标', value: fmt8(item.target, format) },
    { label: '目标绝对差', value: fmt8(item.absolute_gap, format), colorFn: gapColor },
    {
      label: '时间进度差',
      value: item.pace_gap !== null ? `${(item.pace_gap * 100).toFixed(1)}%` : '—',
      colorFn: gapColor,
    },
    { label: '达标需日均', value: fmt8(item.remaining_daily_avg, format) },
    { label: '追进度需日均', value: fmt8(item.pace_daily_needed, format) },
    {
      label: '效率提升需求',
      value:
        item.efficiency_needed !== null ? `${(item.efficiency_needed * 100).toFixed(1)}%` : '—',
    },
    { label: '当前日均', value: fmt8(item.current_daily_avg, format) },
  ];

  return (
    <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] shadow-[var(--shadow-subtle)] p-3">
      <p className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col">
            <span className="text-[10px] text-[var(--text-muted)]" title={KPI8_SUBTITLES[r.label]}>
              {r.label}
            </span>
            <span
              className={`text-sm font-mono tabular-nums font-semibold ${
                r.colorFn
                  ? r.colorFn(
                      r.label === '时间进度差'
                        ? item.pace_gap
                        : r.label === '目标绝对差'
                          ? item.absolute_gap
                          : null
                    )
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {r.value}
            </span>
            {KPI8_SUBTITLES[r.label] && (
              <span className="text-[9px] text-[var(--text-muted)] leading-tight mt-0.5 opacity-70">
                {KPI8_SUBTITLES[r.label]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 效率类 RateCard8（5 项） ─────────────────────────────────── */

interface RateCard8Props {
  label: string;
  actual: number | null;
  target: number | null;
  lossDesc?: string;
  rootCause?: string;
}

function RateCard8({ label, actual, target, lossDesc, rootCause }: RateCard8Props) {
  const pct = actual !== null ? Math.round(actual * 100) : null;
  const targetPct = target !== null ? Math.round(target * 100) : null;
  const gap = actual !== null && target !== null ? actual - target : null;

  const gapClass =
    gap === null ? 'text-[var(--text-muted)]' : gap >= 0 ? 'text-green-600' : 'text-red-500';

  return (
    <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] shadow-[var(--shadow-subtle)] p-3">
      <p className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-[var(--text-muted)]">实际率</span>
          <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">
            {pct !== null ? `${pct}%` : '—'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-[var(--text-muted)]">目标率</span>
          <span className="text-sm font-mono font-semibold text-[var(--text-secondary)]">
            {targetPct !== null ? `${targetPct}%` : '—'}
          </span>
        </div>
        <div className="flex flex-col col-span-2">
          <span className="text-[10px] text-[var(--text-muted)]">目标差</span>
          <span className={`text-sm font-mono font-semibold ${gapClass}`}>
            {gap !== null ? `${gap >= 0 ? '+' : ''}${(gap * 100).toFixed(1)}%` : '—'}
          </span>
        </div>
      </div>
      {lossDesc && <p className="text-[10px] text-red-500 mt-1 leading-relaxed">{lossDesc}</p>}
      {rootCause && (
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-relaxed">{rootCause}</p>
      )}
    </div>
  );
}

/* ── KPI 8 项展示区 ──────────────────────────────────────────── */

const KPI8_DEFS: { key: string; label: string; format?: 'currency' | 'count' }[] = [
  { key: 'register', label: '注册数' },
  { key: 'appointment', label: '预约数' },
  { key: 'showup', label: '出席数' },
  { key: 'paid', label: '付费数' },
  { key: 'revenue', label: '业绩 (USD)', format: 'currency' },
];

function KPI8Section({ kpi8item }: { kpi8item: Record<string, KPI8Item | null> }) {
  const defs = KPI8_DEFS.filter((d) => kpi8item[d.key]);
  if (defs.length === 0) return null;

  return (
    <Card title="KPI 指标（8 项全维度）">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {defs.map(({ key, label, format }) => {
          const item = kpi8item[key];
          if (!item) return null;
          return <KPI8Card key={key} label={label} item={item} format={format} />;
        })}
      </div>
    </Card>
  );
}

/* ── KPI 卡片定义 ─────────────────────────────────────────────── */

interface KpiCardDef {
  key: string;
  label: string;
  format?: 'rate' | 'currency';
  targetKey?: string; // 对应目标字段 key
  paceKey?: string; // 对应 kpi_pace key
}

const KPI_CARDS: KpiCardDef[] = [
  { key: '转介绍注册数', label: '注册', paceKey: 'register' },
  { key: '预约数', label: '预约', paceKey: 'appointment' },
  { key: '出席数', label: '出席', paceKey: 'showup' },
  { key: '转介绍付费数', label: '付费', targetKey: '转介绍基础业绩单量标', paceKey: 'paid' },
  {
    key: '总带新付费金额USD',
    label: '业绩 (USD)',
    format: 'currency',
    targetKey: '转介绍基础业绩标USD',
    paceKey: 'revenue',
  },
  { key: '客单价', label: '客单价', format: 'currency', targetKey: '转介绍基础业绩客单价标USD' },
  { key: '注册转化率', label: '注册转化率', format: 'rate' },
];

const RATE_PAIRS: { from: string; to: string; rateKey: string }[] = [
  { from: '转介绍注册数', to: '预约数', rateKey: '注册预约率' },
  { from: '预约数', to: '出席数', rateKey: '预约出席率' },
  { from: '出席数', to: '转介绍付费数', rateKey: '出席付费率' },
];

function num(v: unknown): number {
  return typeof v === 'number' ? v : 0;
}

/* ── 时间进度信息条 ────────────────────────────────────────────── */

function TimeProgressBar({ tp }: { tp: TimeProgressInfo }) {
  const pct = Math.round(tp.time_progress * 100);
  const month = tp.month_start.slice(0, 7).replace('-', ' 年 ') + ' 月';

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--text-secondary)]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="font-medium text-[var(--text-primary)]">时间进度</span>
        <span className="text-[var(--text-muted)]">{month}</span>
      </div>

      {/* 进度条 */}
      <div className="relative h-2 rounded-full bg-[var(--border)] overflow-hidden mb-2">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* 数字信息行 */}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <span>
          今日 <span className="font-medium text-[var(--text-primary)]">{tp.today}</span>
        </span>
        <span>
          已过工作日{' '}
          <span className="font-medium text-[var(--text-primary)]">{tp.elapsed_workdays}</span> /{' '}
          {tp.total_workdays}
        </span>
        <span>
          剩余工作日{' '}
          <span className="font-medium text-[var(--text-primary)]">{tp.remaining_workdays}</span>
        </span>
        <span>
          时间进度{' '}
          <span
            className={`font-semibold ${pct >= 80 ? 'text-red-500' : pct >= 50 ? 'text-amber-500' : 'text-blue-500'}`}
          >
            {pct}%
          </span>
        </span>
      </div>
    </div>
  );
}

/* ── 追进度需日均信息行（漏斗下方） ───────────────────────────────── */

interface PaceRowProps {
  kpiPace: Record<string, KpiPaceItem | null>;
  timeProgress: number;
}

const PACE_LABELS: { key: string; label: string; format?: 'currency' }[] = [
  { key: 'register', label: '注册日均需' },
  { key: 'appointment', label: '预约日均需' },
  { key: 'showup', label: '出席日均需' },
  { key: 'paid', label: '付费日均需' },
  { key: 'revenue', label: '业绩日均需', format: 'currency' },
];

function PaceRow({ kpiPace, timeProgress }: PaceRowProps) {
  const items = PACE_LABELS.map(({ key, label, format }) => {
    const item = kpiPace[key];
    if (!item || item.pace_daily_needed === null) return null;
    const needed = item.pace_daily_needed;
    const avg = item.daily_avg ?? 0;
    // 当前日均是否落后（日均 < 追进度需日均 → 落后）
    const isBehind = avg < needed - 0.001;
    const display = format === 'currency' ? formatRevenue(needed) : needed.toFixed(1);
    return { key, label, display, isBehind };
  }).filter(Boolean) as { key: string; label: string; display: string; isBehind: boolean }[];

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 px-1 pt-1 text-xs">
      {items.map(({ key, label, display, isBehind }) => (
        <span key={key} className="flex items-center gap-1">
          <span className="text-[var(--text-muted)]">{label}</span>
          <span className={`font-semibold ${isBehind ? 'text-red-500' : 'text-emerald-600'}`}>
            {display}
          </span>
        </span>
      ))}
      <span className="text-[var(--text-muted)] ml-auto">
        （追进度时间进度 {Math.round(timeProgress * 100)}%）
      </span>
    </div>
  );
}

/* ── 漏斗转化率条（含进度对比） ──────────────────────────────────── */

function FunnelSnapshot({
  metrics,
  timeProgress,
}: {
  metrics: Record<string, number | string | null>;
  timeProgress: number;
}) {
  return (
    <div className="space-y-3">
      {RATE_PAIRS.map(({ from, to, rateKey }) => {
        const rate = num(metrics[rateKey]);
        return (
          <div key={rateKey}>
            <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
              <span>
                {from.replace('转介绍', '').replace('数', '')} → {to.replace('数', '')}
              </span>
              <span className="font-medium">{formatRate(rate)}</span>
            </div>
            <PercentBar value={rate * 100} max={100} />
          </div>
        );
      })}
    </div>
  );
}

/* ── 月度目标达成环形进度 ──────────────────────────────────────── */

interface RingProps {
  label: string;
  value: number; // 0~1
  color: string;
}

function RingProgress({ label, value, color }: RingProps) {
  const pct = Math.min(Math.round(value * 100), 100);
  const radius = 28;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * pct) / 100;

  const textColor =
    value >= 1 ? 'text-green-600' : value >= 0.8 ? 'text-yellow-600' : 'text-red-500';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke="var(--border-default, #e5e7eb)"
            strokeWidth={stroke}
          />
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${textColor}`}
        >
          {pct}%
        </span>
      </div>
      <span className="text-[11px] text-[var(--text-secondary)] text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

function MonthlyAchievementSection() {
  const { data, isLoading } = useSWR<AttributionSummary>('/api/attribution/summary', swrFetcher);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Spinner size="sm" />
        <span className="text-xs text-[var(--text-muted)]">加载月度达成...</span>
      </div>
    );
  }

  if (!data) return null;

  const rings: RingProps[] = [
    { label: '单量达成率', value: data.unit_achievement_rate ?? 0, color: '#6366f1' },
    { label: '业绩达成率', value: data.revenue_achievement_rate ?? 0, color: '#10b981' },
    { label: '客单价达成率', value: data.order_value_achievement_rate ?? 0, color: '#f59e0b' },
  ];

  return (
    <Card title="月度目标达成">
      <div className="flex items-center justify-around py-2">
        {rings.map((r) => (
          <RingProgress key={r.label} {...r} />
        ))}
      </div>
    </Card>
  );
}

/* ── KPI 卡片对应的指标 ID（与 overview API metrics key 对应） ──── */

const KPI_CARD_INDICATOR_IDS: Record<string, string[]> = {
  CC: [
    '转介绍注册数',
    '预约数',
    '出席数',
    '转介绍付费数',
    '总带新付费金额USD',
    '客单价',
    '注册转化率',
  ],
  SS: ['转介绍注册数', '触达率', '打卡率'],
  LP: ['转介绍注册数', '触达率', '打卡率'],
};

/* ── 主页面 ───────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [roleView, setRoleView] = useState<RoleView>('all');
  const { data, isLoading, error } = useSWR<OverviewResponse>('/api/overview', swrFetcher);
  const { data: fullSources } = useDataSources();

  // 根据岗位视角过滤 KPI 卡片（all = 全部显示）
  const visibleKpiCards = useMemo(() => {
    if (roleView === 'all') return KPI_CARDS;
    const allowedKeys = new Set(KPI_CARD_INDICATOR_IDS[roleView] ?? []);
    return KPI_CARDS.filter((c) => allowedKeys.has(c.key));
  }, [roleView]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState title="数据加载失败" description="无法获取概览数据，请检查后端服务是否正常运行" />
    );
  }

  const metrics = data?.metrics ?? {};
  const sources = data?.data_sources ?? [];
  const tp = data?.time_progress;
  const kpiPace = data?.kpi_pace ?? {};
  const d2b = data?.d2b_summary;
  const hasMetrics = Object.keys(metrics).length > 0;

  if (!hasMetrics && sources.length === 0) {
    return <EmptyState title="暂无数据" description="请先上传数据文件，然后刷新页面" />;
  }

  const allSourcesOk = sources.length > 0 && sources.every((s) => s.has_file);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">运营总览</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            转介绍漏斗达成情况 · 数据源状态
          </p>
        </div>
        {/* 岗位视角筛选器 */}
        <RoleFilter value={roleView} onChange={setRoleView} />
      </div>

      {/* 指标矩阵摘要（仅 SS/LP 视角时显示） */}
      <IndicatorMatrixSummary role={roleView} />

      {/* 时间进度信息条 */}
      {tp && <TimeProgressBar tp={tp} />}

      {/* KPI 卡片 */}
      {hasMetrics && (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleKpiCards.map(({ key, label, format, targetKey, paceKey }) => {
            const v = num(metrics[key]);
            const display =
              format === 'currency'
                ? formatRevenue(v)
                : format === 'rate'
                  ? formatRate(v)
                  : v.toLocaleString();

            const targetRaw = targetKey != null ? num(metrics[targetKey]) : undefined;
            const targetDisplay =
              targetRaw != null && targetRaw > 0
                ? format === 'currency'
                  ? formatRevenue(targetRaw)
                  : format === 'rate'
                    ? formatRate(targetRaw)
                    : targetRaw.toLocaleString()
                : undefined;
            const achievement = targetRaw != null && targetRaw > 0 ? v / targetRaw : undefined;

            // 是否落后时间进度（达成率 < 时间进度）
            const isBehindTime = tp && achievement != null && achievement < tp.time_progress;

            return (
              <StatCard
                key={key}
                label={label}
                value={display}
                target={targetDisplay}
                achievement={achievement}
                highlight={isBehindTime ? 'warn' : undefined}
              />
            );
          })}
        </div>
      )}

      {/* KPI 8 项全维度 */}
      {data?.kpi_8item && Object.keys(data.kpi_8item).length > 0 && (
        <KPI8Section kpi8item={data.kpi_8item} />
      )}

      {/* 漏斗转化率 */}
      <Card title="漏斗转化率">
        {!hasMetrics ? (
          <EmptyState title="暂无漏斗数据" description="上传数据后自动刷新" />
        ) : (
          <>
            <FunnelSnapshot metrics={metrics} timeProgress={tp?.time_progress ?? 0} />
            {/* 追进度需日均行 */}
            {tp && Object.keys(kpiPace).length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <PaceRow kpiPace={kpiPace} timeProgress={tp.time_progress} />
              </div>
            )}
          </>
        )}
      </Card>

      {/* 月度目标达成 */}
      <MonthlyAchievementSection />

      {/* D2b 全站基准 */}
      {d2b && (
        <Card title="全站基准（D2b）">
          <p className="text-[11px] text-[var(--text-muted)] mb-3">
            全站学员参与效率快照 · 财务模型参与率与运营口径相同（待确认）
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {[
              {
                label: '有效学员数',
                value: (d2b.total_students ?? 0).toLocaleString(),
                subtitle: '已付费且在有效期内的学员，是本月转介绍运营的基数',
              },
              {
                label: '带新系数',
                value: d2b.new_coefficient != null ? d2b.new_coefficient.toFixed(2) : '—',
                subtitle: '每个参与的A学员平均带来的B注册数，>2为优质',
              },
              {
                label: '带货比',
                value: d2b.cargo_ratio != null ? d2b.cargo_ratio.toFixed(2) : '—',
                subtitle: '带来注册的学员数/有效学员总数，衡量整体转介绍渗透率',
              },
              {
                label: '带新参与数',
                value:
                  d2b.participation_count != null ? d2b.participation_count.toLocaleString() : '—',
                subtitle: '带来≥1个注册的有效学员数',
              },
              {
                label: '参与率',
                value:
                  d2b.participation_rate != null
                    ? `${(d2b.participation_rate * 100).toFixed(1)}%`
                    : '—',
                subtitle: '带来注册的学员/有效学员总数',
              },
              {
                label: '打卡率',
                value: d2b.checkin_rate != null ? `${(d2b.checkin_rate * 100).toFixed(1)}%` : '—',
                subtitle: '转码且分享的学员/有效学员，绿≥50%，橙30-50%，红<30%',
              },
              {
                label: 'CC触达率',
                value: d2b.cc_reach_rate != null ? `${(d2b.cc_reach_rate * 100).toFixed(1)}%` : '—',
                subtitle: 'CC有效通话(≥120s)学员数/有效学员总数',
              },
            ].map(({ label, value, subtitle }) => (
              <div
                key={label}
                className="bg-[var(--bg-subtle)] rounded-lg px-3 py-2.5 flex flex-col gap-0.5"
              >
                <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
                <span className="text-base font-bold font-mono tabular-nums text-[var(--text-primary)]">
                  {value}
                </span>
                <span className="text-[9px] text-[var(--text-muted)] leading-tight opacity-75">
                  {subtitle}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 数据源状态 */}
      <Card title="数据源状态">
        <DataSourceSection sources={fullSources ?? []} />
      </Card>
    </div>
  );
}
