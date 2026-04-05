'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import type {
  Campaign,
  CampaignProgress,
  LeverRecommendation,
  IncentiveBudget,
  PersonProgress,
} from '@/lib/types/incentive';
import { getMetricLabel, ROLE_METRICS } from '@/lib/types/incentive';
import { formatRate } from '@/lib/utils';

// ─── i18n ──────────────────────────────────────────────────────────────────

// ─── 工具函数 ──────────────────────────────────────────────────────────────

/** 将后端返回的中文 action_note 字符串映射到当前 locale 翻译 */
function translateActionNote(note: string, t: (key: string, params?: any) => string): string {
  if (!note) return '';
  if (
    note.includes('下月初创建') ||
    note.includes('下月初建立') ||
    note.includes('建议下月初创建') ||
    note === '建议下月初创建'
  ) {
    return t('actionNoteClosing');
  }
  if (note.includes('2-3')) {
    return t('actionNoteLate');
  }
  if (note.includes('月中')) {
    return t('actionNoteMid');
  }
  return note; // unknown pattern — show as-is
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function progressStatusColor(status: PersonProgress['status']): string {
  switch (status) {
    case 'qualified':
      return 'bg-success-token';
    case 'close':
      return 'bg-warning-token';
    case 'in_progress':
      return 'bg-accent-token';
    default:
      return 'bg-n-200';
  }
}

function progressStatusBadge(status: PersonProgress['status']): string {
  switch (status) {
    case 'qualified':
      return 'text-success-token bg-success-surface';
    case 'close':
      return 'text-warning-token bg-warning-surface';
    case 'in_progress':
      return 'text-accent-token bg-accent-surface';
    default:
      return 'text-muted-token bg-subtle';
  }
}


function progressStatusLabel(status: PersonProgress['status'], t: (key: string, params?: any) => string): string {
  switch (status) {
    case 'qualified':
      return t('statusQualified');
    case 'close':
      return t('statusClose');
    case 'in_progress':
      return t('statusInProgress');
    default:
      return t('statusNotStarted');
  }
}

function campaignStatusLabel(status: Campaign['status'], t: (key: string, params?: any) => string): string {
  switch (status) {
    case 'active':
      return t('campaignActive');
    case 'paused':
      return t('campaignPaused');
    case 'completed':
      return t('campaignCompleted');
    case 'deleted':
      return t('campaignDeleted');
  }
}

function campaignStatusColor(status: Campaign['status']): string {
  switch (status) {
    case 'active':
      return 'text-success-token bg-success-surface';
    case 'paused':
      return 'text-warning-token bg-warning-surface';
    case 'completed':
      return 'text-accent-token bg-accent-surface';
    case 'deleted':
      return 'text-muted-token bg-subtle';
  }
}

// ─── 活动 Modal ────────────────────────────────────────────────────────────

interface CampaignModalProps {
  onClose: () => void;
  onSaved: () => void;
  prefill?: Partial<CampaignFormValues>;
  editCampaign?: Campaign;
  t: (key: string, params?: any) => string;
}

interface CampaignFormValues {
  name: string;
  name_th: string;
  role: 'CC' | 'SS' | 'LP';
  metric: string;
  operator: 'gte' | 'lte' | 'gt' | 'lt';
  threshold: string;
  reward_thb: string;
  start_date: string;
  end_date: string;
}

function getOperatorLabels(t: (key: string, params?: any) => string): Record<string, string> {
  return {
    gte: t('operatorGte'),
    lte: t('operatorLte'),
    gt: t('operatorGt'),
    lt: t('operatorLt'),
  };
}

function CampaignModal({ onClose, onSaved, prefill, editCampaign, t }: CampaignModalProps) {
  const month = getCurrentMonth();
  const locale = useLocale();
  const [form, setForm] = useState<CampaignFormValues>({
    name: editCampaign?.name ?? prefill?.name ?? '',
    name_th: editCampaign?.name_th ?? prefill?.name_th ?? '',
    role: editCampaign?.role ?? (prefill?.role as 'CC' | 'SS' | 'LP') ?? 'CC',
    metric: editCampaign?.metric ?? prefill?.metric ?? 'paid',
    operator:
      (editCampaign?.operator as CampaignFormValues['operator']) ?? prefill?.operator ?? 'gte',
    threshold:
      editCampaign?.threshold != null ? String(editCampaign.threshold) : (prefill?.threshold ?? ''),
    reward_thb:
      editCampaign?.reward_thb != null
        ? String(editCampaign.reward_thb)
        : (prefill?.reward_thb ?? ''),
    start_date: editCampaign?.start_date ?? prefill?.start_date ?? '',
    end_date: editCampaign?.end_date ?? prefill?.end_date ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableMetrics = ROLE_METRICS[form.role] ?? [];

  function handleRoleChange(role: 'CC' | 'SS' | 'LP') {
    const metrics = ROLE_METRICS[role] ?? [];
    setForm((p) => ({
      ...p,
      role,
      metric: metrics[0] ?? '',
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const threshold = parseFloat(form.threshold);
    const reward = parseFloat(form.reward_thb);
    if (!form.name.trim()) {
      setError(t('errNoName'));
      return;
    }
    if (isNaN(threshold)) {
      setError(t('errInvalidThreshold'));
      return;
    }
    if (isNaN(reward) || reward <= 0) {
      setError(t('errInvalidReward'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = editCampaign
        ? `/api/incentive/campaigns/${editCampaign.id}`
        : '/api/incentive/campaigns';
      const method = editCampaign ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          name_th: form.name_th.trim(),
          role: form.role,
          month,
          metric: form.metric,
          operator: form.operator,
          threshold,
          reward_thb: reward,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        }),
      });
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        setError(body?.detail || t('errDuplicateMetric'));
        setSaving(false);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail ?? `HTTP ${res.status}`);
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('errSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary-token">
            {editCampaign ? t('modalEditTitle') : t('modalCreateTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-token hover:text-primary-token transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* campaign name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary-token">
              {t('fieldCampaignName')} <span className="text-danger-token">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={t('fieldCampaignNamePlaceholder')}
              className="w-full px-3 py-2 border border-subtle-token rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-action"
            />
          </div>

          {/* Thai name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary-token">{t('fieldThaiName')}</label>
            <input
              type="text"
              value={form.name_th}
              onChange={(e) => setForm((p) => ({ ...p, name_th: e.target.value }))}
              placeholder={t('fieldThaiNamePlaceholder')}
              className="w-full px-3 py-2 border border-subtle-token rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-action"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* role */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary-token">
                {t('fieldRole')} <span className="text-danger-token">*</span>
              </label>
              <select
                value={form.role}
                onChange={(e) => handleRoleChange(e.target.value as 'CC' | 'SS' | 'LP')}
                className="w-full px-3 py-2 border border-subtle-token rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-action"
              >
                <option value="CC">{t('roleCC')}</option>
                <option value="SS">{t('roleSS')}</option>
                <option value="LP">{t('roleLP')}</option>
              </select>
            </div>

            {/* metric */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary-token">
                {t('fieldMetric')} <span className="text-danger-token">*</span>
              </label>
              <select
                value={form.metric}
                onChange={(e) => setForm((p) => ({ ...p, metric: e.target.value }))}
                className="w-full px-3 py-2 border border-subtle-token rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-action"
              >
                {availableMetrics.map((m) => (
                  <option key={m} value={m}>
                    {getMetricLabel(m, locale)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* operator */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary-token">
                {t('fieldCondition')} <span className="text-danger-token">*</span>
              </label>
              <select
                value={form.operator}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    operator: e.target.value as CampaignFormValues['operator'],
                  }))
                }
                className="w-full px-3 py-2 border border-subtle-token rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-action"
              >
                {Object.entries(getOperatorLabels(t)).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* threshold */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary-token">
                {t('fieldThreshold')} <span className="text-danger-token">*</span>
              </label>
              <input
                type="number"
                value={form.threshold}
                onChange={(e) => setForm((p) => ({ ...p, threshold: e.target.value }))}
                placeholder={t('fieldThresholdPlaceholder')}
                className="w-full px-3 py-2 border border-subtle-token rounded-lg text-sm font-mono bg-surface focus:outline-none focus:ring-2 focus:ring-action"
              />
            </div>
          </div>

          {/* reward */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary-token">
              {t('fieldReward')} <span className="text-danger-token">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={form.reward_thb}
              onChange={(e) => setForm((p) => ({ ...p, reward_thb: e.target.value }))}
              placeholder={t('fieldRewardPlaceholder')}
              className="w-full px-3 py-2 border border-subtle-token rounded-lg text-sm font-mono bg-surface focus:outline-none focus:ring-2 focus:ring-action"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* start date */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary-token">{t('fieldStartDate')}</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-subtle-token rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-action"
              />
            </div>

            {/* end date */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary-token">{t('fieldEndDate')}</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-subtle-token rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-action"
              />
            </div>
          </div>

          {error && <p className="text-xs text-danger-token">{error}</p>}

          <div className="flex items-center gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-secondary-token hover:text-primary-token transition-colors"
            >
              {t('btnCancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-action text-white rounded-lg text-sm font-medium hover:bg-action-active transition-colors disabled:opacity-50"
            >
              {saving ? t('btnSaving') : editCampaign ? t('btnUpdate') : t('btnCreate')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tab 1: 杠杆分析 ───────────────────────────────────────────────────────

function LeverageTab({ t }: { t: (key: string, params?: any) => string }) {
  const {
    data: raw,
    isLoading,
    error,
  } = useFilteredSWR<{
    levers: LeverRecommendation[];
    phase?: string;
    phase_label?: string;
    remaining_workdays?: number;
    note?: string;
  }>('/api/incentive/recommend');
  const data = raw?.levers ?? [];
  const month = getCurrentMonth();
  const { data: campaigns, mutate: mutateCampaigns } = useFilteredSWR<Campaign[]>(
    `/api/incentive/campaigns?month=${month}`
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [prefill, setPrefill] = useState<Partial<CampaignFormValues>>({});

  function hasExisting(metric: string): boolean {
    return (campaigns ?? []).some((c) => c.metric === metric && c.status === 'active');
  }

  function openCreateFromRec(rec: LeverRecommendation) {
    const sg = rec.suggested_campaign;
    const role = sg?.role as 'CC' | 'SS' | 'LP' | undefined;
    setPrefill({
      name: sg?.name ?? '',
      name_th: sg?.name_th ?? '',
      role: role,
      metric: sg?.metric,
      threshold: sg?.threshold != null ? String(sg.threshold) : undefined,
      reward_thb: sg?.reward_thb != null ? String(sg.reward_thb) : undefined,
      start_date: sg?.start_date ?? '',
      end_date: sg?.end_date ?? '',
    });
    setModalOpen(true);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <Spinner size="lg" />
          <p className="text-sm text-muted-token">{t('loadingLeverage')}</p>
        </div>
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <div className="py-16 text-center space-y-2">
        <p className="text-4xl">📊</p>
        <p className="text-sm font-medium text-primary-token">{t('leverageEmptyTitle')}</p>
        <p className="text-xs text-muted-token">{t('leverageEmptyDesc')}</p>
      </div>
    );
  }

  const top3 = data.slice(0, 3);
  const maxScore = Math.max(...top3.map((r) => r.leverage_score), 1);

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-token space-y-1">
        <p>{t('leverageDesc')}</p>
        {raw?.phase_label && (
          <p className="font-medium text-secondary-token">
            {t('leverageCurrentPhase')}
            {raw.phase_label}
            {raw.remaining_workdays != null &&
              `${t('leverageRemainingDays')}${raw.remaining_workdays}${t('leverageRemainingDaysSuffix')}`}
          </p>
        )}
        {raw?.note && <p className="text-warning-token">{raw.note}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {top3.map((rec) => {
          const sg = rec.suggested_campaign;
          const alreadyCreated = hasExisting(sg?.metric ?? '');
          return (
            <div key={rec.rank} className="card-base p-4 space-y-3">
              {/* 排名 + 阶段 */}
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-action text-white text-xs flex items-center justify-center font-bold">
                  {rec.rank}
                </span>
                <span className="text-sm font-semibold text-primary-token">
                  {t(`stageLabels.${rec.stage}`) ?? rec.stage_label ?? rec.stage}
                </span>
              </div>

              {/* 杠杆评分进度条 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-token">{t('leverageScore')}</span>
                  <span className="text-xs font-mono font-semibold text-primary-token">
                    {(rec.leverage_score ?? 0).toFixed(1)}
                  </span>
                </div>
                <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-action rounded-full transition-all"
                    style={{ width: `${(rec.leverage_score / maxScore) * 100}%` }}
                  />
                </div>
              </div>

              {/* 增量金额 */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-token">{t('leverageRevImpact')}</span>
                <span className="font-mono font-semibold text-success-token">
                  +${rec.revenue_impact_usd.toLocaleString()}
                </span>
              </div>

              {/* 转化率对比 */}
              {rec.current_rate != null && rec.target_rate != null && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-mono text-muted-token">{formatRate(rec.current_rate)}</span>
                  <span className="text-muted-token">→</span>
                  <span className="font-mono font-semibold text-primary-token">
                    {formatRate(rec.target_rate)}
                  </span>
                </div>
              )}

              {/* 推荐理由 */}
              {sg?.rationale && (
                <p className="text-[10px] text-muted-token leading-relaxed border-t border-subtle-token pt-2">
                  {t(`rationaleByStage.${rec.stage}`) ?? sg.rationale}
                </p>
              )}

              {/* 创建活动按钮（时间感知） */}
              {alreadyCreated ? (
                <div className="w-full py-1.5 text-xs font-medium text-muted-token border border-default-token rounded-lg text-center">
                  {t('leverageAlreadyCreated')}
                </div>
              ) : rec.actionable === false ? (
                <div className="w-full py-1.5 text-xs text-center space-y-0.5">
                  <div className="font-medium text-muted-token border border-default-token rounded-lg py-1.5">
                    {t('leverageNextMonth')}
                  </div>
                  {rec.action_note && (
                    <p className="text-[10px] text-muted-token">
                      {translateActionNote(rec.action_note, t)}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => openCreateFromRec(rec)}
                  className="w-full py-1.5 text-xs font-medium text-action border border-action rounded-lg hover:bg-action hover:text-white transition-colors"
                >
                  {t('leverageCreateBtn')}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <CampaignModal
          prefill={prefill}
          t={t}
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            setModalOpen(false);
            await mutateCampaigns();
          }}
        />
      )}
    </div>
  );
}

// ─── Tab 2: 活动管理 ───────────────────────────────────────────────────────

function CampaignsTab({ t }: { t: (key: string, params?: any) => string }) {
  const month = getCurrentMonth();
  const locale = useLocale();
  const { data, isLoading, error, mutate } = useFilteredSWR<Campaign[]>(
    `/api/incentive/campaigns?month=${month}`
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Campaign | undefined>();

  async function handlePauseResume(c: Campaign) {
    const nextStatus = c.status === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`/api/incentive/campaigns/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
    } catch {
      // 静默失败，UI 不更新
    }
  }

  async function handleDelete(c: Campaign) {
    if (!confirm(`${t('confirmDelete')}${c.name}${t('confirmDeleteSuffix')}`)) return;
    try {
      const res = await fetch(`/api/incentive/campaigns/${c.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
    } catch {
      // 静默失败
    }
  }

  async function handleGeneratePoster(c: Campaign) {
    try {
      const res = await fetch(`/api/incentive/campaigns/${c.id}/poster`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      alert(t('posterFailed'));
    }
  }

  function openCreate() {
    setEditTarget(undefined);
    setModalOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditTarget(c);
    setModalOpen(true);
  }

  const campaigns = data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-token">{t('campaignsMgmtDesc')}</p>
        <button onClick={openCreate} className="btn-primary px-3 py-1.5 text-xs font-medium">
          {t('campaignsNewBtn')}
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      )}

      {error && (
        <div className="py-4 text-center text-sm text-muted-token">{t('campaignsLoadFail')}</div>
      )}

      {!isLoading && campaigns.length === 0 && (
        <div className="py-12 text-center space-y-2">
          <p className="text-3xl">🎯</p>
          <p className="text-sm font-medium text-primary-token">{t('campaignsEmptyTitle')}</p>
          <p className="text-xs text-muted-token">{t('campaignsEmptyDesc')}</p>
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th text-left">{t('thCampaignName')}</th>
                <th className="slide-th text-center">{t('thRole')}</th>
                <th className="slide-th text-left">{t('thMetric')}</th>
                <th className="slide-th text-left">{t('thCondition')}</th>
                <th className="slide-th text-right">{t('thReward')}</th>
                <th className="slide-th text-center">{t('thProgress')}</th>
                <th className="slide-th text-center">{t('thStatus')}</th>
                <th className="slide-th text-center">{t('thActions')}</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => (
                <tr key={c.id} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="slide-td font-medium">
                    <div>{c.name}</div>
                    {c.name_th && <div className="text-[10px] text-muted-token">{c.name_th}</div>}
                  </td>
                  <td className="slide-td text-center">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-subtle text-secondary-token">
                      {c.role}
                    </span>
                  </td>
                  <td className="slide-td text-secondary-token">
                    {getMetricLabel(c.metric, locale)}
                  </td>
                  <td className="slide-td font-mono text-xs">
                    {c.operator === 'gte'
                      ? '≥'
                      : c.operator === 'lte'
                        ? '≤'
                        : c.operator === 'gt'
                          ? '>'
                          : '<'}{' '}
                    {c.threshold}
                  </td>
                  <td className="slide-td text-right font-mono font-semibold text-success-token">
                    ฿{c.reward_thb.toLocaleString()}
                  </td>
                  <td className="slide-td text-center text-xs">
                    {(c as Campaign & { qualified_count?: number; total_count?: number })
                      .qualified_count != null ? (
                      <span className="font-mono">
                        {
                          (c as Campaign & { qualified_count?: number; total_count?: number })
                            .qualified_count
                        }
                        /
                        {(c as Campaign & { qualified_count?: number; total_count?: number })
                          .total_count ?? '—'}
                      </span>
                    ) : (
                      <span className="text-muted-token">—</span>
                    )}
                  </td>
                  <td className="slide-td text-center">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${campaignStatusColor(c.status)}`}
                    >
                      {campaignStatusLabel(c.status, t)}
                    </span>
                  </td>
                  <td className="slide-td">
                    <div className="flex items-center gap-1.5 justify-center">
                      <button
                        onClick={() => openEdit(c)}
                        className="text-[10px] text-secondary-token hover:text-primary-token transition-colors"
                      >
                        {t('actionEdit')}
                      </button>
                      <button
                        onClick={() => handlePauseResume(c)}
                        className="text-[10px] text-secondary-token hover:text-warning-token transition-colors"
                      >
                        {c.status === 'active' ? t('actionPause') : t('actionResume')}
                      </button>
                      <button
                        onClick={() => handleGeneratePoster(c)}
                        className="text-[10px] text-secondary-token hover:text-accent-token transition-colors"
                      >
                        {t('actionPoster')}
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="text-[10px] text-secondary-token hover:text-danger-token transition-colors"
                      >
                        {t('actionDelete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <CampaignModal
          editCampaign={editTarget}
          t={t}
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            setModalOpen(false);
            await mutate();
          }}
        />
      )}
    </div>
  );
}

// ─── 进度条组件 ────────────────────────────────────────────────────────────

function ProgressBar({ pct, status }: { pct: number; status: PersonProgress['status'] }) {
  const clampedPct = Math.min(100, Math.max(0, pct));
  return (
    <div className="h-2 bg-subtle rounded-full overflow-hidden flex-1">
      <div
        className={`h-full rounded-full transition-all ${progressStatusColor(status)}`}
        style={{ width: `${clampedPct}%` }}
      />
    </div>
  );
}

// ─── 活动进度卡片 ──────────────────────────────────────────────────────────

function CampaignProgressCard({ item, t }: { item: CampaignProgress; t: (key: string, params?: any) => string }) {
  const { campaign, records, qualified_count, close_count, total_estimated_thb } = item;
  const locale = useLocale();

  return (
    <div className="card-base p-4 space-y-3">
      {/* 标题行 */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-sm font-semibold text-primary-token">{campaign.name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-token">{campaign.role}</span>
            <span className="text-[10px] text-muted-token">
              {getMetricLabel(campaign.metric, locale)}{' '}
              {campaign.operator === 'gte'
                ? '≥'
                : campaign.operator === 'lte'
                  ? '≤'
                  : campaign.operator === 'gt'
                    ? '>'
                    : '<'}{' '}
              {campaign.threshold}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-mono text-success-token font-semibold">
            {t('qualifiedCount')} {qualified_count}
            {t('personUnit') ? ` ${t('personUnit')}` : ''}
          </div>
          {close_count > 0 && (
            <div className="text-[10px] text-warning-token">
              {t('closeCount')} {close_count}
              {t('personUnit') ? ` ${t('personUnit')}` : ''}
            </div>
          )}
        </div>
      </div>

      {/* estimated payout */}
      <div className="flex items-center gap-1.5 text-xs py-1 px-2 bg-subtle rounded">
        <span className="text-muted-token">{t('estimatedPayout')}</span>
        <span className="font-mono font-semibold text-primary-token">
          ฿{total_estimated_thb.toLocaleString()}
        </span>
        <span className="text-muted-token">
          （฿{campaign.reward_thb.toLocaleString()} × {qualified_count}
          {t('personUnit') ? ` ${t('personUnit')}` : ''}）
        </span>
      </div>

      {/* person progress list */}
      {records.length === 0 ? (
        <p className="text-xs text-muted-token py-2 text-center">{t('noPersonData')}</p>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={`${r.person_name}-${r.team}`} className="flex items-center gap-2">
              {/* 姓名 + 团队 */}
              <div className="w-24 shrink-0">
                <div className="text-xs font-medium text-primary-token truncate">
                  {r.person_name}
                </div>
                <div className="text-[10px] text-muted-token truncate">{r.team}</div>
              </div>

              {/* 进度条 */}
              <ProgressBar pct={r.progress_pct * 100} status={r.status} />

              {/* 数值 */}
              <div className="w-12 text-right shrink-0">
                <span className="text-xs font-mono text-primary-token">
                  {r.metric_value ?? 0}/{r.threshold}
                </span>
              </div>

              {/* 状态标签 */}
              <div className="w-14 shrink-0">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${progressStatusBadge(r.status)}`}
                >
                  {r.status === 'qualified'
                    ? `฿${r.reward_thb.toLocaleString()}`
                    : progressStatusLabel(r.status, t)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: 实时进度 ───────────────────────────────────────────────────────

function ProgressTab({ t }: { t: (key: string, params?: any) => string }) {
  const month = getCurrentMonth();
  const {
    data: progressData,
    isLoading: progressLoading,
    error: progressError,
  } = useFilteredSWR<CampaignProgress[]>(`/api/incentive/progress?month=${month}`);
  const { data: budget, isLoading: budgetLoading } =
    useFilteredSWR<IncentiveBudget>('/api/incentive/budget');

  // 计算内场已消耗（所有活动 qualified_count × reward_thb 之和）
  const totalSpent = progressData
    ? progressData.reduce((sum, item) => sum + item.total_estimated_thb, 0)
    : 0;
  const indoorBudget = budget?.indoor_budget_thb ?? 0;
  const spentPct = indoorBudget > 0 ? Math.min(100, (totalSpent / indoorBudget) * 100) : 0;

  const items = progressData ?? [];

  return (
    <div className="space-y-4">
      {/* 预算状态条 */}
      {(!budgetLoading || budget) && (
        <Card title={t('budgetCardTitle')}>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary-token font-medium">{t('budgetIndoor')}</span>
                <span className="font-mono text-primary-token">
                  ฿{totalSpent.toLocaleString()} / ฿{indoorBudget.toLocaleString()}
                </span>
              </div>
              <div className="h-2.5 bg-subtle rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    spentPct >= 90
                      ? 'bg-danger-token'
                      : spentPct >= 70
                        ? 'bg-warning-token'
                        : 'bg-success-token'
                  }`}
                  style={{ width: `${spentPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-token">
                <span>
                  {(spentPct ?? 0).toFixed(1)}
                  {t('budgetConsumed')}
                </span>
                {indoorBudget > 0 && (
                  <span>
                    {t('budgetRemaining')}
                    {Math.max(0, indoorBudget - totalSpent).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 数据口径说明 */}
      <p className="text-xs text-muted-token">{t('dataRemark')}</p>

      {/* 活动进度列表 */}
      {progressLoading && (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      )}

      {progressError && (
        <div className="py-4 text-center text-sm text-muted-token">{t('progressLoadFail')}</div>
      )}

      {!progressLoading && items.length === 0 && (
        <div className="py-12 text-center space-y-2">
          <p className="text-3xl">🏆</p>
          <p className="text-sm font-medium text-primary-token">{t('progressEmptyTitle')}</p>
          <p className="text-xs text-muted-token">{t('progressEmptyDesc')}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {items.map((item) => (
          <CampaignProgressCard key={item.campaign.id} item={item} t={t} />
        ))}
      </div>
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────────────

type TabKey = 'leverage' | 'campaigns' | 'progress';

export default function IncentiveTrackingPage() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
  });
  const locale = useLocale();
  const t = useTranslations('incentiveTrackingPage');
  const [activeTab, setActiveTab] = useState<TabKey>('leverage');

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'leverage', label: t('tabLeverage') },
    { key: 'campaigns', label: t('tabCampaigns') },
    { key: 'progress', label: t('tabProgress') },
  ];

  return (
    <div className="space-y-4">
      {/* page header */}
      <div>
        <h1 className="page-title">{t('pageTitle')}</h1>
        <p className="text-sm text-secondary-token mt-1">{t('pageDesc')}</p>
      </div>

      {/* tab switcher */}
      <div className="flex gap-1 p-1 bg-subtle rounded-lg w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-surface text-primary-token shadow-sm'
                : 'text-secondary-token hover:text-primary-token'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* tab content */}
      {activeTab === 'leverage' && <LeverageTab t={t} />}
      {activeTab === 'campaigns' && <CampaignsTab t={t} />}
      {activeTab === 'progress' && <ProgressTab t={t} />}
    </div>
  );
}
