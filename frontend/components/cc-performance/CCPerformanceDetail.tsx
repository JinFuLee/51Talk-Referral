'use client';

import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRevenue, formatRate } from '@/lib/utils';
import type { CCPerformanceRecord } from '@/lib/types/cc-performance';
import type { CCRadarData } from '@/lib/types/cross-analysis';
import { Spinner } from '@/components/ui/Spinner';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { CHART_PALETTE } from '@/lib/chart-palette';
interface CCPerformanceDetailProps {
  record: CCPerformanceRecord;
  exchangeRate: number;
}

function ActionCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: 'warn' | 'ok';
}) {
  const borderColor =
    highlight === 'ok'
      ? 'border-l-emerald-500'
      : highlight === 'warn'
        ? 'border-l-amber-500'
        : 'border-l-[var(--color-accent)]';

  return (
    <div
      className={`rounded-lg border border-default-token border-l-4 ${borderColor} px-3 py-2.5 bg-surface`}
    >
      <p className="text-xs text-muted-token mb-0.5">{label}</p>
      <p className="text-sm font-bold font-mono tabular-nums text-primary-token">{value}</p>
      {sub && <p className="text-xs text-secondary-token mt-0.5">{sub}</p>}
    </div>
  );
}

export function CCPerformanceDetail({ record, exchangeRate }: CCPerformanceDetailProps) {
  const t = useTranslations('CCPerformanceDetail');

  const { data: radarData, isLoading: radarLoading } = useFilteredSWR<CCRadarData>(
    record.cc_name ? `/api/cc-matrix/radar/${encodeURIComponent(record.cc_name)}` : null
  );

  // 雷达图数据格式转换（CCRadarData 为扁平字段，手动映射）
  const radarChartData = radarData
    ? [
        {
          subject: t('radarParticipation'),
          value: Math.round((radarData.participation ?? 0) * 100),
          fullMark: 100,
        },
        {
          subject: t('radarConversion'),
          value: Math.round((radarData.conversion ?? 0) * 100),
          fullMark: 100,
        },
        {
          subject: t('radarCheckin'),
          value: Math.round((radarData.checkin ?? 0) * 100),
          fullMark: 100,
        },
        { subject: t('radarReach'), value: Math.round((radarData.reach ?? 0) * 100), fullMark: 100 },
        {
          subject: t('radarCargo'),
          value: Math.round((radarData.cargo_ratio ?? 0) * 100),
          fullMark: 100,
        },
      ]
    : [];

  const revenueGap = record.revenue?.gap ?? null;
  const remainingDaily = record.remaining_daily_avg ?? null;
  const paceDaily = record.pace_daily_needed ?? null;
  const currentDaily = record.current_daily_avg ?? null;
  const efficiencyLift = record.efficiency_lift_pct ?? null;

  return (
    <div className="border border-default-token rounded-xl bg-subtle px-4 py-4 mt-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 左侧：雷达图 */}
      <div>
        <p className="text-xs font-semibold text-secondary-token uppercase tracking-wide mb-2">
          {t('radarTitle', { name: record.cc_name })}
        </p>
        {radarLoading ? (
          <div className="flex items-center justify-center h-40">
            <Spinner size="sm" />
          </div>
        ) : radarChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarChartData}>
              <PolarGrid stroke="var(--border-default)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              />
              <Radar
                dataKey="value"
                stroke={CHART_PALETTE.c1}
                fill={CHART_PALETTE.c1}
                fillOpacity={0.25}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-xs text-muted-token">
            {t('noRadarData')}
          </div>
        )}
      </div>

      {/* 右侧：行动建议 */}
      <div>
        <p className="text-xs font-semibold text-secondary-token uppercase tracking-wide mb-2">
          {t('actionTitle')}
        </p>
        <div className="space-y-2">
          <ActionCard
            label={t('revenueGap')}
            value={revenueGap != null ? formatRevenue(Math.abs(revenueGap), exchangeRate) : '—'}
            sub={revenueGap != null && revenueGap >= 0 ? t('exceeded') : t('stillNeeded')}
            highlight={revenueGap != null && revenueGap >= 0 ? 'ok' : 'warn'}
          />
          <ActionCard
            label={t('dailyTarget')}
            value={remainingDaily != null ? formatRevenue(remainingDaily, exchangeRate) : '—'}
            sub={t('dailyTargetSub')}
          />
          <ActionCard
            label={t('dailyPace')}
            value={paceDaily != null ? formatRevenue(paceDaily, exchangeRate) : '—'}
            sub={t('dailyPaceSub')}
          />
          <ActionCard
            label={t('currentDaily')}
            value={currentDaily != null ? formatRevenue(currentDaily, exchangeRate) : '—'}
            sub={t('currentDailySub')}
          />
          {efficiencyLift != null && (
            <ActionCard
              label={t('efficiencyLift')}
              value={`${(efficiencyLift * 100).toFixed(1)}%`}
              sub={t('efficiencyLiftSub')}
              highlight={efficiencyLift <= 0 ? 'ok' : efficiencyLift > 0.2 ? 'warn' : undefined}
            />
          )}
        </div>

        {/* 过程指标摘要 */}
        <div className="mt-3 pt-3 border-t border-default-token grid grid-cols-3 gap-2">
          {[
            { label: t('participation'), value: formatRate(record.participation_rate) },
            { label: t('checkin'), value: formatRate(record.checkin_rate) },
            { label: t('reach'), value: formatRate(record.cc_reach_rate) },
            {
              label: t('coefficient'),
              value: record.coefficient != null ? record.coefficient.toFixed(2) : '—',
            },
            { label: t('registration'), value: record.leads?.actual?.toLocaleString() ?? '—' },
            { label: t('payment'), value: record.paid?.actual?.toLocaleString() ?? '—' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-[10px] text-muted-token">{item.label}</p>
              <p className="text-xs font-semibold text-primary-token font-mono">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
