'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { WmaRecommendResult, WmaTier, WmaTierChannel } from '@/lib/types/report';

// ── 国际化 ───────────────────────────────────────────────────────────────────
const I18N = {
  zh: {
    title: '目标推荐',
    subtitle: '基于 WMA+趋势（Holt 1957）的三档月度目标推荐，选择后一键写入本月目标',
    method: '算法',
    basisMonths: '计算基础',
    stable: '稳达标',
    stretch: '冲刺',
    ambitious: '大票',
    stableDesc: '× 1.0 — WMA 基准，低波动场景，默认推荐',
    stretchDesc: '× 1.15 — 15% 冲刺系数，常规增长目标',
    ambitiousDesc: '× 1.50 — 50% 大票系数，挑战型目标',
    totalTarget: '总目标',
    registrations: '注册',
    appointments: '预约',
    attendance: '出席',
    payments: '付费',
    revenue: '业绩',
    asp: '客单价',
    regToPayRate: '注册→付费率',
    channelBreakdown: '口径拆分',
    apptRate: '预约率',
    attendRate: '出席率',
    paidRate: '付费率',
    revenueShare: '业绩占比',
    apply: '应用此档',
    applying: '写入中…',
    applySuccess: '已写入本月目标',
    applyError: '写入失败，请重试',
    defaultBadge: '默认',
    noData: '历史数据不足',
    noDataHint: '至少需要 3 个月归档数据',
    needMonths: '需积累',
    monthsUnit: '月',
    error: '加载失败',
    errorHint: '请检查后端服务',
    retry: '重试',
  },
  en: {
    title: 'Target Recommender',
    subtitle: 'WMA+trend (Holt 1957) three-tier monthly target, one-click apply',
    method: 'Method',
    basisMonths: 'Basis months',
    stable: 'Stable',
    stretch: 'Stretch',
    ambitious: 'Ambitious',
    stableDesc: '× 1.0 — WMA baseline, low volatility, default',
    stretchDesc: '× 1.15 — 15% stretch, normal growth target',
    ambitiousDesc: '× 1.50 — 50% ambitious, challenge target',
    totalTarget: 'Total Target',
    registrations: 'Reg',
    appointments: 'Appt',
    attendance: 'Attend',
    payments: 'Paid',
    revenue: 'Revenue',
    asp: 'ASP',
    regToPayRate: 'Reg→Pay Rate',
    channelBreakdown: 'Channel Breakdown',
    apptRate: 'Appt Rate',
    attendRate: 'Attend Rate',
    paidRate: 'Paid Rate',
    revenueShare: 'Rev Share',
    apply: 'Apply',
    applying: 'Applying…',
    applySuccess: 'Applied to this month',
    applyError: 'Failed, retry',
    defaultBadge: 'Default',
    noData: 'Insufficient data',
    noDataHint: 'Need at least 3 months of archived data',
    needMonths: 'Need',
    monthsUnit: 'months',
    error: 'Load failed',
    errorHint: 'Check backend service',
    retry: 'Retry',
  },
};

type Lang = 'zh' | 'en';
type T = (typeof I18N)['zh'];
type TierKey = 'stable' | 'stretch' | 'ambitious';

interface TierStyle {
  key: TierKey;
  border: string;
  bg: string;
  badge: string;
  badgeText: string;
  ring: string;
}

const TIER_STYLES: TierStyle[] = [
  {
    key: 'stable',
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    badgeText: 'text-blue-700',
    ring: 'ring-blue-400',
  },
  {
    key: 'stretch',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    badgeText: 'text-emerald-700',
    ring: 'ring-emerald-400',
  },
  {
    key: 'ambitious',
    border: 'border-orange-200',
    bg: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    badgeText: 'text-orange-700',
    ring: 'ring-orange-400',
  },
];

// ── 子组件：单档卡片 ──────────────────────────────────────────────────────────
function TierCard({
  tierKey,
  tier,
  style,
  t,
  isSelected,
  isDefault,
  onSelect,
}: {
  tierKey: TierKey;
  tier: WmaTier;
  style: TierStyle;
  t: T;
  isSelected: boolean;
  isDefault: boolean;
  onSelect: () => void;
}) {
  const [showChannels, setShowChannels] = useState(false);
  const tierLabel = t[tierKey];
  const tierDesc = t[`${tierKey}Desc` as keyof T] as string;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 p-5 cursor-pointer transition-all ${
        isSelected
          ? `${style.border} ${style.bg} shadow-md ring-2 ${style.ring}`
          : 'border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)] hover:shadow-sm'
      }`}
      onClick={onSelect}
    >
      {/* 已选标记 */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <span className={`text-lg font-bold ${style.badgeText}`}>✓</span>
        </div>
      )}

      {/* 档位标题 */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <span
          className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full border ${style.badge}`}
        >
          {tierLabel}
        </span>
        <span className="text-xs text-[var(--text-muted)] font-mono">
          × {tier.multiplier.toFixed(2)}
        </span>
        {isDefault && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-default)]">
            {t.defaultBadge}
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-3">{tierDesc}</p>

      {/* 总目标核心指标 */}
      <div className="space-y-1.5 mb-3">
        <MetricRow
          label={t.registrations}
          value={tier.total.registrations.toLocaleString()}
          isSelected={isSelected}
          style={style}
          bold
        />
        <MetricRow
          label={t.payments}
          value={tier.total.payments.toLocaleString()}
          isSelected={isSelected}
          style={style}
        />
        <MetricRow
          label={t.revenue}
          value={formatRevenue(tier.total.revenue_usd)}
          isSelected={isSelected}
          style={style}
          bold
        />
        <MetricRow
          label={t.asp}
          value={formatRevenue(tier.total.asp)}
          isSelected={isSelected}
          style={style}
        />
      </div>

      {/* 口径拆分（折叠） */}
      <div className="border-t border-[var(--border-subtle)] pt-3 mt-auto">
        <button
          className="w-full flex items-center justify-between text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setShowChannels(!showChannels);
          }}
        >
          <span>{t.channelBreakdown}</span>
          <span>{showChannels ? '▲' : '▼'}</span>
        </button>

        {showChannels && (
          <div className="mt-2 space-y-3">
            {Object.entries(tier.channels).map(([ch, chData]) => (
              <ChannelBlock key={ch} name={ch} data={chData} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  isSelected,
  style,
  bold = false,
}: {
  label: string;
  value: string;
  isSelected: boolean;
  style: TierStyle;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span
        className={`text-xs font-mono tabular-nums ${bold ? 'font-bold' : 'font-medium'} ${
          isSelected ? style.badgeText : 'text-[var(--text-secondary)]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function ChannelBlock({ name, data, t }: { name: string; data: WmaTierChannel; t: T }) {
  return (
    <div className="rounded-lg bg-[var(--bg-subtle)] p-2.5 space-y-1">
      <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{name}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <ChannelStat label={t.registrations} value={data.registrations.toLocaleString()} />
        <ChannelStat label={t.payments} value={data.payments.toLocaleString()} />
        <ChannelStat label={t.revenue} value={formatRevenue(data.revenue_usd)} />
        <ChannelStat label={t.revenueShare} value={formatRate(data.revenue_share)} />
        <ChannelStat label={t.apptRate} value={formatRate(data.appt_rate)} />
        <ChannelStat label={t.attendRate} value={formatRate(data.attend_rate)} />
        <ChannelStat label={t.paidRate} value={formatRate(data.paid_rate)} />
        <ChannelStat label={t.asp} value={formatRevenue(data.asp)} />
      </div>
    </div>
  );
}

function ChannelStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
      <span className="text-[10px] font-mono tabular-nums text-[var(--text-secondary)]">
        {value}
      </span>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export function TargetRecommender() {
  const [lang, setLang] = useState<Lang>('zh');
  const t = I18N[lang];

  const [selectedTier, setSelectedTier] = useState<TierKey>('stable');
  const [applyStatus, setApplyStatus] = useState<'idle' | 'applying' | 'success' | 'error'>('idle');

  const { data, isLoading, error, mutate } = useSWR<WmaRecommendResult>(
    '/api/config/targets/recommend',
    swrFetcher
  );

  async function handleApply() {
    setApplyStatus('applying');
    try {
      const res = await fetch(`/api/config/targets/apply?tier=${selectedTier}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail || 'apply failed');
      }
      setApplyStatus('success');
      setTimeout(() => setApplyStatus('idle'), 3000);
    } catch {
      setApplyStatus('error');
      setTimeout(() => setApplyStatus('idle'), 3000);
    }
  }

  return (
    <div className="card-base p-6">
      {/* 标题行 */}
      <div className="flex items-start justify-between mb-1 gap-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{t.title}</h3>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{t.subtitle}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {(['zh', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                lang === l
                  ? 'border-[var(--brand-p2)] bg-[var(--color-accent-surface)] text-[var(--brand-p2)] font-semibold'
                  : 'border-[var(--border-default)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-[var(--border-subtle)] my-4" />

      {/* 算法元信息 */}
      {data && (
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--text-muted)]">
          <span>
            {t.method}：<span className="font-mono">{data.method}</span>
          </span>
          <span>
            {t.basisMonths}：{data.basis_months.join(', ')}
          </span>
        </div>
      )}

      {/* 内容区 */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <SkeletonChart className="w-full h-48" />
        </div>
      ) : error ? (
        <div className="text-center space-y-2 py-8">
          <p className="text-base font-semibold text-red-600">{t.error}</p>
          <p className="text-sm text-[var(--text-muted)]">{t.errorHint}</p>
          <button
            onClick={() => mutate()}
            className="mt-1 px-4 py-1.5 rounded-lg text-sm border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            {t.retry}
          </button>
        </div>
      ) : data?.message ? (
        <div className="text-center py-12 space-y-3">
          <div className="text-4xl">📊</div>
          <p className="text-base font-semibold text-[var(--text-primary)]">{t.noData}</p>
          <p className="text-sm text-[var(--text-muted)]">{t.noDataHint}</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)]">
            <span className="text-sm text-[var(--text-secondary)]">
              {t.needMonths} {3 - data.data_months} {t.monthsUnit}
            </span>
          </div>
        </div>
      ) : data?.tiers ? (
        <>
          {/* 三档卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {TIER_STYLES.map((style) => {
              const tier = data.tiers[style.key];
              if (!tier) return null;
              return (
                <TierCard
                  key={style.key}
                  tierKey={style.key}
                  tier={tier}
                  style={style}
                  t={t}
                  isSelected={selectedTier === style.key}
                  isDefault={data.default_tier === style.key}
                  onSelect={() => setSelectedTier(style.key)}
                />
              );
            })}
          </div>

          {/* 一键应用区 */}
          <div className="flex items-center gap-4 p-4 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-default)]">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {t[selectedTier]}：{formatRevenue(data.tiers[selectedTier]?.total.revenue_usd ?? 0)}{' '}
                业绩目标
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                注册 {data.tiers[selectedTier]?.total.registrations.toLocaleString() ?? 0} · 付费{' '}
                {data.tiers[selectedTier]?.total.payments.toLocaleString() ?? 0}
              </p>
            </div>
            <button
              onClick={handleApply}
              disabled={applyStatus === 'applying' || applyStatus === 'success'}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                applyStatus === 'success'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : applyStatus === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-[var(--brand-p2)] text-white hover:bg-[var(--brand-p2-hover)] disabled:opacity-60'
              }`}
            >
              {applyStatus === 'applying'
                ? t.applying
                : applyStatus === 'success'
                  ? `✓ ${t.applySuccess}`
                  : applyStatus === 'error'
                    ? `✗ ${t.applyError}`
                    : t.apply}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
