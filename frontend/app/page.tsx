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

interface OverviewResponse {
  metrics: Record<string, number | string | null>;
  data_sources: { id: string; name: string; has_file: boolean; row_count: number }[];
  time_progress?: TimeProgressInfo;
  kpi_pace?: Record<string, KpiPaceItem | null>;
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

      {/* 数据源状态 */}
      <Card title="数据源状态">
        <DataSourceSection sources={fullSources ?? []} />
      </Card>
    </div>
  );
}
