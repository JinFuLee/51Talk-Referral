'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
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
      className={`rounded-lg border border-[var(--border-default)] border-l-4 ${borderColor} px-3 py-2.5 bg-[var(--bg-surface)]`}
    >
      <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
      <p className="text-sm font-bold font-mono tabular-nums text-[var(--text-primary)]">{value}</p>
      {sub && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{sub}</p>}
    </div>
  );
}

export function CCPerformanceDetail({ record, exchangeRate }: CCPerformanceDetailProps) {
  const { data: radarData, isLoading: radarLoading } = useSWR<CCRadarData>(
    record.cc_name ? `/api/cc-matrix/radar/${encodeURIComponent(record.cc_name)}` : null,
    swrFetcher
  );

  // 雷达图数据格式转换（CCRadarData 为扁平字段，手动映射）
  const radarChartData = radarData
    ? [
        {
          subject: '参与率',
          value: Math.round((radarData.participation ?? 0) * 100),
          fullMark: 100,
        },
        { subject: '转化率', value: Math.round((radarData.conversion ?? 0) * 100), fullMark: 100 },
        { subject: '打卡率', value: Math.round((radarData.checkin ?? 0) * 100), fullMark: 100 },
        { subject: '触达率', value: Math.round((radarData.reach ?? 0) * 100), fullMark: 100 },
        { subject: '带货比', value: Math.round((radarData.cargo_ratio ?? 0) * 100), fullMark: 100 },
      ]
    : [];

  const revenueGap = record.revenue?.gap ?? null;
  const remainingDaily = record.remaining_daily_avg ?? null;
  const paceDaily = record.pace_daily_needed ?? null;
  const currentDaily = record.current_daily_avg ?? null;
  const efficiencyLift = record.efficiency_lift_pct ?? null;

  return (
    <div className="border border-[var(--border-default)] rounded-xl bg-[var(--bg-subtle)] px-4 py-4 mt-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 左侧：雷达图 */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
          {record.cc_name} 战力雷达
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
          <div className="flex items-center justify-center h-40 text-xs text-[var(--text-muted)]">
            暂无战力雷达数据
          </div>
        )}
      </div>

      {/* 右侧：行动建议 */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
          今日行动指导
        </p>
        <div className="space-y-2">
          <ActionCard
            label="业绩缺口"
            value={revenueGap != null ? formatRevenue(Math.abs(revenueGap), exchangeRate) : '—'}
            sub={revenueGap != null && revenueGap >= 0 ? '已超额完成' : '距目标尚缺'}
            highlight={revenueGap != null && revenueGap >= 0 ? 'ok' : 'warn'}
          />
          <ActionCard
            label="达标需日均业绩"
            value={remainingDaily != null ? formatRevenue(remainingDaily, exchangeRate) : '—'}
            sub="完成月目标每天需新增业绩"
          />
          <ActionCard
            label="追进度需日均业绩"
            value={paceDaily != null ? formatRevenue(paceDaily, exchangeRate) : '—'}
            sub="追上时间进度线每天需新增"
          />
          <ActionCard
            label="当前日均业绩"
            value={currentDaily != null ? formatRevenue(currentDaily, exchangeRate) : '—'}
            sub="当前业绩节奏参考"
          />
          {efficiencyLift != null && (
            <ActionCard
              label="效率提升需求"
              value={`${(efficiencyLift * 100).toFixed(1)}%`}
              sub="需要相对当前日均提升的幅度"
              highlight={efficiencyLift <= 0 ? 'ok' : efficiencyLift > 0.2 ? 'warn' : undefined}
            />
          )}
        </div>

        {/* 过程指标摘要 */}
        <div className="mt-3 pt-3 border-t border-[var(--border-default)] grid grid-cols-3 gap-2">
          {[
            { label: '参与率', value: formatRate(record.participation_rate) },
            { label: '打卡率', value: formatRate(record.checkin_rate) },
            { label: '触达率', value: formatRate(record.cc_reach_rate) },
            {
              label: '带新系数',
              value: record.coefficient != null ? record.coefficient.toFixed(2) : '—',
            },
            { label: '注册', value: record.leads?.actual?.toLocaleString() ?? '—' },
            { label: '付费', value: record.paid?.actual?.toLocaleString() ?? '—' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-[10px] text-[var(--text-muted)]">{item.label}</p>
              <p className="text-xs font-semibold text-[var(--text-primary)] font-mono">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
