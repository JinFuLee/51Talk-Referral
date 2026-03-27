'use client';

import React, { useState, useCallback } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatUSD, formatRate, formatValue } from '@/lib/utils';
import { SkeletonChart } from '@/components/ui/Skeleton';

// ── 国际化 ───────────────────────────────────────────────────────────────────
const I18N = {
  zh: {
    title: '目标设定',
    subtitle: '基于三种业务场景的月度目标设定，选择档位后一键写入本月目标',
    companyRevLabel: '公司总业绩目标',
    referralShareLabel: '转介绍占比',
    companyRevPlaceholder: '600000',
    referralSharePlaceholder: '30',
    tierPace: '一档：稳达标',
    tierShare: '二档：占比达标',
    tierCustom: '三档：自定义',
    tierPaceDesc: '当前效率照跑到月底 = 肯定达标',
    tierShareDesc: '转介绍占公司总业绩目标反推全链路',
    tierCustomDesc: '填入关键参数，系统推算其余字段',
    registrations: '注册',
    appointments: '预约',
    attendance: '出席',
    payments: '付费',
    revenue: '业绩',
    asp: '客单价',
    regToPayRate: '注册→付费率',
    apptRate: '预约率',
    attendRate: '出席率',
    paidRate: '付费率',
    revenueShare: '业绩占比',
    channel: '渠道',
    total: '合计',
    channelPreview: '全链路拆解预览',
    apply: '应用此档',
    applying: '写入中…',
    applySuccess: '已写入本月目标',
    applyError: '写入失败，请重试',
    defaultBadge: '默认',
    selected: '已选',
    compute: '推算',
    computing: '推算中…',
    noData: '参数不足，无法计算',
    needCompanyRev: '请填入公司总业绩目标',
    needInput: '至少填入一个自定义参数',
    loading: '加载中…',
    error: '加载失败',
    errorHint: '请检查后端服务',
    retry: '重试',
    selectTier: '选择档位后点击应用',
    usd: 'USD',
    pct: '%',
  },
  en: {
    title: 'Target Setting',
    subtitle: 'Three-scenario monthly target setting, one-click apply',
    companyRevLabel: 'Company Revenue Target',
    referralShareLabel: 'Referral Share',
    companyRevPlaceholder: '600000',
    referralSharePlaceholder: '30',
    tierPace: 'Tier 1: Pace',
    tierShare: 'Tier 2: Share',
    tierCustom: 'Tier 3: Custom',
    tierPaceDesc: 'Current efficiency → guaranteed month-end target',
    tierShareDesc: 'Referral share of company target → full funnel backsolve',
    tierCustomDesc: 'Fill key params, system calculates the rest',
    registrations: 'Reg',
    appointments: 'Appt',
    attendance: 'Attend',
    payments: 'Paid',
    revenue: 'Revenue',
    asp: 'ASP',
    regToPayRate: 'Reg→Pay Rate',
    apptRate: 'Appt Rate',
    attendRate: 'Attend Rate',
    paidRate: 'Paid Rate',
    revenueShare: 'Rev Share',
    channel: 'Channel',
    total: 'Total',
    channelPreview: 'Full Funnel Channel Preview',
    apply: 'Apply',
    applying: 'Applying…',
    applySuccess: 'Applied to this month',
    applyError: 'Failed, please retry',
    defaultBadge: 'Default',
    selected: 'Selected',
    compute: 'Calculate',
    computing: 'Calculating…',
    noData: 'Insufficient params',
    needCompanyRev: 'Please enter company revenue target',
    needInput: 'Enter at least one custom param',
    loading: 'Loading…',
    error: 'Load failed',
    errorHint: 'Check backend service',
    retry: 'Retry',
    selectTier: 'Select a tier then click Apply',
    usd: 'USD',
    pct: '%',
  },
};

type Lang = 'zh' | 'en';
type T = (typeof I18N)['zh'];
type TierKey = 'pace' | 'share' | 'custom';

// ── API 类型（与后端 TargetTierEngine 输出对齐）─────────────────────────────
interface TierChannelData {
  registrations: number;
  appointments: number;
  attendance: number;
  payments: number;
  revenue_usd: number;
  revenue_share: number;
  appt_rate: number;
  attend_rate: number;
  paid_rate: number;
  asp: number;
}

interface TierTotal {
  registrations: number;
  appointments: number;
  attendance: number;
  payments: number;
  revenue_usd: number;
  asp: number;
  appt_rate: number;
  attend_rate: number;
  paid_rate: number;
  reg_to_pay_rate: number;
}

interface TierData {
  tier: string;
  label: string;
  total: TierTotal;
  channels: Record<string, TierChannelData>;
}

interface TiersResponse {
  tiers: {
    pace: TierData;
    share: TierData | null;
    custom: TierData | null;
  };
  default_tier: 'pace';
}

// ── 三档样式映射 ──────────────────────────────────────────────────────────────
const TIER_CONFIG: Record<
  TierKey,
  { border: string; bg: string; badgeClass: string; checkColor: string }
> = {
  pace: {
    border: 'border-[var(--brand-p2)]',
    bg: 'bg-[var(--color-accent-surface)]',
    badgeClass: 'bg-[var(--color-accent-subtle)] text-[var(--brand-p2)]',
    checkColor: 'text-[var(--brand-p2)]',
  },
  share: {
    border: 'border-[var(--color-success)]',
    bg: 'bg-[var(--color-success-surface)]',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    checkColor: 'text-[var(--color-success)]',
  },
  custom: {
    border: 'border-[var(--color-warning)]',
    bg: 'bg-[var(--color-warning-surface)]',
    badgeClass: 'bg-amber-100 text-amber-700',
    checkColor: 'text-[var(--color-warning)]',
  },
};

// ── 子组件：指标行 ────────────────────────────────────────────────────────────
function MetricRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-[var(--text-muted)] shrink-0">{label}</span>
      <span
        className={`text-xs font-mono tabular-nums text-right ${bold ? 'font-bold text-[var(--text-primary)]' : 'font-medium text-[var(--text-secondary)]'}`}
      >
        {value}
      </span>
    </div>
  );
}

// ── 子组件：只读档位卡片 ──────────────────────────────────────────────────────
function ReadonlyTierCard({
  tierKey,
  tierData,
  label,
  desc,
  isSelected,
  isDefault,
  onSelect,
  t,
}: {
  tierKey: TierKey;
  tierData: TierData | null;
  label: string;
  desc: string;
  isSelected: boolean;
  isDefault: boolean;
  onSelect: () => void;
  t: T;
}) {
  const cfg = TIER_CONFIG[tierKey];

  if (!tierData) {
    return (
      <div className="card-base flex flex-col gap-2 opacity-50 cursor-not-allowed select-none">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badgeClass}`}>
            {label}
          </span>
        </div>
        <p className="text-xs text-[var(--text-muted)]">{desc}</p>
        <p className="text-xs text-[var(--text-muted)] mt-2">{t.needCompanyRev}</p>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col rounded-xl border-2 p-4 cursor-pointer transition-all ${
        isSelected
          ? `${cfg.border} ${cfg.bg} shadow-md`
          : 'border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-default)] hover:shadow-sm'
      }`}
      onClick={onSelect}
    >
      {/* 已选标记 */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <span className={`text-base font-bold ${cfg.checkColor}`}>✓</span>
        </div>
      )}

      {/* 档位标题 */}
      <div className="mb-2 flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badgeClass}`}>
          {label}
        </span>
        {isDefault && <span className="badge-neutral">{t.defaultBadge}</span>}
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">{desc}</p>

      {/* 核心指标 */}
      <div className="space-y-1.5">
        <MetricRow label={t.registrations} value={formatValue(tierData.total.registrations)} bold />
        <MetricRow label={t.appointments} value={formatValue(tierData.total.appointments)} />
        <MetricRow label={t.attendance} value={formatValue(tierData.total.attendance)} />
        <MetricRow label={t.payments} value={formatValue(tierData.total.payments)} bold />
        <MetricRow label={t.revenue} value={formatUSD(tierData.total.revenue_usd)} bold />
        <MetricRow label={t.asp} value={formatUSD(tierData.total.asp)} />
        <MetricRow label={t.regToPayRate} value={formatRate(tierData.total.reg_to_pay_rate)} />
      </div>
    </div>
  );
}

// ── 子组件：自定义档位卡片 ────────────────────────────────────────────────────
function CustomTierCard({
  tierData,
  isSelected,
  customInputs,
  onCustomChange,
  onCompute,
  computing,
  onSelect,
  t,
}: {
  tierData: TierData | null;
  isSelected: boolean;
  customInputs: CustomInputs;
  onCustomChange: (key: keyof CustomInputs, val: string) => void;
  onCompute: () => void;
  computing: boolean;
  onSelect: () => void;
  t: T;
}) {
  const cfg = TIER_CONFIG.custom;

  return (
    <div
      className={`relative flex flex-col rounded-xl border-2 p-4 transition-all ${
        isSelected
          ? `${cfg.border} ${cfg.bg} shadow-md`
          : 'border-[var(--border-default)] bg-[var(--bg-surface)] hover:shadow-sm'
      }`}
      onClick={onSelect}
    >
      {/* 已选标记 */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <span className={`text-base font-bold ${cfg.checkColor}`}>✓</span>
        </div>
      )}

      <div className="mb-2 flex items-center gap-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badgeClass}`}>
          {t.tierCustom}
        </span>
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">{t.tierCustomDesc}</p>

      {/* 可编辑输入 */}
      <div className="space-y-2 mb-3" onClick={(e) => e.stopPropagation()}>
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-0.5 block">{t.revenue} (USD)</label>
          <input
            type="number"
            className="input-base text-xs"
            placeholder="180000"
            value={customInputs.revenue_target}
            onChange={(e) => onCustomChange('revenue_target', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-0.5 block">
            {t.regToPayRate} (%)
          </label>
          <input
            type="number"
            className="input-base text-xs"
            placeholder="19.3"
            step="0.1"
            value={customInputs.reg_to_pay_rate}
            onChange={(e) => onCustomChange('reg_to_pay_rate', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-0.5 block">{t.asp} (USD)</label>
          <input
            type="number"
            className="input-base text-xs"
            placeholder="950"
            value={customInputs.asp}
            onChange={(e) => onCustomChange('asp', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-0.5 block">{t.registrations}</label>
          <input
            type="number"
            className="input-base text-xs"
            placeholder=""
            value={customInputs.registrations}
            onChange={(e) => onCustomChange('registrations', e.target.value)}
          />
        </div>
      </div>

      {/* 推算按钮 */}
      <button
        className="btn-secondary text-xs py-1.5 mb-3"
        onClick={(e) => {
          e.stopPropagation();
          onCompute();
        }}
        disabled={computing}
      >
        {computing ? t.computing : t.compute}
      </button>

      {/* 推算结果 */}
      {tierData ? (
        <div className="space-y-1.5 border-t border-[var(--border-subtle)] pt-3">
          <MetricRow
            label={t.registrations}
            value={formatValue(tierData.total.registrations)}
            bold
          />
          <MetricRow label={t.appointments} value={formatValue(tierData.total.appointments)} />
          <MetricRow label={t.attendance} value={formatValue(tierData.total.attendance)} />
          <MetricRow label={t.payments} value={formatValue(tierData.total.payments)} bold />
          <MetricRow label={t.revenue} value={formatUSD(tierData.total.revenue_usd)} bold />
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)] italic">{t.needInput}</p>
      )}
    </div>
  );
}

// ── 子组件：全链路预览表 ──────────────────────────────────────────────────────
function ChannelPreviewTable({ tierData, t }: { tierData: TierData; t: T }) {
  const channels = Object.entries(tierData.channels);
  const total = tierData.total;

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="slide-thead-row">
            <th className="slide-th slide-th-left">{t.channel}</th>
            <th className="slide-th slide-th-right">{t.registrations}</th>
            <th className="slide-th slide-th-right">{t.appointments}</th>
            <th className="slide-th slide-th-right">{t.attendance}</th>
            <th className="slide-th slide-th-right">{t.payments}</th>
            <th className="slide-th slide-th-right">{t.revenue}</th>
            <th className="slide-th slide-th-right">{t.revenueShare}</th>
            <th className="slide-th slide-th-right">{t.apptRate}</th>
            <th className="slide-th slide-th-right">{t.attendRate}</th>
            <th className="slide-th slide-th-right">{t.paidRate}</th>
            <th className="slide-th slide-th-right">{t.asp}</th>
          </tr>
        </thead>
        <tbody>
          {channels.map(([name, ch], i) => (
            <tr key={name} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
              <td className="slide-td font-medium text-[var(--text-primary)]">{name}</td>
              <td className="slide-td slide-th-right font-mono tabular-nums">
                {formatValue(ch.registrations)}
              </td>
              <td className="slide-td slide-th-right font-mono tabular-nums">
                {formatValue(ch.appointments)}
              </td>
              <td className="slide-td slide-th-right font-mono tabular-nums">
                {formatValue(ch.attendance)}
              </td>
              <td className="slide-td slide-th-right font-mono tabular-nums">
                {formatValue(ch.payments)}
              </td>
              <td className="slide-td slide-th-right font-mono tabular-nums">
                {formatUSD(ch.revenue_usd)}
              </td>
              <td className="slide-td slide-th-right font-mono tabular-nums">
                {formatRate(ch.revenue_share)}
              </td>
              <td className="slide-td slide-th-right font-mono tabular-nums">
                {formatRate(ch.appt_rate)}
              </td>
              <td className="slide-td slide-th-right font-mono tabular-nums">
                {formatRate(ch.attend_rate)}
              </td>
              <td className="slide-td slide-th-right font-mono tabular-nums">
                {formatRate(ch.paid_rate)}
              </td>
              <td className="slide-td slide-th-right font-mono tabular-nums">
                {formatUSD(ch.asp)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="slide-tfoot-row">
            <td className="slide-td font-bold">{t.total}</td>
            <td className="slide-td slide-th-right font-mono tabular-nums font-bold">
              {formatValue(total.registrations)}
            </td>
            <td className="slide-td slide-th-right font-mono tabular-nums font-bold">
              {formatValue(total.appointments)}
            </td>
            <td className="slide-td slide-th-right font-mono tabular-nums font-bold">
              {formatValue(total.attendance)}
            </td>
            <td className="slide-td slide-th-right font-mono tabular-nums font-bold">
              {formatValue(total.payments)}
            </td>
            <td className="slide-td slide-th-right font-mono tabular-nums font-bold">
              {formatUSD(total.revenue_usd)}
            </td>
            <td className="slide-td slide-th-right font-mono tabular-nums">—</td>
            <td className="slide-td slide-th-right font-mono tabular-nums">
              {formatRate(total.appt_rate)}
            </td>
            <td className="slide-td slide-th-right font-mono tabular-nums">
              {formatRate(total.attend_rate)}
            </td>
            <td className="slide-td slide-th-right font-mono tabular-nums">
              {formatRate(total.paid_rate)}
            </td>
            <td className="slide-td slide-th-right font-mono tabular-nums">
              {formatUSD(total.asp)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── 自定义档位输入状态 ────────────────────────────────────────────────────────
interface CustomInputs {
  revenue_target: string;
  reg_to_pay_rate: string;
  asp: string;
  registrations: string;
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export function TargetRecommender() {
  const [lang, setLang] = useState<Lang>('zh');
  const t = I18N[lang];

  // 顶部输入
  const [companyRevenue, setCompanyRevenue] = useState('');
  const [referralShare, setReferralShare] = useState('30');

  // 三档选中状态
  const [selectedTier, setSelectedTier] = useState<TierKey>('pace');

  // 应用状态
  const [applyStatus, setApplyStatus] = useState<'idle' | 'applying' | 'success' | 'error'>('idle');

  // 自定义档位输入
  const [customInputs, setCustomInputs] = useState<CustomInputs>({
    revenue_target: '',
    reg_to_pay_rate: '',
    asp: '',
    registrations: '',
  });
  const [customTierData, setCustomTierData] = useState<TierData | null>(null);
  const [computing, setComputing] = useState(false);

  // 构建 API URL（pace 只读，share 需 company_revenue）
  const shareParam = companyRevenue
    ? `&company_revenue=${companyRevenue}&referral_share=${Number(referralShare) / 100}`
    : '';
  const tiersUrl = `/api/config/targets/tiers?include_pace=true${shareParam}`;

  const { data, isLoading, error, mutate } = useSWR<TiersResponse>(tiersUrl, swrFetcher);

  // 处理自定义字段变更
  const handleCustomChange = useCallback((key: keyof CustomInputs, val: string) => {
    setCustomInputs((prev) => ({ ...prev, [key]: val }));
    // 清空旧推算结果
    setCustomTierData(null);
  }, []);

  // 推算三档
  async function handleCompute() {
    setComputing(true);
    try {
      const customParams = new URLSearchParams();
      if (customInputs.revenue_target)
        customParams.set('revenue_target', customInputs.revenue_target);
      if (customInputs.reg_to_pay_rate)
        customParams.set('reg_to_pay_rate', String(Number(customInputs.reg_to_pay_rate) / 100));
      if (customInputs.asp) customParams.set('asp', customInputs.asp);
      if (customInputs.registrations) customParams.set('registrations', customInputs.registrations);
      if (companyRevenue) {
        customParams.set('company_revenue', companyRevenue);
        customParams.set('referral_share', String(Number(referralShare) / 100));
      }

      const url = `/api/config/targets/tiers?include_custom=true&${customParams.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('compute failed');
      const json: TiersResponse = await res.json();
      setCustomTierData(json.tiers.custom);
    } catch {
      setCustomTierData(null);
    } finally {
      setComputing(false);
    }
  }

  // 获取当前选中档位数据
  function getSelectedTierData(): TierData | null {
    if (selectedTier === 'custom') return customTierData;
    if (selectedTier === 'share') return data?.tiers.share ?? null;
    return data?.tiers.pace ?? null;
  }

  // 应用选中档位
  async function handleApply() {
    const tierData = getSelectedTierData();
    if (!tierData) return;

    setApplyStatus('applying');
    try {
      const body: Record<string, unknown> = { tier: selectedTier };
      if (companyRevenue) {
        body.company_revenue = Number(companyRevenue);
        body.referral_share = Number(referralShare) / 100;
      }
      if (selectedTier === 'custom') {
        const ci: Record<string, number> = {};
        if (customInputs.revenue_target) ci.revenue_target = Number(customInputs.revenue_target);
        if (customInputs.reg_to_pay_rate)
          ci.reg_to_pay_rate = Number(customInputs.reg_to_pay_rate) / 100;
        if (customInputs.asp) ci.asp = Number(customInputs.asp);
        if (customInputs.registrations) ci.registrations = Number(customInputs.registrations);
        body.custom_inputs = ci;
      }

      const res = await fetch(`/api/config/targets/apply?tier=${selectedTier}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { detail?: string })?.detail ?? 'apply failed');
      }
      setApplyStatus('success');
      setTimeout(() => setApplyStatus('idle'), 3000);
    } catch {
      setApplyStatus('error');
      setTimeout(() => setApplyStatus('idle'), 3000);
    }
  }

  const selectedTierData = getSelectedTierData();

  return (
    <div className="card-base p-6 space-y-6">
      {/* 标题行 */}
      <div className="flex items-start justify-between gap-4">
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

      <div className="border-b border-[var(--border-subtle)]" />

      {/* 顶部输入区 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            {t.companyRevLabel} ({t.usd})
          </label>
          <input
            type="number"
            className="input-base"
            placeholder={t.companyRevPlaceholder}
            value={companyRevenue}
            onChange={(e) => setCompanyRevenue(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            {t.referralShareLabel} ({t.pct})
          </label>
          <input
            type="number"
            className="input-base"
            placeholder={t.referralSharePlaceholder}
            min={0}
            max={100}
            step={1}
            value={referralShare}
            onChange={(e) => setReferralShare(e.target.value)}
          />
        </div>
      </div>

      {/* 内容区 */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <SkeletonChart className="w-full h-36" />
        </div>
      ) : error ? (
        <div className="state-error flex-col gap-2">
          <p className="text-base font-semibold">{t.error}</p>
          <p className="text-sm text-[var(--text-muted)]">{t.errorHint}</p>
          <button onClick={() => mutate()} className="btn-secondary mt-1">
            {t.retry}
          </button>
        </div>
      ) : (
        <>
          {/* 三档卡片横排 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 一档：稳达标（只读） */}
            <ReadonlyTierCard
              tierKey="pace"
              tierData={data?.tiers.pace ?? null}
              label={t.tierPace}
              desc={t.tierPaceDesc}
              isSelected={selectedTier === 'pace'}
              isDefault
              onSelect={() => setSelectedTier('pace')}
              t={t}
            />

            {/* 二档：占比达标（只读，需 company_revenue） */}
            <ReadonlyTierCard
              tierKey="share"
              tierData={data?.tiers.share ?? null}
              label={t.tierShare}
              desc={t.tierShareDesc}
              isSelected={selectedTier === 'share'}
              isDefault={false}
              onSelect={() => {
                if (data?.tiers.share) setSelectedTier('share');
              }}
              t={t}
            />

            {/* 三档：自定义（可编辑） */}
            <CustomTierCard
              tierData={customTierData}
              isSelected={selectedTier === 'custom'}
              customInputs={customInputs}
              onCustomChange={handleCustomChange}
              onCompute={handleCompute}
              computing={computing}
              onSelect={() => setSelectedTier('custom')}
              t={t}
            />
          </div>

          {/* 应用区 */}
          <div className="flex items-center gap-4 p-4 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-default)]">
            <div className="flex-1 min-w-0">
              {selectedTierData ? (
                <>
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {selectedTier === 'pace'
                      ? t.tierPace
                      : selectedTier === 'share'
                        ? t.tierShare
                        : t.tierCustom}
                    ：{formatUSD(selectedTierData.total.revenue_usd)} {t.usd}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {t.registrations} {formatValue(selectedTierData.total.registrations)} ·{' '}
                    {t.payments} {formatValue(selectedTierData.total.payments)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">{t.selectTier}</p>
              )}
            </div>
            <button
              onClick={handleApply}
              disabled={
                !selectedTierData || applyStatus === 'applying' || applyStatus === 'success'
              }
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                applyStatus === 'success'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : applyStatus === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-[var(--brand-p2)] text-white hover:bg-[var(--brand-p2-hover)]'
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

          {/* 全链路预览表 */}
          {selectedTierData && Object.keys(selectedTierData.channels).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
                {t.channelPreview}
              </h4>
              <ChannelPreviewTable tierData={selectedTierData} t={t} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
