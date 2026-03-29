'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { Globe, Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { useConfigStore, useStoreHydrated } from '@/lib/stores/config-store';
import { swrFetcher } from '@/lib/api';
import { useCurrentPageDimensions } from '@/lib/hooks/use-page-dimensions';
import { BenchmarkSelector } from './BenchmarkSelector';
import type {
  FilterOptions,
  DataRole,
  Granularity,
  FunnelStage,
  Channel,
  BehaviorSegment,
} from '@/lib/types/filters';

// ──────────────────────────────────────────────────────────────────────────────
// 数据角色分段
// ──────────────────────────────────────────────────────────────────────────────

const DATA_ROLE_OPTIONS: { value: DataRole; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'cc', label: 'CC' },
  { value: 'ss', label: 'SS' },
  { value: 'lp', label: 'LP' },
  { value: 'ops', label: '运营' },
];

// ──────────────────────────────────────────────────────────────────────────────
// 时间粒度分段
// ──────────────────────────────────────────────────────────────────────────────

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季' },
];

// ──────────────────────────────────────────────────────────────────────────────
// 漏斗阶段选项
// ──────────────────────────────────────────────────────────────────────────────

const FUNNEL_STAGE_OPTIONS: { value: FunnelStage; label: string }[] = [
  { value: 'all', label: '全部阶段' },
  { value: 'registration', label: '注册' },
  { value: 'appointment', label: '预约' },
  { value: 'attendance', label: '出席' },
  { value: 'payment', label: '付费' },
];

// ──────────────────────────────────────────────────────────────────────────────
// 渠道选项（静态标签，实际可选值来自 /api/filter/options）
// ──────────────────────────────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<Channel, string> = {
  all: '全部渠道',
  cc_narrow: 'CC 窄口',
  ss_narrow: 'SS 窄口',
  lp_narrow: 'LP 窄口',
  cc_wide: 'CC 宽口',
  lp_wide: 'LP 宽口',
  ops_wide: '运营宽口',
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
    if (value === null) return '有效围场';
    if (value.length === 0) return '全部围场';
    if (value.length === 1) return value[0];
    return `${value.length} 个围场`;
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
              全部
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
              有效
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
                  <span className="ml-auto text-[10px] text-[var(--text-muted)]">非有效</span>
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

const BEHAVIOR_LABELS: Record<string, string> = {
  gold: '黄金',
  effective: '有效',
  stuck_pay: '卡付费',
  stuck_show: '卡出席',
  potential: '潜力',
  freeloader: '摆烂',
  newcomer: '新入',
  casual: '随机',
};

interface BehaviorChipsProps {
  value: BehaviorSegment[] | null;
  onChange: (v: BehaviorSegment[] | null) => void;
  behaviors: { value: string; label: string; color: string; count: number }[];
}

function BehaviorChips({ value, onChange, behaviors }: BehaviorChipsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
  const label = activeCount === 0 || value === null ? '行为分层' : `${activeCount} 分层`;

  function toggleBehavior(slug: BehaviorSegment) {
    const current = value ?? [];
    const next = current.includes(slug) ? current.filter((v) => v !== slug) : [...current, slug];
    onChange(next.length > 0 ? next : null);
  }

  const currentSet = new Set<string>(value ?? []);

  const displayBehaviors =
    behaviors.length > 0
      ? behaviors
      : Object.keys(BEHAVIOR_LABELS).map((key) => ({
          value: key,
          label: BEHAVIOR_LABELS[key],
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
                    {beh.label || BEHAVIOR_LABELS[beh.value] || beh.value}
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
              清除选择
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 主组件：UnifiedFilterBar
// ──────────────────────────────────────────────────────────────────────────────

export function UnifiedFilterBar() {
  const hydrated = useStoreHydrated();
  const dims = useCurrentPageDimensions();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Store 状态
  const country = useConfigStore((s) => s.country);
  const dataRole = useConfigStore((s) => s.dataRole);
  const enclosure = useConfigStore((s) => s.enclosure);
  const teamFilter = useConfigStore((s) => s.teamFilter);
  const focusCC = useConfigStore((s) => s.focusCC);
  const granularity = useConfigStore((s) => s.granularity);
  const funnelStage = useConfigStore((s) => s.funnelStage);
  const channel = useConfigStore((s) => s.channel);
  const behavior = useConfigStore((s) => s.behavior);

  const setCountry = useConfigStore((s) => s.setCountry);
  const setDataRole = useConfigStore((s) => s.setDataRole);
  const setEnclosure = useConfigStore((s) => s.setEnclosure);
  const setTeamFilter = useConfigStore((s) => s.setTeamFilter);
  const setFocusCC = useConfigStore((s) => s.setFocusCC);
  const setGranularity = useConfigStore((s) => s.setGranularity);
  const setFunnelStage = useConfigStore((s) => s.setFunnelStage);
  const setChannel = useConfigStore((s) => s.setChannel);
  const setBehavior = useConfigStore((s) => s.setBehavior);

  // 从 /api/filter/options 获取可选值
  const { data: filterOptions } = useSWR<FilterOptions>('/api/filter/options', swrFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

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
    setTeamFilter(null);
    setFocusCC(null);
    setDataRole('all');
    setEnclosure(null);
    setGranularity('month');
    setFunnelStage('all');
    setChannel('all');
    setBehavior(null);
  }, [
    setTeamFilter,
    setFocusCC,
    setDataRole,
    setEnclosure,
    setGranularity,
    setFunnelStage,
    setChannel,
    setBehavior,
  ]);

  // 抽屉时禁止 body 滚动
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

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
  const behaviors = filterOptions?.behaviors ?? [];

  // data_role 固定值处理（cc-performance 页面固定为 cc）
  const dataRoleFixed = typeof dims.dataRole === 'string' ? (dims.dataRole as DataRole) : null;

  // granularity 固定值处理（daily-monitor 页面 day 固定）
  const granularityFixed =
    typeof dims.granularity === 'string' ? (dims.granularity as Granularity) : null;

  // 是否显示第二行（有任一分析维度适用当前页面）
  const showAdvancedRow =
    dims.granularity !== undefined ||
    dims.funnelStage !== undefined ||
    dims.channel !== undefined ||
    dims.behavior !== undefined;

  // ── Desktop 内容 ──────────────────────────────────────────────────────────

  const desktopRow1 = (
    <div className="hidden md:flex items-center gap-2 flex-wrap px-4 py-2">
      {/* 国家 */}
      {dims.country !== false &&
        dims.country !== undefined &&
        (isSingleCountry ? (
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
        ))}

      {/* 数据角色分段 */}
      {dims.dataRole !== false &&
        dims.dataRole !== undefined &&
        (dataRoleFixed ? (
          <span className="flex items-center px-2.5 py-1 h-8 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] select-none uppercase">
            {dataRoleFixed}
          </span>
        ) : (
          <SegmentedControl
            options={DATA_ROLE_OPTIONS}
            value={hydrated ? dataRole : 'all'}
            onChange={setDataRole}
          />
        ))}

      {/* 围场 */}
      {dims.enclosure !== false && dims.enclosure !== undefined && (
        <EnclosureDropdown
          value={hydrated ? enclosure : null}
          onChange={setEnclosure}
          enclosures={enclosures}
        />
      )}

      {/* 团队下拉 */}
      {dims.team !== false && dims.team !== undefined && (
        <select
          value={teamFilter ?? ''}
          onChange={(e) => setTeamFilter(e.target.value || null)}
          className="h-8 px-2.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--brand-p1)] outline-none cursor-pointer transition-colors"
        >
          <option value="">所有团队</option>
          {teams.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label || t.value}
            </option>
          ))}
        </select>
      )}

      {/* CC 搜索 */}
      {dims.team !== false && dims.team !== undefined && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            value={focusCC ?? ''}
            onChange={(e) => setFocusCC(e.target.value || null)}
            placeholder="搜索 CC..."
            className="h-8 pl-7 pr-3 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-1 focus:ring-[var(--brand-p1)] focus:border-[var(--brand-p1)] outline-none transition-all w-32 focus:w-44"
          />
        </div>
      )}

      {/* 清除按钮 */}
      {hasActiveFilter && (
        <button
          onClick={handleClearAll}
          className="flex items-center gap-1 px-2 py-1 h-8 rounded-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors ml-auto"
        >
          <X className="w-3 h-3" />
          清除
        </button>
      )}

      {/* 更多筛选切换（仅当第二行有内容时显示） */}
      {showAdvancedRow && (
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
              收起 <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              更多筛选 <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      )}
    </div>
  );

  const desktopRow2 =
    showAdvancedRow && advancedOpen ? (
      <div className="hidden md:flex items-center gap-2 flex-wrap px-4 pb-2 pt-0">
        {/* 时间粒度 */}
        {dims.granularity !== false &&
          dims.granularity !== undefined &&
          (granularityFixed ? (
            <span className="flex items-center px-2.5 py-1 h-8 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] select-none">
              {GRANULARITY_OPTIONS.find((g) => g.value === granularityFixed)?.label ??
                granularityFixed}
            </span>
          ) : (
            <SegmentedControl
              options={GRANULARITY_OPTIONS}
              value={hydrated ? granularity : 'month'}
              onChange={setGranularity}
            />
          ))}

        {/* 漏斗阶段 */}
        {dims.funnelStage !== false && dims.funnelStage !== undefined && (
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
        )}

        {/* 渠道 */}
        {dims.channel !== false && dims.channel !== undefined && (
          <select
            value={hydrated ? channel : 'all'}
            onChange={(e) => setChannel(e.target.value as Channel)}
            className="h-8 px-2.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--brand-p1)] outline-none cursor-pointer transition-colors"
          >
            {(channels.length > 0
              ? channels
              : (Object.entries(CHANNEL_LABELS) as [Channel, string][]).map(([v, l]) => ({
                  value: v,
                  label: l,
                  available_sources: [],
                }))
            ).map((c) => (
              <option key={c.value} value={c.value}>
                {c.label || CHANNEL_LABELS[c.value as Channel] || c.value}
              </option>
            ))}
          </select>
        )}

        {/* 学员行为多选 */}
        {dims.behavior !== false && dims.behavior !== undefined && (
          <BehaviorChips
            value={hydrated ? behavior : null}
            onChange={setBehavior}
            behaviors={behaviors}
          />
        )}
      </div>
    ) : null;

  const desktopRow3 = (
    <div className="hidden md:flex items-center px-4 pb-2 pt-0">
      <BenchmarkSelector />
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
        筛选
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
          清除
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
          <span className="text-base font-semibold text-[var(--text-primary)]">数据筛选</span>
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
                数据角色
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
                围场
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
                  全部
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
                  有效
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
                团队
              </label>
              <select
                value={teamFilter ?? ''}
                onChange={(e) => setTeamFilter(e.target.value || null)}
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-medium rounded-lg focus:ring-2 focus:ring-[var(--brand-p1)] focus:border-[var(--brand-p1)] block px-3 py-2.5 outline-none transition-colors"
              >
                <option value="">所有团队</option>
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
                搜索 CC
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="text"
                  value={focusCC ?? ''}
                  onChange={(e) => setFocusCC(e.target.value || null)}
                  placeholder="搜索特定 CC..."
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
                时间粒度
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
                漏斗阶段
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
                渠道
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-lg focus:ring-2 focus:ring-[var(--brand-p1)] focus:border-[var(--brand-p1)] block px-3 py-2.5 outline-none transition-colors"
              >
                {(channels.length > 0
                  ? channels
                  : (Object.entries(CHANNEL_LABELS) as [Channel, string][]).map(([v, l]) => ({
                      value: v,
                      label: l,
                      available_sources: [],
                    }))
                ).map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label || CHANNEL_LABELS[c.value as Channel] || c.value}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 对比基准 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              对比基准
            </label>
            <BenchmarkSelector />
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
                清除筛选
              </button>
            )}
            <button
              onClick={() => setDrawerOpen(false)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[var(--brand-p1)] text-white hover:opacity-90 transition-opacity"
            >
              确认
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
        {desktopRow2}
        {desktopRow3}
      </div>
      {mobileDrawer}
    </>
  );
}
