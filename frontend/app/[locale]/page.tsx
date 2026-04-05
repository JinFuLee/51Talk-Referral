'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, useMemo } from 'react';

/* ── 多语言 ─────────────────────────────────────────────────── */
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { formatRevenue, formatRate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/shared/StatCard';
import { PercentBar } from '@/components/shared/PercentBar';
import { useIndicatorMatrix } from '@/lib/hooks/useIndicatorMatrix';
import { useDataSources } from '@/lib/hooks';
import type { AttributionSummary } from '@/lib/types/cross-analysis';
import type { IndicatorCategory } from '@/lib/types/indicator-matrix';
import { CATEGORY_LABELS_ZH, CATEGORY_LABELS_TH } from '@/lib/types/indicator-matrix';
import { DataSourceSection } from '@/components/datasources/DataSourceSection';
import { AnomalyBanner } from '@/components/dashboard/AnomalyBanner';
import { DecisionSummary } from '@/components/dashboard/DecisionSummary';
import { PersonalWorkbench } from '@/components/dashboard/PersonalWorkbench';
import { KnowledgeLink } from '@/components/ui/KnowledgeLink';
import { BmComparisonTable } from '@/components/dashboard/BmComparisonTable';
import { OverviewSummaryCards } from '@/components/dashboard/OverviewSummaryCards';
import type { BmComparison } from '@/lib/types/bm-calendar';

/* ── 岗位视角类型 ──────────────────────────────────────────────── */

type RoleView = 'all' | 'CC' | 'SS' | 'LP';

const ROLE_VIEW_KEYS: RoleView[] = ['all', 'CC', 'SS', 'LP'];

/* ── 岗位筛选器 ─────────────────────────────────────────────────── */
function RoleFilter({
  value,
  onChange,
  t,
}: {
  value: RoleView;
  onChange: (v: RoleView) => void;
  t: (key: string, params?: any) => string;
}) {
  const roleLabels: Record<RoleView, string> = {
    all: t('roleAll'),
    CC: t('roleCCFront'),
    SS: t('roleSSBack'),
    LP: t('roleLPService'),
  };
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {ROLE_VIEW_KEYS.map((role) => (
        <button
          key={role}
          onClick={() => onChange(role)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            value === role ? 'bg-n-900 text-white' : 'bg-subtle text-secondary-token hover:bg-n-200'
          }`}
        >
          {roleLabels[role]}
        </button>
      ))}
    </div>
  );
}

/* ── 指标矩阵摘要卡片 ──────────────────────────────────────────── */

function IndicatorMatrixSummary({
  role,
  t,
  locale,
}: {
  role: RoleView;
  t: (key: string, params?: any) => string;
  locale: string;
}) {
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
  const categoryLabels = locale === 'th' ? CATEGORY_LABELS_TH : CATEGORY_LABELS_ZH;

  const roleLabels: Record<RoleView, string> = {
    all: t('roleAll'),
    CC: t('roleCCFront'),
    SS: t('roleSSBack'),
    LP: t('roleLPService'),
  };

  return (
    <div className="rounded-lg border border-default-token bg-subtle px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-primary-token">
          {roleLabels[role]} {t('activeIndicatorsLabel')}
        </span>
        <span className="text-xs text-muted-token">
          {t('totalCount')}{' '}
          <span className="font-semibold text-primary-token">{activeIndicators.length}</span>{' '}
          {t('itemsCount')}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map(([cat, count]) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-surface border border-default-token text-secondary-token"
          >
            {categoryLabels[cat]}
            <span className="font-semibold text-primary-token">{count}</span>
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
  /** 7 天 sparkline 数据，key = pace key（register/appointment/showup/paid/revenue） */
  kpi_sparklines?: Record<string, (number | null)[]>;
  /** MoM 环比变化率，key = pace key */
  kpi_mom?: Record<string, number | null>;
  /** BM 节奏对比数据 */
  bm_comparison?: BmComparison;
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
  if (v === null) return 'text-muted-token';
  if (v > 0) return 'text-success-token';
  if (v < 0) return 'text-danger-token';
  return 'text-secondary-token';
}

function KPI8Card({ label, item, format = 'count', t }: KPI8CardProps & { t: (key: string, params?: any) => string }) {
  // row key → subtitle key in t
  const subtitleMap: Record<string, string> = {
    paceGap: t('sub_paceGap'),
    remainDailyAvg: t('sub_remainDailyAvg'),
    paceDailyNeeded: t('sub_paceDailyNeeded'),
    efficiencyNeeded: t('sub_efficiencyNeeded'),
  };

  const rows: {
    key: string;
    label: string;
    value: string;
    colorFn?: (v: number | null) => string;
  }[] = [
    { key: 'currentActual', label: t('row_currentActual'), value: fmt8(item.actual, format) },
    { key: 'monthTarget', label: t('row_monthTarget'), value: fmt8(item.target, format) },
    {
      key: 'absoluteGap',
      label: t('row_absoluteGap'),
      value: fmt8(item.absolute_gap, format),
      colorFn: gapColor,
    },
    {
      key: 'paceGap',
      label: t('row_paceGap'),
      value: item.pace_gap !== null ? formatRate(item.pace_gap) : '—',
      colorFn: gapColor,
    },
    {
      key: 'remainDailyAvg',
      label: t('row_remainDailyAvg'),
      value: fmt8(item.remaining_daily_avg, format),
    },
    {
      key: 'paceDailyNeeded',
      label: t('row_paceDailyNeeded'),
      value: fmt8(item.pace_daily_needed, format),
    },
    {
      key: 'efficiencyNeeded',
      label: t('row_efficiencyNeeded'),
      value: item.efficiency_needed !== null ? formatRate(item.efficiency_needed) : '—',
    },
    {
      key: 'currentDailyAvg',
      label: t('row_currentDailyAvg'),
      value: fmt8(item.current_daily_avg, format),
    },
  ];

  return (
    <div className="card-base p-3">
      <p className="text-xs font-semibold text-primary-token uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {rows.map((r) => (
          <div key={r.key} className="flex flex-col">
            <span className="text-[10px] text-muted-token" title={subtitleMap[r.key]}>
              {r.label}
            </span>
            <span
              className={`text-sm font-mono tabular-nums font-semibold ${
                r.colorFn
                  ? r.colorFn(
                      r.key === 'paceGap'
                        ? item.pace_gap
                        : r.key === 'absoluteGap'
                          ? item.absolute_gap
                          : null
                    )
                  : 'text-primary-token'
              }`}
            >
              {r.value}
            </span>
            {subtitleMap[r.key] && (
              <span className="text-[9px] text-muted-token leading-tight mt-0.5 opacity-70">
                {subtitleMap[r.key]}
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

function RateCard8({
  label,
  actual,
  target,
  lossDesc,
  rootCause,
  t,
}: RateCard8Props & { t: (key: string, params?: any) => string }) {
  const pct = actual !== null ? Math.round(actual * 100) : null;
  const targetPct = target !== null ? Math.round(target * 100) : null;
  const gap = actual !== null && target !== null ? actual - target : null;

  const gapClass =
    gap === null ? 'text-muted-token' : gap >= 0 ? 'text-success-token' : 'text-danger-token';

  return (
    <div className="card-base p-3">
      <p className="text-xs font-semibold text-primary-token uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-token">{t('rateActual')}</span>
          <span className="text-sm font-mono font-semibold text-primary-token">
            {pct !== null ? `${pct}%` : '—'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-token">{t('rateTarget')}</span>
          <span className="text-sm font-mono font-semibold text-secondary-token">
            {targetPct !== null ? `${targetPct}%` : '—'}
          </span>
        </div>
        <div className="flex flex-col col-span-2">
          <span className="text-[10px] text-muted-token">{t('rateGap')}</span>
          <span className={`text-sm font-mono font-semibold ${gapClass}`}>
            {gap !== null ? `${gap >= 0 ? '+' : ''}${formatRate(Math.abs(gap))}` : '—'}
          </span>
        </div>
      </div>
      {lossDesc && <p className="text-[10px] text-danger-token mt-1 leading-relaxed">{lossDesc}</p>}
      {rootCause && (
        <p className="text-[10px] text-muted-token mt-0.5 leading-relaxed">{rootCause}</p>
      )}
    </div>
  );
}

/* ── KPI 8 项展示区 ──────────────────────────────────────────── */

function KPI8Section({ kpi8item, t }: { kpi8item: Record<string, KPI8Item | null>; t: (key: string, params?: any) => string }) {
  const kpi8Defs: { key: string; label: string; format?: 'currency' | 'count' }[] = [
    { key: 'register', label: t('kpi_register') },
    { key: 'appointment', label: t('kpi_appointment') },
    { key: 'showup', label: t('kpi_showup') },
    { key: 'paid', label: t('kpi_paid') },
    { key: 'revenue', label: t('kpi_revenue'), format: 'currency' },
  ];
  const defs = kpi8Defs.filter((d) => kpi8item[d.key]);
  if (defs.length === 0) return null;

  return (
    <Card title={t('kpi8CardTitle')}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {defs.map(({ key, label, format }) => {
          const item = kpi8item[key];
          if (!item) return null;
          return <KPI8Card key={key} label={label} item={item} format={format} t={t} />;
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
  knowledgeChapter?: string; // 知识库章节跳转
}

function getKpiCards(t: (key: string, params?: any) => string): KpiCardDef[] {
  return [
    {
      key: '转介绍注册数',
      label: t('kpi_register'),
      paceKey: 'register',
      knowledgeChapter: 'chapter-2',
    },
    {
      key: '预约数',
      label: t('kpi_appointment'),
      paceKey: 'appointment',
      knowledgeChapter: 'chapter-2',
    },
    { key: '出席数', label: t('kpi_showup'), paceKey: 'showup', knowledgeChapter: 'chapter-2' },
    {
      key: '转介绍付费数',
      label: t('kpi_paid'),
      targetKey: '转介绍基础业绩单量标',
      paceKey: 'paid',
      knowledgeChapter: 'chapter-4',
    },
    {
      key: '总带新付费金额USD',
      label: t('kpi_revenue'),
      format: 'currency',
      targetKey: '转介绍基础业绩标USD',
      paceKey: 'revenue',
      knowledgeChapter: 'chapter-4',
    },
    // AOV 和注册转化率已移至漏斗区域展示
  ];
}

const RATE_PAIRS: { from: string; to: string; rateKey: string }[] = [
  { from: '转介绍注册数', to: '预约数', rateKey: '注册预约率' },
  { from: '预约数', to: '出席数', rateKey: '预约出席率' },
  { from: '出席数', to: '转介绍付费数', rateKey: '出席付费率' },
];

function num(v: unknown): number {
  return typeof v === 'number' ? v : 0;
}

/* ── 时间进度信息条 ────────────────────────────────────────────── */

function TimeProgressBar({ tp, t }: { tp: TimeProgressInfo; t: (key: string, params?: any) => string }) {
  const pct = Math.round(tp.time_progress * 100);
  const [year, mon] = tp.month_start.slice(0, 7).split('-');
  const month = t('monthBarPct')
    ? `${year}${t('monthBarPct')}${mon}${t('monthBarSuffix')}`
    : `${year}-${mon}`;

  return (
    <div className="rounded-lg border border-default-token bg-surface-alt px-4 py-3 text-xs text-secondary-token">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="font-medium text-primary-token">{t('tp_timeProgress')}</span>
        <span className="text-muted-token">{month}</span>
      </div>

      {/* 进度条 */}
      <div className="relative h-2 rounded-full bg-n-200 overflow-hidden mb-2">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-action-accent transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* 数字信息行 */}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <span>
          {t('tp_today')} <span className="font-medium text-primary-token">{tp.today}</span>
        </span>
        <span>
          {t('tp_elapsedWorkdays')}{' '}
          <span className="font-medium text-primary-token">{tp.elapsed_workdays}</span> /{' '}
          {tp.total_workdays}
        </span>
        <span>
          {t('tp_remainingWorkdays')}{' '}
          <span className="font-medium text-primary-token">{tp.remaining_workdays}</span>
        </span>
        <span>
          {t('tp_timePct')}{' '}
          <span
            className={`font-semibold ${pct >= 80 ? 'text-danger-token' : pct >= 50 ? 'text-warning-token' : 'text-action-accent'}`}
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
  t: (key: string, params?: any) => string;
}

function PaceRow({ kpiPace, timeProgress, t }: PaceRowProps) {
  const paceLabels: { key: string; label: string; format?: 'currency' }[] = [
    { key: 'register', label: t('pace_register') },
    { key: 'appointment', label: t('pace_appointment') },
    { key: 'showup', label: t('pace_showup') },
    { key: 'paid', label: t('pace_paid') },
    { key: 'revenue', label: t('pace_revenue'), format: 'currency' },
  ];

  const items = paceLabels
    .map(({ key, label, format }) => {
      const item = kpiPace[key];
      if (!item || item.pace_daily_needed === null) return null;
      const needed = item.pace_daily_needed;
      const avg = item.daily_avg ?? 0;
      // 当前日均是否落后（日均 < 追进度需日均 → 落后）
      const isBehind = avg < needed - 0.001;
      const display = format === 'currency' ? formatRevenue(needed) : needed.toFixed(1);
      return { key, label, display, isBehind };
    })
    .filter(Boolean) as { key: string; label: string; display: string; isBehind: boolean }[];

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 px-1 pt-1 text-xs">
      {items.map(({ key, label, display, isBehind }) => (
        <span key={key} className="flex items-center gap-1">
          <span className="text-muted-token">{label}</span>
          <span className={`font-semibold ${isBehind ? 'text-danger-token' : 'text-action-text'}`}>
            {display}
          </span>
        </span>
      ))}
      <span className="text-muted-token ml-auto">
        {t('paceRowSuffix')}
        {Math.round(timeProgress * 100)}
        {t('paceRowSuffix2')}
      </span>
    </div>
  );
}

/* ── 漏斗转化率条（含进度对比） ──────────────────────────────────── */

function FunnelSnapshot({
  metrics,
  timeProgress,
  t,
}: {
  metrics: Record<string, number | string | null>;
  timeProgress: number;
  t: (key: string, params?: any) => string;
}) {
  const funnelLabelMap: Record<string, string> = {
    转介绍注册数: t('funnel_register'),
    预约数: t('funnel_appointment'),
    出席数: t('funnel_showup'),
    转介绍付费数: t('funnel_paid'),
  };

  return (
    <div className="space-y-4">
      {RATE_PAIRS.map(({ from, to, rateKey }) => {
        const rate = num(metrics[rateKey]);
        return (
          <div key={rateKey}>
            <div className="flex justify-between text-xs text-secondary-token mb-1">
              <span>
                {funnelLabelMap[from] ?? from} → {funnelLabelMap[to] ?? to}
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
    value >= 1 ? 'text-success-token' : value >= 0.8 ? 'text-warning-token' : 'text-danger-token';

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
      <span className="text-[11px] text-secondary-token text-center leading-tight">{label}</span>
    </div>
  );
}

function MonthlyAchievementSection({ t }: { t: (key: string, params?: any) => string }) {
  const { data, isLoading } = useFilteredSWR<AttributionSummary>('/api/attribution/summary');

  if (isLoading) {
    return (
      <Card title={t('monthlyAchCardTitle')}>
        <div className="flex items-center justify-around py-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full animate-pulse bg-n-200" />
              <div className="h-3 w-16 rounded animate-pulse bg-n-200" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const rings: RingProps[] = [
    { label: t('ring_unitAch'), value: data.unit_achievement_rate ?? 0, color: '#6366f1' },
    { label: t('ring_revAch'), value: data.revenue_achievement_rate ?? 0, color: '#10b981' },
    { label: t('ring_aovAch'), value: data.order_value_achievement_rate ?? 0, color: '#f59e0b' },
  ];

  return (
    <Card title={t('monthlyAchCardTitle')}>
      <div className="flex items-center justify-around py-2">
        {rings.map((r) => (
          <RingProgress key={r.label} {...r} />
        ))}
      </div>
      <p className="text-[10px] text-muted-token text-center mt-1">
        {t('colorHintFull')}
        <span className="text-success-token font-medium">{t('colorGreen100')}</span> ·{' '}
        <span className="text-warning-token font-medium">{t('colorOrange80')}</span> ·{' '}
        <span className="text-danger-token font-medium">{t('colorRed80')}</span>
      </p>
    </Card>
  );
}

/* ── KPI 卡片对应的指标 ID（与 overview API metrics key 对应） ──── */

const KPI_CARD_INDICATOR_IDS: Record<string, string[]> = {
  CC: ['转介绍注册数', '预约数', '出席数', '转介绍付费数', '总带新付费金额USD'],
  SS: ['转介绍注册数', '触达率', '打卡率'],
  LP: ['转介绍注册数', '触达率', '打卡率'],
};

/* ── 主页面 ───────────────────────────────────────────────────── */

export default function DashboardPage() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
    channel: true,
  });
  const locale = useLocale();
  const t = useTranslations('homePage');
  const [roleView, setRoleView] = useState<RoleView>('all');
  const { data, isLoading, error } = useFilteredSWR<OverviewResponse>('/api/overview');
  const { data: fullSources } = useDataSources();
  const KPI_CARDS = getKpiCards(t);

  // 根据岗位视角过滤 KPI 卡片（all = 全部显示）
  const visibleKpiCards = useMemo(() => {
    if (roleView === 'all') return KPI_CARDS;
    const allowedKeys = new Set(KPI_CARD_INDICATOR_IDS[roleView] ?? []);
    return KPI_CARDS.filter((c) => allowedKeys.has(c.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleView, t]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 animate-pulse rounded-md bg-n-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} className="h-24" />
          ))}
        </div>
        <SkeletonChart className="h-40 w-full" />
        <SkeletonChart className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-sm font-medium text-primary-token">{t('errLoadFailed')}</p>
        <p className="text-xs text-muted-token">{t('errLoadFailedDesc')}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-1 px-4 py-1.5 rounded-lg text-xs font-medium bg-subtle border border-default-token text-secondary-token hover:bg-n-200 transition-colors min-h-[44px] min-w-[44px]"
        >
          {t('btnRetry')}
        </button>
      </div>
    );
  }

  const metrics = data?.metrics ?? {};
  const sources = data?.data_sources ?? [];
  const tp = data?.time_progress;
  const kpiPace = data?.kpi_pace ?? {};
  const d2b = data?.d2b_summary;
  const kpiSparklines = data?.kpi_sparklines ?? {};
  const kpiMom = data?.kpi_mom ?? {};
  const hasMetrics = Object.keys(metrics).length > 0;

  if (!hasMetrics && sources.length === 0) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />;
  }

  const allSourcesOk = sources.length > 0 && sources.every((s) => s.has_file);

  return (
    <div className="space-y-5 md:space-y-6">
      {/* 异常警报横幅 */}
      {hasMetrics && (
        <AnomalyBanner
          paceGap={data?.kpi_8item?.paid?.pace_gap ?? data?.kpi_8item?.revenue?.pace_gap ?? null}
          checkinRate={d2b?.checkin_rate ?? null}
          achievementRate={
            data?.kpi_8item?.paid?.actual != null && data?.kpi_8item?.paid?.target
              ? (data.kpi_8item.paid.actual ?? 0) / (data.kpi_8item.paid.target ?? 1)
              : null
          }
          timeProgress={tp?.time_progress ?? null}
          worstMoM={(() => {
            const moms = ['register', 'paid', 'revenue']
              .map((k) => kpiMom[k] ?? null)
              .filter((v): v is number => v !== null);
            return moms.length > 0 ? Math.min(...moms) : null;
          })()}
          worstMoMLabel={(() => {
            const pairs: [string, string][] = [
              ['paid', t('mom_paid')],
              ['revenue', t('mom_revenue')],
              ['register', t('mom_register')],
            ];
            const worst = pairs.reduce<[string, string] | null>((acc, [k, label]) => {
              const v = kpiMom[k];
              if (v === undefined || v === null) return acc;
              if (!acc) return [k, label];
              const accV = kpiMom[acc[0]];
              return accV === undefined || accV === null || v < accV ? [k, label] : acc;
            }, null);
            return worst ? worst[1] : null;
          })()}
        />
      )}

      {/* 决策摘要横幅：一句话结论 + 关键瓶颈 */}
      {hasMetrics && (
        <DecisionSummary
          paidActual={data?.kpi_8item?.paid?.actual ?? null}
          paidTarget={data?.kpi_8item?.paid?.target ?? null}
          timeProgress={tp?.time_progress ?? null}
          checkinRate={d2b?.checkin_rate ?? null}
          participationRate={d2b?.participation_rate ?? null}
          revenueAchievementRate={null}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{t('pageHeader')}</h1>
          <p className="text-sm text-secondary-token mt-1">{t('pageHeaderSub')}</p>
        </div>
        {/* 岗位视角筛选器 */}
        <RoleFilter value={roleView} onChange={setRoleView} t={t} />
      </div>

      {/* 指标矩阵摘要（仅 SS/LP 视角时显示） */}
      <IndicatorMatrixSummary role={roleView} t={t} locale={locale} />

      {/* 时间进度信息条 */}
      {tp && <TimeProgressBar tp={tp} t={t} />}

      {/* KPI 卡片 */}
      {/* ── L0: 汇总 3 卡（业绩 → BM 节奏 → 时间&日均）── */}
      {data?.kpi_8item && (
        <OverviewSummaryCards
          kpi8item={data.kpi_8item}
          bmComparison={data.bm_comparison}
          timeProgress={tp}
        />
      )}

      {hasMetrics && (
        <>
          <p className="text-[10px] text-muted-token -mb-2">
            {t('achieveColorHint')}
            <span className="text-success-token font-medium">{t('colorGreen100')}</span> ·{' '}
            <span className="text-warning-token font-medium">{t('colorOrange80')}</span> ·{' '}
            <span className="text-danger-token font-medium">{t('colorRed80')}</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleKpiCards.map(({ key, label, format, targetKey, paceKey, knowledgeChapter }) => {
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

              // sparkline 与 MoM（通过 paceKey 关联）
              const sparkline = paceKey ? kpiSparklines[paceKey] : undefined;
              const momChange = paceKey ? kpiMom[paceKey] : undefined;

              return (
                <StatCard
                  key={key}
                  label={label}
                  value={display}
                  target={targetDisplay}
                  achievement={achievement}
                  highlight={isBehindTime ? 'warn' : undefined}
                  sparkline={sparkline}
                  momChange={momChange}
                  knowledgeChapter={knowledgeChapter}
                />
              );
            })}
          </div>
        </>
      )}

      {/* KPI 8 项全维度 — 已合并到 OverviewSummaryCards + BmComparisonTable */}

      {/* BM 节奏对比 */}
      {data?.bm_comparison && <BmComparisonTable data={data.bm_comparison} />}

      {/* 漏斗转化率 */}
      <Card title={t('funnelCardTitle')}>
        {!hasMetrics ? (
          <EmptyState title={t('funnelEmpty')} description={t('funnelEmptyDesc')} />
        ) : (
          <>
            <FunnelSnapshot metrics={metrics} timeProgress={tp?.time_progress ?? 0} t={t} />
            {/* AOV + 注册转化率（从 StatCard 移入漏斗区） */}
            <div className="mt-3 pt-3 border-t border-default-token flex flex-wrap gap-6 text-xs text-secondary-token">
              <span>
                {t('kpi_aov')}:{' '}
                <strong className="text-primary-token">
                  {formatRevenue(num(metrics['客单价']))}
                </strong>
              </span>
              <span>
                {t('kpi_register_conv')}:{' '}
                <strong className="text-primary-token">
                  {formatRate(num(metrics['注册转化率']))}
                </strong>
              </span>
            </div>
          </>
        )}
      </Card>

      {/* 月度目标达成 — 已合并到 OverviewSummaryCards 进度条 */}

      {/* D2b 全站基准 */}
      {d2b && (
        <Card title={t('d2bCardTitle')}>
          <p className="text-[11px] text-muted-token mb-3">{t('d2bCardDesc')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              {
                label: t('d2b_totalStudents'),
                value: (d2b.total_students ?? 0).toLocaleString(),
                subtitle: t('d2b_totalStudentsSub'),
                chapter: 'chapter-1',
              },
              {
                label: t('d2b_newCoeff'),
                value: d2b.new_coefficient != null ? d2b.new_coefficient.toFixed(2) : '—',
                subtitle: t('d2b_newCoeffSub'),
                chapter: 'chapter-2-0',
              },
              {
                label: t('d2b_cargoRatio'),
                value: d2b.cargo_ratio != null ? d2b.cargo_ratio.toFixed(2) : '—',
                subtitle: t('d2b_cargoRatioSub'),
                chapter: 'chapter-2-0',
              },
              {
                label: t('d2b_participationCount'),
                value:
                  d2b.participation_count != null ? d2b.participation_count.toLocaleString() : '—',
                subtitle: t('d2b_participationCountSub'),
                chapter: 'chapter-2-0',
              },
              {
                label: t('d2b_participationRate'),
                value: d2b.participation_rate != null ? formatRate(d2b.participation_rate) : '—',
                subtitle: t('d2b_participationRateSub'),
                chapter: 'chapter-2-0',
              },
              {
                label: t('d2b_checkinRate'),
                value: d2b.checkin_rate != null ? formatRate(d2b.checkin_rate) : '—',
                subtitle: t('d2b_checkinRateSub'),
                chapter: 'chapter-2-0',
              },
              {
                label: t('d2b_ccReachRate'),
                value: d2b.cc_reach_rate != null ? formatRate(d2b.cc_reach_rate) : '—',
                subtitle: t('d2b_ccReachRateSub'),
                chapter: 'chapter-2-0',
              },
            ].map(({ label, value, subtitle, chapter }) => (
              <div key={label} className="bg-subtle rounded-lg px-3 py-2.5 flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-token inline-flex items-center">
                  {label}
                  {chapter && <KnowledgeLink chapter={chapter} className="w-3 h-3" />}
                </span>
                <span className="text-base font-bold font-mono tabular-nums text-primary-token">
                  {value}
                </span>
                <span className="text-[9px] text-muted-token leading-tight opacity-75">
                  {subtitle}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 数据源状态 */}
      <Card title={t('dataSourceCardTitle')}>
        <DataSourceSection sources={fullSources ?? []} />
      </Card>

      {/* CC 个人工作台 */}
      <PersonalWorkbench />
    </div>
  );
}
