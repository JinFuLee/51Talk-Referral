'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useTranslations, useLocale } from 'next-intl';
import {
  Globe,
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  CalendarDays,
} from 'lucide-react';
import { useConfigStore, useStoreHydrated } from '@/lib/stores/config-store';
import type { CompareMode } from '@/lib/stores/config-store';
import { swrFetcher } from '@/lib/api';
import { useCurrentPageDimensions } from '@/lib/hooks/use-page-dimensions';
import { BenchmarkSelector } from './BenchmarkSelector';
import type { FilterOptions, DataRole, Channel, PageDimensions } from '@/lib/types/filters';

// 本地类型：granularity/funnelStage/behavior 已从全局 config-store 移除，
// UnifiedFilterBar 保留对应 UI 控件但不再与全局 store 同步
type Granularity = 'day' | 'week' | 'month' | 'quarter';
type FunnelStage = 'all' | 'registration' | 'appointment' | 'attendance' | 'payment';
type BehaviorSegment =
  | 'gold'
  | 'effective'
  | 'stuck_pay'
  | 'stuck_show'
  | 'potential'
  | 'freeloader'
  | 'newcomer'
  | 'casual';

// ──────────────────────────────────────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────────────────────────────────────

/** 返回 YYYYMM 格式的当前月 */
function getCurrentYYYYMM(): string {
  return new Date().toISOString().slice(0, 7).replace('-', '');
}

/** 将 YYYYMM 格式转成 locale-aware 月份标签
 * zh/zh-TW: 2026年4月（当月）
 * en:        Apr 2026 (current)
 * th:        เม.ย. 2569 (ปัจจุบัน)  ← 泰历 = 公历+543
 */
const TH_MONTH_ABBR = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];
const EN_MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatYYYYMMtoLabel(
  yyyymm: string,
  isCurrent: boolean,
  currentMonthSuffix: string,
  locale: string
): string {
  const year = parseInt(yyyymm.slice(0, 4), 10);
  const month = parseInt(yyyymm.slice(4, 6), 10);
  const monthIdx = month - 1; // 0-based
  if (locale === 'th') {
    const thYear = year + 543;
    const label = `${TH_MONTH_ABBR[monthIdx] ?? month} ${thYear}`;
    return isCurrent ? `${label}${currentMonthSuffix}` : label;
  }
  if (locale === 'en') {
    const label = `${EN_MONTH_ABBR[monthIdx] ?? month} ${year}`;
    return isCurrent ? `${label}${currentMonthSuffix}` : label;
  }
  // zh / zh-TW fallback
  if (isCurrent) return `${year}年${month}月${currentMonthSuffix}`;
  return `${year}年${month}月`;
}

// ──────────────────────────────────────────────────────────────────────────────
// 数据角色分段
// ──────────────────────────────────────────────────────────────────────────────

// 静态 value 列表，label 在主组件内通过 t() 动态生成（品牌名 CC/SS/LP 不翻译）
const DATA_ROLE_VALUES: DataRole[] = ['all', 'cc', 'ss', 'lp', 'ops'];

// ──────────────────────────────────────────────────────────────────────────────
// 时间粒度分段
// ──────────────────────────────────────────────────────────────────────────────

const GRANULARITY_VALUES: Granularity[] = ['day', 'week', 'month', 'quarter'];

// ──────────────────────────────────────────────────────────────────────────────
// 漏斗阶段选项
// ──────────────────────────────────────────────────────────────────────────────

const FUNNEL_STAGE_VALUES: FunnelStage[] = [
  'all',
  'registration',
  'appointment',
  'attendance',
  'payment',
];

// ──────────────────────────────────────────────────────────────────────────────
// 渠道选项（静态标签，实际可选值来自 /api/filter/options）
// ──────────────────────────────────────────────────────────────────────────────

// channel i18n key 映射（cc_narrow → ccNarrow 等）
const CHANNEL_I18N_KEYS: Record<Channel, string> = {
  all: 'channel.all',
  cc_narrow: 'channel.ccNarrow',
  ss_narrow: 'channel.ssNarrow',
  lp_narrow: 'channel.lpNarrow',
  cc_wide: 'channel.ccWide',
  lp_wide: 'channel.lpWide',
  ops_wide: 'channel.opsWide',
};

// 有效围场（active）的 slug 列表（业务定义：M0-M6+）
const ACTIVE_ENCLOSURES = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6+'];

// ──────────────────────────────────────────────────────────────────────────────
// 分段控制器（Segmented Control / Pill）
// ──────────────────────────────────────────────────────────────────────────────

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)]"
      style={{ height: 32 }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => !disabled && onChange(opt.value)}
          disabled={disabled}
          className={[
            'px-2.5 h-6 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
            opt.value === value
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 围场多选下拉
// ──────────────────────────────────────────────────────────────────────────────

interface EnclosureDropdownProps {
  value: string[] | null;
  onChange: (v: string[] | null) => void;
  enclosures: { value: string; label: string; is_active: boolean }[];
}

function EnclosureDropdown({ value, onChange, enclosures }: EnclosureDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations('filterBar');

  // 关闭逻辑：点击外部关闭
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // 计算显示标签
  function getLabel(): string {
    if (value === null) return t('enclosure.active');
    if (value.length === 0) return t('enclosure.all');
    if (value.length === 1) return value[0];
    return t('enclosure.count', { n: value.length });
  }

  function handleQuick(type: 'all' | 'active') {
    onChange(type === 'all' ? [] : null);
    setOpen(false);
  }

  function toggleEnclosure(slug: string) {
    const current = value === null ? ACTIVE_ENCLOSURES : (value ?? []);
    const next = current.includes(slug) ? current.filter((v) => v !== slug) : [...current, slug];
    onChange(next.length > 0 ? next : []);
  }

  const currentSet = new Set(value === null ? ACTIVE_ENCLOSURES : (value ?? []));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 h-8 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors whitespace-nowrap"
      >
        <span>{getLabel()}</span>
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-lg min-w-[160px] py-1.5">
          {/* 快捷选择 */}
          <div className="px-2 pb-1.5 flex gap-1">
            <button
              onClick={() => handleQuick('all')}
              className={[
                'flex-1 py-1 rounded text-xs font-medium transition-colors',
                value !== null && value.length === 0
                  ? 'bg-[var(--brand-p1)] text-white'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              {t('enclosure.selectAll')}
            </button>
            <button
              onClick={() => handleQuick('active')}
              className={[
                'flex-1 py-1 rounded text-xs font-medium transition-colors',
                value === null
                  ? 'bg-[var(--brand-p1)] text-white'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              {t('enclosure.selectActive')}
            </button>
          </div>
          <div className="h-px bg-[var(--border-subtle)] mx-2 mb-1" />
          {/* 具体围场复选框 */}
          <div className="max-h-48 overflow-y-auto px-1">
            {(enclosures.length > 0
              ? enclosures
              : ACTIVE_ENCLOSURES.map((v) => ({ value: v, label: v, is_active: true }))
            ).map((enc) => (
              <label
                key={enc.value}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={currentSet.has(enc.value)}
                  onChange={() => toggleEnclosure(enc.value)}
                  className="w-3.5 h-3.5 accent-[var(--brand-p1)] shrink-0"
                />
                <span className="text-xs text-[var(--text-primary)]">{enc.label || enc.value}</span>
                {!enc.is_active && (
                  <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                    {t('enclosure.nonActive')}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 学员行为多选 Chip
// ──────────────────────────────────────────────────────────────────────────────

const BEHAVIOR_COLORS: Record<string, string> = {
  gold: '#FFD100',
  effective: '#22c55e',
  stuck_pay: '#ef4444',
  stuck_show: '#f97316',
  potential: '#3b82f6',
  freeloader: '#6b7280',
  newcomer: '#a855f7',
  casual: '#94a3b8',
};

// behavior i18n key 映射（stuck_pay → behavior.stuckPay 等）
const BEHAVIOR_I18N_KEYS: Record<string, string> = {
  gold: 'behavior.gold',
  effective: 'behavior.effective',
  stuck_pay: 'behavior.stuckPay',
  stuck_show: 'behavior.stuckShow',
  potential: 'behavior.potential',
  freeloader: 'behavior.freeloader',
  newcomer: 'behavior.newcomer',
  casual: 'behavior.casual',
};

interface BehaviorChipsProps {
  value: BehaviorSegment[] | null;
  onChange: (v: BehaviorSegment[] | null) => void;
  behaviors: { value: string; label: string; color: string; count: number }[];
}

function BehaviorChips({ value, onChange, behaviors }: BehaviorChipsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations('filterBar');

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const activeCount = value?.length ?? 0;
  const label =
    activeCount === 0 || value === null
      ? t('behavior.label')
      : t('behavior.count', { n: activeCount });

  function toggleBehavior(slug: BehaviorSegment) {
    const current = value ?? [];
    const next = current.includes(slug) ? current.filter((v) => v !== slug) : [...current, slug];
    onChange(next.length > 0 ? next : null);
  }

  const currentSet = new Set<string>(value ?? []);

  const displayBehaviors =
    behaviors.length > 0
      ? behaviors
      : Object.keys(BEHAVIOR_I18N_KEYS).map((key) => ({
          value: key,
          label: t(BEHAVIOR_I18N_KEYS[key] as Parameters<typeof t>[0]),
          color: BEHAVIOR_COLORS[key] ?? '#94a3b8',
          count: 0,
        }));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 h-8 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors whitespace-nowrap"
      >
        <span>{label}</span>
        {activeCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-[var(--brand-p1)] text-white text-[10px] flex items-center justify-center font-medium">
            {activeCount}
          </span>
        )}
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-lg min-w-[180px] p-2">
          <div className="flex flex-wrap gap-1.5">
            {displayBehaviors.map((beh) => {
              const isActive = currentSet.has(beh.value);
              const color = beh.color || BEHAVIOR_COLORS[beh.value] || '#94a3b8';
              return (
                <button
                  key={beh.value}
                  onClick={() => toggleBehavior(beh.value as BehaviorSegment)}
                  className={[
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors',
                    isActive
                      ? 'border-[var(--brand-p1)] bg-[var(--bg-subtle)]'
                      : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]',
                  ].join(' ')}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[var(--text-primary)]">
                    {beh.label ||
                      (BEHAVIOR_I18N_KEYS[beh.value]
                        ? t(BEHAVIOR_I18N_KEYS[beh.value] as Parameters<typeof t>[0])
                        : beh.value)}
                  </span>
                </button>
              );
            })}
          </div>
          {value !== null && value.length > 0 && (
            <button
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="mt-2 w-full text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-center transition-colors"
            >
              {t('clear')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// FilterSlot — 统一控制 enabled / disabled / locked 三态
// ──────────────────────────────────────────────────────────────────────────────

type SlotState = 'enabled' | 'disabled' | 'locked';

/**
 * 根据 PageDimensions 中该维度的值判断状态：
 * - undefined / false → disabled（灰色不可交互 + tooltip）
 * - true → enabled（正常）
 * - string (如 'cc') → locked（显示固定值 + 🔒）
 */
function resolveSlotState(dimValue: boolean | string | undefined): SlotState {
  if (dimValue === undefined || dimValue === false) return 'disabled';
  if (typeof dimValue === 'string') return 'locked';
  return 'enabled';
}

function FilterSlot({
  state,
  tooltip,
  children,
}: {
  state: SlotState;
  tooltip?: string;
  children: React.ReactNode;
}) {
  if (state === 'disabled') {
    return (
      <div className="relative group" title={tooltip}>
        <div className="opacity-35 pointer-events-none select-none">{children}</div>
      </div>
    );
  }
  return <>{children}</>;
}

/**
 * 检测是否为系统页面（所有维度均未声明）→ 隐藏整个 filter bar
 */
function isSystemPage(dims: PageDimensions): boolean {
  return Object.keys(dims).length === 0;
}

// ──────────────────────────────────────────────────────────────────────────────
// 主组件：UnifiedFilterBar
// ──────────────────────────────────────────────────────────────────────────────

export function UnifiedFilterBar() {
  const hydrated = useStoreHydrated();
  const dims = useCurrentPageDimensions();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const t = useTranslations('filterBar');
  const locale = useLocale();

  // Store 状态
  const country = useConfigStore((s) => s.country);
  const dataRole = useConfigStore((s) => s.dataRole);
  const enclosure = useConfigStore((s) => s.enclosure);
  const teamFilter = useConfigStore((s) => s.teamFilter);
  const focusCC = useConfigStore((s) => s.focusCC);
  const channel = useConfigStore((s) => s.channel);
  const selectedMonth = useConfigStore((s) => s.selectedMonth);
  // granularity / funnelStage / behavior 已从全局 store 移除，改为本地 state
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [funnelStage, setFunnelStage] = useState<FunnelStage>('all');
  const [behavior, setBehavior] = useState<BehaviorSegment[] | null>(null);
  const customDateRange = useConfigStore((s) => s.customDateRange);
  const compareMode = useConfigStore((s) => s.compareMode);

  const setCountry = useConfigStore((s) => s.setCountry);
  const setDataRole = useConfigStore((s) => s.setDataRole);
  const setEnclosure = useConfigStore((s) => s.setEnclosure);
  const setTeamFilter = useConfigStore((s) => s.setTeamFilter);
  const setFocusCC = useConfigStore((s) => s.setFocusCC);
  const setChannel = useConfigStore((s) => s.setChannel);
  const setSelectedMonth = useConfigStore((s) => s.setSelectedMonth);
  const setCustomDateRange = useConfigStore((s) => s.setCustomDateRange);
  const setCompareMode = useConfigStore((s) => s.setCompareMode);

  // 从 /api/filter/options 获取可选值
  const { data: filterOptions } = useSWR<FilterOptions>('/api/filter/options', swrFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // 从 /api/archives/months 获取已归档的历史月份列表
  const { data: archivedMonths } = useSWR<string[]>('/api/archives/months', swrFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // 当月始终排在第一位，历史月份按降序排列（最近的优先）
  const currentYYYYMM = getCurrentYYYYMM();
  const availableMonths: string[] = [
    currentYYYYMM,
    ...(archivedMonths ? [...archivedMonths].reverse().filter((m) => m !== currentYYYYMM) : []),
  ];

  // 是否正在查看历史月份或自定义范围
  const isHistoricalView =
    hydrated &&
    ((selectedMonth !== null && selectedMonth !== currentYYYYMM) || customDateRange !== null);

  // 是否有激活的筛选器
  const hasActiveFilter =
    hydrated &&
    Boolean(
      teamFilter ||
      focusCC ||
      enclosure !== null ||
      dataRole !== 'all' ||
      channel !== 'all' ||
      (behavior !== null && behavior.length > 0)
    );

  const handleClearAll = useCallback(() => {
    setSelectedMonth(null);
    setCustomDateRange(null);
    setTeamFilter(null);
    setFocusCC(null);
    setDataRole('all');
    setEnclosure(null);
    setGranularity('month');
    setFunnelStage('all');
    setChannel('all');
    setBehavior(null);
  }, [
    setSelectedMonth,
    setCustomDateRange,
    setTeamFilter,
    setFocusCC,
    setDataRole,
    setEnclosure,
    setChannel,
  ]);

  // 抽屉时禁止 body 滚动
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // 系统页面（dims 为空对象）→ 隐藏整个 filter bar
  if (isSystemPage(dims)) return null;

  // 每个维度的状态
  const countryState = resolveSlotState(dims.country);
  const dataRoleState = resolveSlotState(dims.dataRole);
  const enclosureState = resolveSlotState(dims.enclosure);
  const teamState = resolveSlotState(dims.team);
  const granularityState = resolveSlotState(dims.granularity);
  const funnelState = resolveSlotState(dims.funnelStage);
  const channelState = resolveSlotState(dims.channel);
  const behaviorState = resolveSlotState(dims.behavior);

  // 国家选项
  const countries = filterOptions?.countries ?? [{ value: 'TH', label: '🌏 泰国 (TH)' }];
  const isSingleCountry = countries.length <= 1;

  // 团队选项
  const teams = filterOptions?.teams ?? [];

  // 围场
  const enclosures = filterOptions?.enclosures ?? [];

  // 渠道
  const channels = filterOptions?.channels ?? [];

  // 行为
  const behaviors: { value: string; label: string; color: string; count: number }[] = [];

  // data_role 固定值处理（cc-performance 页面固定为 cc）
  const dataRoleFixed = typeof dims.dataRole === 'string' ? (dims.dataRole as DataRole) : null;

  // granularity 固定值处理（daily-monitor 页面 day 固定）
  const granularityFixed =
    typeof dims.granularity === 'string' ? (dims.granularity as Granularity) : null;

  // 动态构建 options（通过 t() 获取 i18n 标签，品牌名 CC/SS/LP 不翻译）
  const DATA_ROLE_OPTIONS: { value: DataRole; label: string }[] = DATA_ROLE_VALUES.map((v) => ({
    value: v,
    label: v === 'all' ? t('allRoles') : v === 'ops' ? t('ops') : v.toUpperCase(),
  }));

  const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = GRANULARITY_VALUES.map(
    (v) => ({
      value: v,
      label: t(`granularity.${v}` as Parameters<typeof t>[0]),
    })
  );

  const FUNNEL_STAGE_OPTIONS: { value: FunnelStage; label: string }[] = FUNNEL_STAGE_VALUES.map(
    (v) => ({
      value: v,
      label: t(`funnelStage.${v}` as Parameters<typeof t>[0]),
    })
  );

  // channel label 辅助函数（通过 i18n key 获取翻译）
  const getChannelLabel = (ch: Channel): string =>
    t(CHANNEL_I18N_KEYS[ch] as Parameters<typeof t>[0]);

  // 当月后缀（用于月份选择器 formatYYYYMMtoLabel）
  const currentMonthSuffix = t('currentMonth');

  // 时间对比选项
  const TEMPORAL_OPTIONS: { value: Exclude<CompareMode, 'off' | 'pop'>; label: string }[] = [
    { value: 'yoy', label: t('temporal.yoy') },
    { value: 'peak', label: t('temporal.peak') },
    { value: 'valley', label: t('temporal.valley') },
  ];

  // 是否显示第二行（有任一分析维度适用当前页面）
  const showAdvancedRow =
    dims.granularity !== undefined ||
    dims.funnelStage !== undefined ||
    dims.channel !== undefined ||
    dims.behavior !== undefined;

  // ── Desktop 内容 ──────────────────────────────────────────────────────────

  const desktopRow1 = (
    <div className="hidden md:flex items-center gap-2 flex-wrap px-4 py-2">
      {/* 月份选择器 */}
      <div className="flex items-center gap-1.5">
        <CalendarDays className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
        <select
          value={
            hydrated
              ? customDateRange
                ? 'custom'
                : (selectedMonth ?? currentYYYYMM)
              : currentYYYYMM
          }
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'custom') {
              // 选中自定义范围时，立即初始化为当月范围
              const now = new Date();
              const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
              const today = now.toISOString().slice(0, 10);
              setCustomDateRange({ start: firstDay, end: today });
              setSelectedMonth(null);
            } else {
              setCustomDateRange(null);
              setSelectedMonth(val === currentYYYYMM ? null : val);
            }
          }}
          className={[
            'h-8 px-2.5 rounded-lg border text-xs font-medium outline-none cursor-pointer transition-all',
            isHistoricalView
              ? 'bg-amber-50 border-amber-400 text-amber-700 focus:ring-1 focus:ring-amber-400'
              : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--brand-p1)]',
          ].join(' ')}
        >
          {(availableMonths ?? [currentYYYYMM]).map((ym) => {
            const isCurrent = ym === currentYYYYMM;
            return (
              <option key={ym} value={ym}>
                {formatYYYYMMtoLabel(ym, isCurrent, currentMonthSuffix, locale)}
              </option>
            );
          })}
          <option value="custom">{t('customRange')}</option>
        </select>
        {/* 自定义日期范围输入框 */}
        {hydrated && customDateRange !== null && (
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={customDateRange.start}
              onChange={(e) =>
                setCustomDateRange({ start: e.target.value, end: customDateRange.end })
              }
              className="h-8 px-2 rounded-lg border border-amber-400 bg-amber-50 text-xs text-amber-700 outline-none focus:ring-1 focus:ring-amber-400"
            />
            <span className="text-xs text-[var(--text-muted)]">~</span>
            <input
              type="date"
              value={customDateRange.end}
              onChange={(e) =>
                setCustomDateRange({ start: customDateRange.start, end: e.target.value })
              }
              className="h-8 px-2 rounded-lg border border-amber-400 bg-amber-50 text-xs text-amber-700 outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>
        )}
      </div>

      {/* 国家 */}
      <FilterSlot state={countryState} tooltip={t('countryNotApplicable')}>
        {isSingleCountry ? (
          <span className="flex items-center gap-1 px-2.5 py-1 h-8 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] select-none">
            <Globe className="w-3.5 h-3.5" />
            {countries[0]?.label ?? 'TH'}
          </span>
        ) : (
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as typeof country)}
            className="h-8 px-2.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--brand-p1)] outline-none cursor-pointer transition-colors"
          >
            {countries.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        )}
      </FilterSlot>

      {/* 数据角色分段 */}
      <FilterSlot
        state={dataRoleState}
        tooltip={
          dataRoleState === 'locked'
            ? t('lockedToRole', { role: dataRoleFixed?.toUpperCase() ?? '' })
            : t('dataRoleNotApplicable')
        }
      >
        {dataRoleFixed ? (
          <span className="flex items-center gap-1 px-2.5 py-1 h-8 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] select-none uppercase">
            🔒 {dataRoleFixed}
          </span>
        ) : (
          <SegmentedControl
            options={DATA_ROLE_OPTIONS}
            value={hydrated ? dataRole : 'all'}
            onChange={setDataRole}
          />
        )}
      </FilterSlot>

      {/* 围场 */}
      <FilterSlot state={enclosureState} tooltip={t('enclosureNotApplicable')}>
        <EnclosureDropdown
          value={hydrated ? enclosure : null}
          onChange={setEnclosure}
          enclosures={enclosures}
        />
      </FilterSlot>

      {/* 团队下拉 */}
      <FilterSlot state={teamState} tooltip={t('teamNotApplicable')}>
        <select
          value={teamFilter ?? ''}
          onChange={(e) => setTeamFilter(e.target.value || null)}
          className="h-8 px-2.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--brand-p1)] outline-none cursor-pointer transition-colors"
        >
          <option value="">{t('allTeams')}</option>
          {teams.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label || t.value}
            </option>
          ))}
        </select>
      </FilterSlot>

      {/* CC 搜索 */}
      <FilterSlot state={teamState} tooltip={t('ccSearchNotApplicable')}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            value={focusCC ?? ''}
            onChange={(e) => setFocusCC(e.target.value || null)}
            placeholder={t('searchCC')}
            className="h-8 pl-7 pr-3 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-1 focus:ring-[var(--brand-p1)] focus:border-[var(--brand-p1)] outline-none transition-all w-32 focus:w-44"
          />
        </div>
      </FilterSlot>

      {/* 清除按钮 */}
      {hasActiveFilter && (
        <button
          onClick={handleClearAll}
          className="flex items-center gap-1 px-2 py-1 h-8 rounded-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors ml-auto"
        >
          <X className="w-3 h-3" />
          {t('clearFilter')}
        </button>
      )}

      {/* 更多筛选切换 */}
      <button
        onClick={() => setAdvancedOpen((v) => !v)}
        className={[
          'flex items-center gap-1 px-2.5 py-1 h-8 rounded-lg text-xs font-medium border transition-colors',
          advancedOpen
            ? 'bg-[var(--bg-subtle)] border-[var(--border-default)] text-[var(--text-primary)]'
            : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]',
        ].join(' ')}
      >
        {advancedOpen ? (
          <>
            {t('lessFilters')} <ChevronUp className="w-3 h-3" />
          </>
        ) : (
          <>
            {t('moreFilters')} <ChevronDown className="w-3 h-3" />
          </>
        )}
      </button>
    </div>
  );

  const desktopRow2 = advancedOpen ? (
    <div className="hidden md:flex items-center gap-2 flex-wrap px-4 pb-2 pt-0">
      {/* 时间粒度 */}
      <FilterSlot
        state={granularityState}
        tooltip={
          granularityState === 'locked'
            ? t('lockedToGranularity', { granularity: granularityFixed ?? '' })
            : t('granularityNotApplicable')
        }
      >
        {granularityFixed ? (
          <span className="flex items-center gap-1 px-2.5 py-1 h-8 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] select-none">
            🔒{' '}
            {GRANULARITY_OPTIONS.find((g) => g.value === granularityFixed)?.label ??
              granularityFixed}
          </span>
        ) : (
          <SegmentedControl
            options={GRANULARITY_OPTIONS}
            value={hydrated ? granularity : 'month'}
            onChange={setGranularity}
          />
        )}
      </FilterSlot>

      {/* 漏斗阶段 */}
      <FilterSlot state={funnelState} tooltip={t('funnelNotApplicable')}>
        <select
          value={hydrated ? funnelStage : 'all'}
          onChange={(e) => setFunnelStage(e.target.value as FunnelStage)}
          className="h-8 px-2.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--brand-p1)] outline-none cursor-pointer transition-colors"
        >
          {FUNNEL_STAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FilterSlot>

      {/* 渠道 */}
      <FilterSlot state={channelState} tooltip={t('channelNotApplicable')}>
        <select
          value={hydrated ? channel : 'all'}
          onChange={(e) => setChannel(e.target.value as Channel)}
          className="h-8 px-2.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--brand-p1)] outline-none cursor-pointer transition-colors"
        >
          {(channels.length > 0
            ? channels
            : (Object.keys(CHANNEL_I18N_KEYS) as Channel[]).map((v) => ({
                value: v,
                label: getChannelLabel(v),
                available_sources: [],
              }))
          ).map((c) => (
            <option key={c.value} value={c.value}>
              {c.label || getChannelLabel(c.value as Channel) || c.value}
            </option>
          ))}
        </select>
      </FilterSlot>

      {/* 学员行为多选 */}
      <FilterSlot state={behaviorState} tooltip={t('behaviorNotApplicable')}>
        <BehaviorChips
          value={hydrated ? behavior : null}
          onChange={setBehavior}
          behaviors={behaviors}
        />
      </FilterSlot>
    </div>
  ) : null;

  function handleTemporalToggle(mode: Exclude<CompareMode, 'off' | 'pop'>) {
    setCompareMode(compareMode === mode ? 'off' : mode);
  }

  const desktopRow3 = (
    <div className="hidden md:flex items-center gap-3 px-4 pb-2 pt-0">
      {/* 基准对比 */}
      <BenchmarkSelector />
      {/* 分隔线 */}
      <div className="h-4 w-px bg-[var(--border-subtle)]" />
      {/* 时间对比 */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-[var(--text-muted)] shrink-0 mr-0.5">{t('time')}</span>
        {TEMPORAL_OPTIONS.map((opt) => {
          const isActive = compareMode === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleTemporalToggle(opt.value)}
              className={[
                'px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
                isActive
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--color-accent)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── Mobile bar ────────────────────────────────────────────────────────────

  const mobileBar = (
    <div className="md:hidden flex items-center justify-between px-3 py-2">
      <button
        onClick={() => setDrawerOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-h-[44px]"
      >
        <SlidersHorizontal className="w-4 h-4" />
        {t('filter')}
        {hasActiveFilter && (
          <span className="ml-1 w-2 h-2 rounded-full bg-[var(--brand-p1)] inline-block" />
        )}
      </button>
      {hasActiveFilter && (
        <button
          onClick={handleClearAll}
          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="w-3 h-3" />
          {t('clearFilter')}
        </button>
      )}
    </div>
  );

  // ── Mobile Drawer ─────────────────────────────────────────────────────────

  const mobileDrawer = drawerOpen ? (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
      <div className="absolute bottom-0 inset-x-0 bg-[var(--bg-surface)] rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto">
        {/* 把手 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border-default)]" />
        </div>
        <div className="px-4 pb-2 flex items-center justify-between">
          <span className="text-base font-semibold text-[var(--text-primary)]">
            {t('dataFilter')}
          </span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pb-6 space-y-5">
          {/* 数据角色 */}
          {dims.dataRole !== false && dims.dataRole !== undefined && !dataRoleFixed && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t('dataRole')}
              </label>
              <div className="flex flex-wrap gap-2">
                {DATA_ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDataRole(opt.value)}
                    className={[
                      'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                      dataRole === opt.value
                        ? 'bg-[var(--brand-p1)] text-white border-[var(--brand-p1)]'
                        : 'border-[var(--border-default)] text-[var(--text-secondary)]',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 围场 */}
          {dims.enclosure !== false && dims.enclosure !== undefined && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t('enclosureLabel')}
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setEnclosure([])}
                  className={[
                    'flex-1 py-1.5 rounded text-sm font-medium border transition-colors',
                    enclosure !== null && enclosure.length === 0
                      ? 'bg-[var(--brand-p1)] text-white border-[var(--brand-p1)]'
                      : 'border-[var(--border-default)] text-[var(--text-secondary)]',
                  ].join(' ')}
                >
                  {t('enclosure.selectAll')}
                </button>
                <button
                  onClick={() => setEnclosure(null)}
                  className={[
                    'flex-1 py-1.5 rounded text-sm font-medium border transition-colors',
                    enclosure === null
                      ? 'bg-[var(--brand-p1)] text-white border-[var(--brand-p1)]'
                      : 'border-[var(--border-default)] text-[var(--text-secondary)]',
                  ].join(' ')}
                >
                  {t('enclosure.selectActive')}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(enclosures.length > 0
                  ? enclosures
                  : ACTIVE_ENCLOSURES.map((v) => ({ value: v, label: v, is_active: true }))
                ).map((enc) => {
                  const currentSet = new Set(
                    enclosure === null ? ACTIVE_ENCLOSURES : (enclosure ?? [])
                  );
                  const isActive = currentSet.has(enc.value);
                  return (
                    <button
                      key={enc.value}
                      onClick={() => {
                        const current = enclosure === null ? ACTIVE_ENCLOSURES : (enclosure ?? []);
                        const next = isActive
                          ? current.filter((v) => v !== enc.value)
                          : [...current, enc.value];
                        setEnclosure(next.length > 0 ? next : []);
                      }}
                      className={[
                        'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                        isActive
                          ? 'bg-[var(--brand-p1)] text-white border-[var(--brand-p1)]'
                          : 'border-[var(--border-default)] text-[var(--text-secondary)]',
                      ].join(' ')}
                    >
                      {enc.label || enc.value}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 团队 */}
          {dims.team !== false && dims.team !== undefined && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t('teamLabel')}
              </label>
              <select
                value={teamFilter ?? ''}
                onChange={(e) => setTeamFilter(e.target.value || null)}
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-medium rounded-lg focus:ring-2 focus:ring-[var(--brand-p1)] focus:border-[var(--brand-p1)] block px-3 py-2.5 outline-none transition-colors"
              >
                <option value="">{t('allTeams')}</option>
                {teams.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label || t.value}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* CC 搜索 */}
          {dims.team !== false && dims.team !== undefined && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t('searchCCLabel')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="text"
                  value={focusCC ?? ''}
                  onChange={(e) => setFocusCC(e.target.value || null)}
                  placeholder={t('searchCCSpecific')}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-lg focus:ring-2 focus:ring-[var(--brand-p1)] focus:border-[var(--brand-p1)] block pl-9 pr-4 py-2.5 outline-none transition-all placeholder:text-[var(--text-muted)]"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* 时间粒度 */}
          {dims.granularity !== false && dims.granularity !== undefined && !granularityFixed && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t('granularityLabel')}
              </label>
              <div className="flex gap-2">
                {GRANULARITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setGranularity(opt.value)}
                    className={[
                      'flex-1 py-1.5 rounded text-sm font-medium border transition-colors',
                      granularity === opt.value
                        ? 'bg-[var(--brand-p1)] text-white border-[var(--brand-p1)]'
                        : 'border-[var(--border-default)] text-[var(--text-secondary)]',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 漏斗阶段 */}
          {dims.funnelStage !== false && dims.funnelStage !== undefined && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t('funnelStageLabel')}
              </label>
              <select
                value={funnelStage}
                onChange={(e) => setFunnelStage(e.target.value as FunnelStage)}
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-lg focus:ring-2 focus:ring-[var(--brand-p1)] focus:border-[var(--brand-p1)] block px-3 py-2.5 outline-none transition-colors"
              >
                {FUNNEL_STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 渠道 */}
          {dims.channel !== false && dims.channel !== undefined && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t('channelLabel')}
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-lg focus:ring-2 focus:ring-[var(--brand-p1)] focus:border-[var(--brand-p1)] block px-3 py-2.5 outline-none transition-colors"
              >
                {(channels.length > 0
                  ? channels
                  : (Object.keys(CHANNEL_I18N_KEYS) as Channel[]).map((v) => ({
                      value: v,
                      label: getChannelLabel(v),
                      available_sources: [],
                    }))
                ).map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label || getChannelLabel(c.value as Channel) || c.value}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 对比基准 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              {t('compareLabel')}
            </label>
            <BenchmarkSelector />
          </div>

          {/* 时间对比 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              {t('temporalLabel')}
            </label>
            <div className="flex gap-2">
              {TEMPORAL_OPTIONS.map((opt) => {
                const isActive = compareMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleTemporalToggle(opt.value)}
                    className={[
                      'flex-1 py-1.5 rounded text-sm font-medium border transition-colors',
                      isActive
                        ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                        : 'border-[var(--border-default)] text-[var(--text-secondary)]',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-1">
            {hasActiveFilter && (
              <button
                onClick={() => {
                  handleClearAll();
                  setDrawerOpen(false);
                }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                {t('clearFilters')}
              </button>
            )}
            <button
              onClick={() => setDrawerOpen(false)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[var(--brand-p1)] text-white hover:opacity-90 transition-opacity"
            >
              {t('confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="sticky top-0 z-40 w-full bg-[var(--bg-surface)]/90 backdrop-blur-md border-b border-[var(--border-subtle)] shadow-sm flex-shrink-0">
        {mobileBar}
        {desktopRow1}
        {desktopRow3}
        {desktopRow2}
      </div>
      {mobileDrawer}
    </>
  );
}
