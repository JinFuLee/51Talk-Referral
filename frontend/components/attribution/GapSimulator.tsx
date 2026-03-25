'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import type { SimulationResult } from '@/lib/types/cross-analysis';
import { formatRate } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';

const SEGMENTS = [
  { value: 'reg_to_appt', label: '注册→预约率' },
  { value: 'appt_to_attend', label: '预约→出席率' },
  { value: 'attend_to_pay', label: '出席→付费率' },
];

function achievementColor(rate: number): string {
  if (rate >= 1) return 'text-emerald-800';
  if (rate >= 0.5) return 'text-action-accent';
  return 'text-[var(--color-danger)]';
}

export function GapSimulator() {
  const [segment, setSegment] = useState('attend_to_pay');
  const [newRate, setNewRate] = useState(0.5);

  const url = `/api/attribution/simulation?segment=${encodeURIComponent(segment)}&new_rate=${newRate}`;
  const { data, isLoading, error } = useSWR<SimulationResult>(url, swrFetcher);

  const segmentLabel = SEGMENTS.find((s) => s.value === segment)?.label ?? segment;

  return (
    <div className="space-y-4">
      {/* 选择漏斗段 */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-muted)]">漏斗段</label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-action"
          >
            {SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label className="text-xs text-[var(--text-muted)]">
            目标转化率：
            <span className="font-semibold text-[var(--text-primary)]">{formatRate(newRate)}</span>
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
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* 预测结果 */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Spinner size="sm" /> 计算中…
        </div>
      )}

      {error && (
        <p className="text-xs text-[var(--color-danger)]">无法加载模拟数据，请检查后端服务</p>
      )}

      {data && !isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card-subtle">
            <p className="text-xs text-[var(--text-muted)]">当前 {segmentLabel}</p>
            <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
              {formatRate(data.current_rate)}
            </p>
          </div>

          <div className="card-subtle">
            <p className="text-xs text-[var(--text-muted)]">目标转化率</p>
            <p className="text-lg font-bold tabular-nums text-action-accent">
              {formatRate(data.new_rate)}
            </p>
          </div>

          <div className="card-subtle">
            <p className="text-xs text-[var(--text-muted)]">当前付费</p>
            <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
              {(data.current_paid ?? 0).toLocaleString()} 人
            </p>
          </div>

          <div className="card-subtle">
            <p className="text-xs text-[var(--text-muted)]">预测付费</p>
            <p className="text-lg font-bold tabular-nums text-emerald-800">
              {(data.new_paid ?? 0).toLocaleString()} 人
            </p>
          </div>

          {/* 预测达成率 */}
          <div className="col-span-2 sm:col-span-4 card-subtle flex items-center gap-3">
            <div>
              <p className="text-xs text-[var(--text-muted)]">预测达成率</p>
              <p
                className={`text-2xl font-bold tabular-nums ${achievementColor(data.predicted_achievement)}`}
              >
                {formatRate(data.predicted_achievement)}
              </p>
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              将 <strong className="text-[var(--text-primary)]">{segmentLabel}</strong> 从{' '}
              <strong>{formatRate(data.current_rate)}</strong> 提升到{' '}
              <strong>{formatRate(data.new_rate)}</strong>， 预计付费增加{' '}
              <strong className="text-emerald-800">
                +{((data.new_paid ?? 0) - (data.current_paid ?? 0)).toLocaleString()} 人
              </strong>
            </div>
          </div>
        </div>
      )}

      {!data && !isLoading && !error && (
        <p className="text-xs text-[var(--text-muted)]">调整上方参数查看预测结果</p>
      )}
    </div>
  );
}
