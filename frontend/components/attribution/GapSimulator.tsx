'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import type { SimulationResult } from '@/lib/types/cross-analysis';
import { formatRate } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
function achievementColor(rate: number): string {
  if (rate >= 1) return 'text-success-token';
  if (rate >= 0.5) return 'text-action-accent';
  return 'text-danger-token';
}

export function GapSimulator() {
  const [segment, setSegment] = useState('attend_to_pay');
  const [newRate, setNewRate] = useState(0.5);
    const t = useTranslations('GapSimulator');

  const SEGMENTS = [
    { value: 'reg_to_appt', label: t('segments.reg_to_appt') },
    { value: 'appt_to_attend', label: t('segments.appt_to_attend') },
    { value: 'attend_to_pay', label: t('segments.attend_to_pay') },
  ];

  const url = `/api/attribution/simulation?segment=${encodeURIComponent(segment)}&new_rate=${newRate}`;
  const { data, isLoading, error } = useFilteredSWR<SimulationResult>(url);

  const segmentLabel = SEGMENTS.find((s) => s.value === segment)?.label ?? segment;

  return (
    <div className="space-y-4">
      {/* 选择漏斗段 */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-token">{t('funnel')}</label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="text-sm rounded-lg border border-default-token bg-surface text-primary-token px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-action"
          >
            {SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label className="text-xs text-muted-token">
            {t('targetRate')}
            <span className="font-semibold text-primary-token">{formatRate(newRate)}</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={newRate}
            onChange={(e) => setNewRate(parseFloat(e.target.value))}
            className="w-full accent-action-accent"
          />
          <div className="flex justify-between text-xs text-muted-token">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* 预测结果 */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-token">
          <Spinner size="sm" /> {t('calculating')}
        </div>
      )}

      {error && <p className="text-xs text-danger-token">{t('errorMsg')}</p>}

      {data && !isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card-subtle">
            <p className="text-xs text-muted-token">
              {t('currentRate')} {segmentLabel}
            </p>
            <p className="text-lg font-bold tabular-nums text-primary-token">
              {formatRate(data.current_rate)}
            </p>
          </div>

          <div className="card-subtle">
            <p className="text-xs text-muted-token">{t('targetRateLabel')}</p>
            <p className="text-lg font-bold tabular-nums text-action-accent">
              {formatRate(data.new_rate)}
            </p>
          </div>

          <div className="card-subtle">
            <p className="text-xs text-muted-token">{t('currentPaid')}</p>
            <p className="text-lg font-bold tabular-nums text-primary-token">
              {(data.current_paid ?? 0).toLocaleString()} {t('people')}
            </p>
          </div>

          <div className="card-subtle">
            <p className="text-xs text-muted-token">{t('predictedPaid')}</p>
            <p className="text-lg font-bold tabular-nums text-success-token">
              {(data.new_paid ?? 0).toLocaleString()} {t('people')}
            </p>
          </div>

          {/* 预测达成率 */}
          <div className="col-span-2 sm:col-span-4 card-subtle flex items-center gap-3">
            <div>
              <p className="text-xs text-muted-token">{t('predictedAchievement')}</p>
              <p
                className={`text-2xl font-bold tabular-nums ${achievementColor(data.predicted_achievement)}`}
              >
                {formatRate(data.predicted_achievement)}
              </p>
            </div>
            <div className="text-xs text-muted-token">
              {t('raiseTo')} <strong className="text-primary-token">{segmentLabel}</strong> {t('from')}{' '}
              <strong>{formatRate(data.current_rate)}</strong> {t('to')}{' '}
              <strong>{formatRate(data.new_rate)}</strong>
              {t('predictPaidIncrease')}{' '}
              <strong className="text-success-token">
                +{((data.new_paid ?? 0) - (data.current_paid ?? 0)).toLocaleString()} {t('people')}
              </strong>
            </div>
          </div>
        </div>
      )}

      {!data && !isLoading && !error && <p className="text-xs text-muted-token">{t('hint')}</p>}
    </div>
  );
}
