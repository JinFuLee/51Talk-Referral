'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';

import { formatRate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';
import { BrandDot } from '@/components/ui/BrandDot';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';
import type { FunnelResult, ScenarioResult } from '@/lib/types/funnel';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// 带邀约节点的完整漏斗类型
interface InvitationFunnelStage {
  name: string;
  target: number | null;
  actual: number | null;
  gap: number | null;
  achievement_rate: number | null;
  conversion_rate?: number | null;
}

interface InvitationStats {
  invitation_count: number | null;
  registration_invitation_rate: number | null;
  invitation_showup_rate: number | null;
}

interface InvitationFunnelResponse {
  stages: InvitationFunnelStage[];
  invitation: InvitationStats | null;
}

const GAP_COLORS: Record<string, string> = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#94a3b8',
};

function gapColor(gap: number) {
  if (gap > 0) return GAP_COLORS.positive;
  if (gap < 0) return GAP_COLORS.negative;
  return GAP_COLORS.neutral;
}

interface FunnelResponse {
  funnel: FunnelResult;
  scenario: ScenarioResult[];
}

export default function FunnelPage() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
    channel: true,
  });
  const locale = useLocale();
  const t = useTranslations('funnel');

  /** 将后端返回的中文 stage 名转换为当前 locale 对应标签，未命中时原样展示 */
  function stageName(name: string): string {
    try {
      return t(`stage_${name}`);
    } catch {
      return name;
    }
  }
  const {
    data: funnelData,
    isLoading: fLoading,
    error: fError,
    mutate: fMutate,
  } = useFilteredSWR<FunnelResult>('/api/funnel');
  const { data: scenarioRaw, isLoading: sLoading } = useFilteredSWR('/api/funnel/scenario');
  const { data: invitationData } = useFilteredSWR<InvitationFunnelResponse>(
    '/api/funnel/with-invitation'
  );
  const { exportCSV } = useExport();

  const isLoading = fLoading || sLoading;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-40 animate-pulse rounded-md bg-[var(--n-200)]" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-20" />
          ))}
        </div>
        <SkeletonChart className="h-48 w-full" />
      </div>
    );
  }

  if (fError) {
    return (
      <EmptyState
        title={t('loadFailed')}
        description={t('loadFailedDesc')}
        action={{ label: t('retry'), onClick: () => fMutate() }}
      />
    );
  }

  const stages = (funnelData?.stages ?? []).filter((s) => s.target != null || s.actual != null);

  // 后端直接返回兼容字段（stage/current_rate/scenario_rate/impact_*），无需 workaround 映射
  const scenarioList: ScenarioResult[] = scenarioRaw
    ? ([scenarioRaw].flat() as Record<string, unknown>[]).map((s) => ({
        stage: (s.stage ?? '') as string,
        current_rate: (s.current_rate ?? 0) as number,
        scenario_rate: (s.scenario_rate ?? 0) as number,
        impact_registrations: (s.impact_registrations ?? 0) as number,
        impact_payments: (s.impact_payments ?? 0) as number,
        impact_revenue: (s.impact_revenue ?? 0) as number,
      }))
    : [];
  // 仅展示有 stage 名称的条目（过滤无效空对象）
  const scenarios = scenarioList.filter((s) => !!s.stage);

  const conversionChartData = stages
    .filter((s) => s.conversion_rate !== undefined)
    .map((s) => ({
      name: stageName(s.name),
      actual: Number(((s.conversion_rate ?? 0) * 100).toFixed(1)),
      target: Number(((s.target_rate ?? 0) * 100).toFixed(1)),
      // rate_gap 后端未提供时，用 actual 转化率 vs target_rate 的差值着色；
      // 若 target_rate 也不存在，则用 conversion_rate 绝对值（>0 为绿色）
      gap:
        s.rate_gap != null
          ? s.rate_gap
          : s.target_rate != null
            ? (s.conversion_rate ?? 0) - s.target_rate
            : (s.conversion_rate ?? 0),
    }));

  // 带邀约节点的完整漏斗
  const invitationStages = invitationData?.stages ?? [];
  const invitationStats = invitationData?.invitation ?? null;

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10);
    const exportStages = (funnelData?.stages ?? []).filter(
      (s) => s.target != null || s.actual != null
    );
    exportCSV(
      exportStages as unknown as Record<string, unknown>[],
      [
        { key: 'name', label: t('exportStageLabel') },
        { key: 'target', label: t('exportTargetLabel') },
        { key: 'actual', label: t('exportActualLabel') },
        { key: 'gap', label: t('exportGapLabel') },
        { key: 'achievement_rate', label: t('exportAchLabel') },
        { key: 'conversion_rate', label: t('exportConvLabel') },
      ],
      `漏斗分析_${today}`
    );
  }

  // 找转化率最低的环节作为瓶颈
  const bottleneckStage = stages
    .filter((s) => s.achievement_rate != null)
    .sort((a, b) => (a.achievement_rate ?? 1) - (b.achievement_rate ?? 1))[0];
  const bestStage = stages
    .filter((s) => s.achievement_rate != null)
    .sort((a, b) => (b.achievement_rate ?? 0) - (a.achievement_rate ?? 0))[0];

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="page-title">{t('pageTitle')}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t('pageSubtitle')}</p>
        </div>
        <ExportButton onExportCsv={handleExport} />
      </div>

      {/* 漏斗 insight 卡片 */}
      {bottleneckStage && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--border-default)] border-l-4 border-l-amber-400 bg-[var(--color-warning-surface)] px-4 py-3">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {t('funnelDiagnosis')}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {t('bottleneckPrefix')}{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              {stageName(bottleneckStage.name)}
            </span>{' '}
            {t('bottleneckSuffix')}{' '}
            <span className="text-[var(--color-danger)] font-semibold">
              {bottleneckStage.achievement_rate != null
                ? `${Math.round(bottleneckStage.achievement_rate * 100)}%`
                : '—'}
            </span>
            {bestStage && bestStage.name !== bottleneckStage.name && (
              <>
                ；{stageName(bestStage.name)} {t('bestSuffix')}
                <span className="text-[var(--color-success)] font-semibold">
                  {bestStage.achievement_rate != null
                    ? `${Math.round(bestStage.achievement_rate * 100)}%`
                    : '—'}
                </span>
                ）
              </>
            )}
            。
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">
            {t('colorLegend')}
            <span className="text-[var(--color-success)] font-medium">
              {t('colorGreen')}
            </span> ·{' '}
            <span className="text-[var(--color-warning)] font-medium">{t('colorOrange')}</span> ·{' '}
            <span className="text-[var(--color-danger)] font-medium">{t('colorRed')}</span>
            {t('colorSuffix')}
          </p>
        </div>
      )}

      {/* 带邀约节点的完整 4 段漏斗 */}
      {(invitationStages.length > 0 || invitationStats) && (
        <Card title={t('invitationFunnelTitle')}>
          {/* 邀约汇总指标 */}
          {invitationStats && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-[var(--bg-subtle)] rounded-lg p-3">
                <p className="text-xs text-[var(--text-muted)] mb-1">{t('invitationTotal')}</p>
                <p className="text-xl font-bold text-[var(--text-primary)] font-mono tabular-nums">
                  {(invitationStats.invitation_count ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-[var(--bg-subtle)] rounded-lg p-3">
                <p className="text-xs text-[var(--text-muted)] mb-1">{t('regToInvRate')}</p>
                <p className="text-xl font-bold text-[var(--text-primary)] font-mono tabular-nums">
                  {invitationStats.registration_invitation_rate != null
                    ? formatRate(invitationStats.registration_invitation_rate)
                    : '—'}
                </p>
              </div>
              <div className="bg-[var(--bg-subtle)] rounded-lg p-3">
                <p className="text-xs text-[var(--text-muted)] mb-1">{t('invToShowRate')}</p>
                <p className="text-xl font-bold text-[var(--text-primary)] font-mono tabular-nums">
                  {invitationStats.invitation_showup_rate != null
                    ? formatRate(invitationStats.invitation_showup_rate)
                    : '—'}
                </p>
              </div>
            </div>
          )}
          {invitationStages.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="slide-thead-row">
                    <th className="slide-th text-left">{t('colStage')}</th>
                    <th className="slide-th text-right">{t('colTarget')}</th>
                    <th className="slide-th text-right">{t('colActual')}</th>
                    <th className="slide-th text-right">{t('colGap')}</th>
                    <th className="slide-th text-right">
                      <span className="inline-flex items-center justify-end gap-1">
                        {t('colAchRate')}
                        <BrandDot tooltip={t('achTooltip')} />
                      </span>
                    </th>
                    <th className="slide-th text-right">
                      <span className="inline-flex items-center justify-end gap-1">
                        {t('colConvRate')}
                        <BrandDot tooltip={t('convTooltip')} />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invitationStages.map((s, i) => (
                    <tr key={s.name} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                      <td className="slide-td font-medium">{stageName(s.name)}</td>
                      <td className="slide-td text-right font-mono tabular-nums text-[var(--text-secondary)]">
                        {s.target != null
                          ? s.name.includes('率')
                            ? formatRate(s.target)
                            : s.target.toLocaleString()
                          : '—'}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums font-semibold">
                        {s.actual != null
                          ? s.name.includes('率')
                            ? formatRate(s.actual)
                            : s.actual.toLocaleString()
                          : '—'}
                      </td>
                      <td
                        className={`slide-td text-right font-mono tabular-nums font-medium ${(s.gap ?? 0) >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}
                      >
                        {s.gap != null ? `${s.gap >= 0 ? '+' : ''}${s.gap.toLocaleString()}` : '—'}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums">
                        {s.achievement_rate != null ? formatRate(s.achievement_rate) : '—'}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums">
                        {s.conversion_rate != null ? formatRate(s.conversion_rate) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 漏斗环节表格 */}
      <Card title={t('funnelAchTitle')}>
        {stages.length === 0 ? (
          <EmptyState title={t('emptyFunnel')} description={t('emptyFunnelDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="slide-thead-row text-xs">
                  <th className="py-1.5 px-2 border-0 text-left">{t('colStage')}</th>
                  <th className="py-1.5 px-2 border-0 text-right">{t('colTarget')}</th>
                  <th className="py-1.5 px-2 border-0 text-right">{t('colActual')}</th>
                  <th className="py-1.5 px-2 border-0 text-right">{t('colGap')}</th>
                  <th className="py-1.5 px-2 border-0 text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      {t('colAchRate')}
                      <BrandDot tooltip={t('achTooltip')} />
                    </span>
                  </th>
                  <th className="py-1.5 px-2 border-0 text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      {t('colConvRate')}
                      <BrandDot tooltip={t('convTooltip')} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s) => (
                  <tr key={s.name} className="even:bg-[var(--bg-subtle)]">
                    <td className="py-2 px-2 text-xs font-medium">{stageName(s.name)}</td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {s.target != null
                        ? s.name.includes('率')
                          ? formatRate(s.target)
                          : s.target.toLocaleString()
                        : '—'}
                    </td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums font-semibold">
                      {s.actual != null
                        ? s.name.includes('率')
                          ? formatRate(s.actual)
                          : s.actual.toLocaleString()
                        : '—'}
                    </td>
                    <td
                      className={`py-1 px-2 text-xs text-right font-mono tabular-nums font-medium ${
                        (s.gap ?? 0) >= 0
                          ? 'text-[var(--color-success)]'
                          : 'text-[var(--color-danger)]'
                      }`}
                    >
                      {s.gap != null
                        ? s.name.includes('率')
                          ? `${(s.gap * 100).toFixed(1)}pp`
                          : `${s.gap >= 0 ? '+' : ''}${s.gap.toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                      <span
                        className={`font-medium ${
                          (s.achievement_rate ?? 0) >= 1
                            ? 'text-[var(--color-success)]'
                            : (s.achievement_rate ?? 0) >= 0.8
                              ? 'text-[var(--color-warning)]'
                              : 'text-[var(--color-danger)]'
                        }`}
                      >
                        {formatRate(s.achievement_rate)}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {s.conversion_rate !== undefined ? formatRate(s.conversion_rate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 转化率柱状图 */}
      {conversionChartData.length > 0 && (
        <Card title={t('convChartTitle')}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={conversionChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => `${v}%`}
                contentStyle={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md, 10px)',
                  boxShadow: 'var(--shadow-medium)',
                  fontSize: '12px',
                }}
                cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
              />
              <Bar
                dataKey="actual"
                name={t('colActual')}
                radius={[4, 4, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              >
                {conversionChartData.map((entry, i) => (
                  <Cell key={i} fill={gapColor(entry.gap)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* 场景推演表格 */}
      <Card title={t('scenarioTitle')}>
        {scenarios.length === 0 ? (
          <EmptyState title={t('emptyScenario')} description={t('emptyScenarioDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="slide-thead-row text-xs">
                  <th className="py-1.5 px-2 border-0 text-left">{t('colStage')}</th>
                  <th className="py-1.5 px-2 border-0 text-right">{t('colCurrentRate')}</th>
                  <th className="py-1.5 px-2 border-0 text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      {t('colScenarioRate')}
                      <BrandDot tooltip={t('scenarioRateTooltip')} />
                    </span>
                  </th>
                  <th className="py-1.5 px-2 border-0 text-right">{t('colImpactReg')}</th>
                  <th className="py-1.5 px-2 border-0 text-right">{t('colImpactPay')}</th>
                  <th className="py-1.5 px-2 border-0 text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      {t('colImpactRev')}
                      <BrandDot tooltip={t('impactRevTooltip')} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.stage} className="even:bg-[var(--bg-subtle)]">
                    <td className="py-2 px-2 text-xs font-medium">{stageName(s.stage)}</td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {formatRate(s.current_rate)}
                    </td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-action-accent font-medium">
                      {formatRate(s.scenario_rate)}
                    </td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                      +{(s.impact_registrations ?? 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                      +{(s.impact_payments ?? 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--color-success)] font-medium">
                      +${(s.impact_revenue ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
