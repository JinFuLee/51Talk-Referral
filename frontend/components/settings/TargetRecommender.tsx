'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { TargetRecommendation } from '@/lib/types/report';

// ── 国际化 ───────────────────────────────────────
const I18N = {
  zh: {
    title: '目标推荐',
    subtitle: '基于历史趋势的三档月度目标推荐，选择后写入本月目标配置',
    conservative: '保守',
    moderate: '持平',
    aggressive: '激进',
    conservativeDesc: '基于近 3 月均值，低波动场景适用',
    moderateDesc: '基于近 6 月均值，常规增长预期',
    aggressiveDesc: '基于历史最佳月份，冲刺目标适用',
    registrations: '注册数',
    appointments: '预约数',
    payments: '付费数',
    revenue: '业绩目标',
    apptRate: '预约率',
    attendRate: '出席率',
    paidRate: '付费率',
    asp: '客单价',
    channelTargets: '口径拆分',
    select: '选择此档',
    selected: '已选择',
    confirm: '确认写入目标',
    confirmHint: '此操作将更新本月月度目标配置',
    writing: '写入中…',
    writeSuccess: '月度目标已更新',
    writeError: '写入失败，请重试',
    noData: '数据积累不足，需至少 3 个月历史数据',
    noDataHint: '目标推荐基于历史趋势计算，请先积累更多月度数据',
    needMonths: '需积累',
    monthsUnit: '月数据',
    error: '数据加载失败',
    errorHint: '请检查后端服务是否正常运行',
    retry: '重试',
  },
  en: {
    title: 'Target Recommender',
    subtitle: 'Three-tier monthly target recommendations based on historical trends',
    conservative: 'Conservative',
    moderate: 'Moderate',
    aggressive: 'Aggressive',
    conservativeDesc: 'Based on 3-month average, low volatility scenarios',
    moderateDesc: 'Based on 6-month average, normal growth expectation',
    aggressiveDesc: 'Based on historical best month, sprint targets',
    registrations: 'Registrations',
    appointments: 'Appointments',
    payments: 'Payments',
    revenue: 'Revenue Target',
    apptRate: 'Appt Rate',
    attendRate: 'Attend Rate',
    paidRate: 'Paid Rate',
    asp: 'ASP',
    channelTargets: 'Channel Targets',
    select: 'Select',
    selected: 'Selected',
    confirm: 'Confirm & Write Target',
    confirmHint: 'This will update the monthly target configuration',
    writing: 'Writing…',
    writeSuccess: 'Monthly targets updated',
    writeError: 'Write failed, please retry',
    noData: 'Insufficient data, need at least 3 months of history',
    noDataHint: 'Target recommendations require historical trend data',
    needMonths: 'Need',
    monthsUnit: 'months of data',
    error: 'Failed to load',
    errorHint: 'Please check if backend is running',
    retry: 'Retry',
  },
} as const;

type DailyReportSlice = { target_recommendations: TargetRecommendation[] };

interface TierConfig {
  tier: 'conservative' | 'moderate' | 'aggressive';
  color: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

const TIER_CONFIGS: TierConfig[] = [
  {
    tier: 'conservative',
    color: 'blue',
    borderColor: 'border-blue-200',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800',
    accentColor: 'text-blue-600',
  },
  {
    tier: 'moderate',
    color: 'green',
    borderColor: 'border-emerald-200',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    accentColor: 'text-emerald-600',
  },
  {
    tier: 'aggressive',
    color: 'orange',
    borderColor: 'border-orange-200',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-800',
    accentColor: 'text-orange-600',
  },
];

function TierCard({
  rec,
  config,
  t,
  isSelected,
  onSelect,
}: {
  rec: TargetRecommendation;
  config: TierConfig;
  t: (typeof I18N)['zh'];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const tierLabel =
    rec.tier === 'conservative'
      ? t.conservative
      : rec.tier === 'moderate'
        ? t.moderate
        : t.aggressive;

  const tierDesc =
    rec.tier === 'conservative'
      ? t.conservativeDesc
      : rec.tier === 'moderate'
        ? t.moderateDesc
        : t.aggressiveDesc;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 p-5 transition-all cursor-pointer ${
        isSelected
          ? `${config.borderColor} ${config.bgColor} shadow-md`
          : 'border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)] hover:shadow-sm'
      }`}
      onClick={onSelect}
    >
      {/* 已选标记 */}
      {isSelected && (
        <div
          className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center ${config.bgColor} ${config.borderColor} border`}
        >
          <span className={`text-xs font-bold ${config.textColor}`}>✓</span>
        </div>
      )}

      {/* 档位标题 */}
      <div className="mb-3">
        <span
          className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full ${config.bgColor} ${config.textColor} border ${config.borderColor}`}
        >
          {tierLabel}
        </span>
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">{tierDesc}</p>
      </div>

      {/* 核心指标 */}
      <div className="space-y-2 mb-4">
        <MetricRow
          label={t.registrations}
          value={rec.registrations.toLocaleString()}
          isSelected={isSelected}
          accentColor={config.accentColor}
        />
        <MetricRow
          label={t.payments}
          value={rec.payments.toLocaleString()}
          isSelected={isSelected}
          accentColor={config.accentColor}
        />
        <MetricRow
          label={t.revenue}
          value={formatRevenue(rec.revenue_usd)}
          isSelected={isSelected}
          accentColor={config.accentColor}
          isBold
        />
        <MetricRow
          label={t.asp}
          value={formatRevenue(rec.asp)}
          isSelected={isSelected}
          accentColor={config.accentColor}
        />
      </div>

      {/* 效率目标 */}
      <div className="border-t border-[var(--border-subtle)] pt-3 space-y-1.5">
        <RateRow label={t.apptRate} value={rec.appt_rate} />
        <RateRow label={t.attendRate} value={rec.attend_rate} />
        <RateRow label={t.paidRate} value={rec.paid_rate} />
      </div>

      {/* 口径拆分（折叠展示） */}
      {Object.keys(rec.channel_targets).length > 0 && (
        <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
          <p className="text-xs text-[var(--text-muted)] mb-1.5">{t.channelTargets}</p>
          <div className="space-y-1">
            {Object.entries(rec.channel_targets).map(([ch, target]) => (
              <div key={ch} className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">{ch}</span>
                <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                  {target.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 选择按钮 */}
      <button
        className={`mt-4 w-full py-2 rounded-xl text-xs font-semibold transition-colors ${
          isSelected
            ? `${config.bgColor} ${config.textColor} border ${config.borderColor}`
            : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--bg-primary)]'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {isSelected ? `✓ ${t.selected}` : t.select}
      </button>
    </div>
  );
}

function MetricRow({
  label,
  value,
  isSelected,
  accentColor,
  isBold = false,
}: {
  label: string;
  value: string;
  isSelected: boolean;
  accentColor: string;
  isBold?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span
        className={`text-xs font-mono tabular-nums ${isBold ? 'font-bold' : 'font-medium'} ${isSelected ? accentColor : 'text-[var(--text-secondary)]'}`}
      >
        {value}
      </span>
    </div>
  );
}

function RateRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
        {formatRate(value)}
      </span>
    </div>
  );
}

export function TargetRecommender() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const t = I18N[lang];
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [writeStatus, setWriteStatus] = useState<'idle' | 'writing' | 'success' | 'error'>('idle');

  const { data, isLoading, error, mutate } = useSWR<TargetRecommendation[]>(
    '/api/report/daily',
    (url: string) =>
      (swrFetcher(url) as Promise<DailyReportSlice>).then((d) => d?.target_recommendations ?? [])
  );

  const recommendations = data ?? [];

  async function handleConfirm() {
    if (!selectedTier) return;
    const selected = recommendations.find((r) => r.tier === selectedTier);
    if (!selected) return;

    setWriteStatus('writing');
    try {
      const res = await fetch('/api/config/targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected),
      });
      if (!res.ok) throw new Error('Write failed');
      setWriteStatus('success');
      setTimeout(() => setWriteStatus('idle'), 3000);
    } catch {
      setWriteStatus('error');
      setTimeout(() => setWriteStatus('idle'), 3000);
    }
  }

  return (
    <div className="card-base p-6">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{t.title}</h3>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{t.subtitle}</p>
        </div>
        {/* 语言切换 */}
        <div className="flex gap-1">
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
      ) : recommendations.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="text-4xl">📊</div>
          <p className="text-base font-semibold text-[var(--text-primary)]">{t.noData}</p>
          <p className="text-sm text-[var(--text-muted)]">{t.noDataHint}</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)]">
            <span className="text-sm text-[var(--text-secondary)]">
              {t.needMonths} 3 {t.monthsUnit}
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* 三档卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {TIER_CONFIGS.map((config) => {
              const rec = recommendations.find((r) => r.tier === config.tier);
              if (!rec) return null;
              return (
                <TierCard
                  key={config.tier}
                  rec={rec}
                  config={config}
                  t={t}
                  isSelected={selectedTier === config.tier}
                  onSelect={() => setSelectedTier(config.tier)}
                />
              );
            })}
          </div>

          {/* 确认按钮区域 */}
          {selectedTier && (
            <div className="flex items-center gap-4 p-4 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-default)]">
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {(() => {
                    const label =
                      selectedTier === 'conservative'
                        ? t.conservative
                        : selectedTier === 'moderate'
                          ? t.moderate
                          : t.aggressive;
                    return `已选择：${label}档目标`;
                  })()}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{t.confirmHint}</p>
              </div>
              <button
                onClick={handleConfirm}
                disabled={writeStatus === 'writing' || writeStatus === 'success'}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                  writeStatus === 'success'
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : writeStatus === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-[var(--brand-p2)] text-white hover:bg-[var(--brand-p2-hover)] disabled:opacity-60'
                }`}
              >
                {writeStatus === 'writing'
                  ? t.writing
                  : writeStatus === 'success'
                    ? `✓ ${t.writeSuccess}`
                    : writeStatus === 'error'
                      ? `✗ ${t.writeError}`
                      : t.confirm}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
