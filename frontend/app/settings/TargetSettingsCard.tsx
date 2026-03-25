'use client';

import { Card } from '@/components/ui/Card';
import { formatRate } from '@/lib/utils';
import { NumInput, PctInput } from '@/components/ui/NumInput';
import type {
  HardTarget,
  MonthlyTargetV2,
  TargetRecommendation,
  TargetScenario,
} from '@/lib/types';

interface TargetSettingsCardProps {
  v2: MonthlyTargetV2;
  exchangeRate: number;
  recommendation: TargetRecommendation | undefined;
  onUpdateHard: (patch: Partial<HardTarget>) => void;
  onApplyScenario: (scenario: TargetScenario) => void;
}

export default function TargetSettingsCard({
  v2,
  exchangeRate,
  recommendation,
  onUpdateHard,
  onApplyScenario,
}: TargetSettingsCardProps) {
  return (
    <>
      {/* 智能推荐 */}
      {recommendation && (
        <Card title="智能推荐">
          <div className="space-y-2">
            <div className="text-xs text-[var(--text-secondary)]">
              历史增长率：注册 {formatRate(recommendation.growth_rates.reg)} · 付费{' '}
              {formatRate(recommendation.growth_rates.paid)} · 收入{' '}
              {formatRate(recommendation.growth_rates.revenue)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['conservative', 'base', 'aggressive'] as const).map((key) => {
                const s = recommendation.scenarios[key];
                const colors: Record<typeof key, string> = {
                  conservative: 'border-action-accent-subtle bg-action-accent-surface',
                  base: 'border-green-200 bg-green-50',
                  aggressive: 'border-orange-200 bg-orange-50',
                };
                return (
                  <div key={key} className={`rounded-lg border p-3 ${colors[key]}`}>
                    <div className="font-medium text-sm text-[var(--text-primary)]">{s.label}</div>
                    <div className="text-xs text-[var(--text-secondary)] mb-2">×{s.multiplier}</div>
                    <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                      <div>注册: {s.summary.注册目标}</div>
                      <div>付费: {s.summary.付费目标}</div>
                      <div>收入: ${s.summary.金额目标.toLocaleString()}</div>
                    </div>
                    <button
                      onClick={() => onApplyScenario(s)}
                      className="mt-2 w-full px-2 py-1 text-xs font-medium rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:bg-[var(--bg-primary)] transition-colors focus-visible:ring-2 focus-visible:ring-action"
                    >
                      应用此方案
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* 硬性目标 */}
      <Card title="硬性目标 (L1)">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">HQ总业绩目标</label>
            <NumInput
              value={v2.hard.total_revenue}
              onChange={(v) => onUpdateHard({ total_revenue: v })}
              suffix="USD"
            />
            {v2.hard.total_revenue > 0 && (
              <span className="text-xs text-[var(--text-muted)] mt-1 block">
                ≈ {(v2.hard.total_revenue * exchangeRate).toLocaleString()} THB
              </span>
            )}
            {recommendation?.feasibility.score !== null &&
              recommendation?.feasibility.score !== undefined && (
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    recommendation.feasibility.confidence === 'high'
                      ? 'bg-green-100 text-green-700'
                      : recommendation.feasibility.confidence === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  <span>{recommendation.feasibility.label}</span>
                  <span className="text-[var(--text-secondary)]">
                    ({recommendation.feasibility.probability})
                  </span>
                </div>
              )}
            {recommendation?.feasibility.detail &&
              Object.keys(recommendation.feasibility.detail).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(recommendation.feasibility.detail).map(([metric, d]) => (
                    <div
                      key={metric}
                      className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
                    >
                      <span>{metric}:</span>
                      <span>
                        {d.actual.toLocaleString()} / {d.target.toLocaleString()}
                      </span>
                      <span className={d.pace_ratio >= 1 ? 'text-green-600' : 'text-yellow-600'}>
                        (节奏 {formatRate(d.pace_ratio, 0)})
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">显示币种</label>
            <select
              value={v2.hard.display_currency}
              onChange={(e) => onUpdateHard({ display_currency: e.target.value as 'THB' | 'USD' })}
              className="px-2 py-1 border border-[var(--border-subtle)] rounded text-sm focus-visible:ring-2 focus-visible:ring-action"
            >
              <option value="THB">THB</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">转介绍占比</label>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                checked={v2.hard.lock_field === 'pct'}
                onChange={() => onUpdateHard({ lock_field: 'pct' })}
                className="focus-visible:ring-2 focus-visible:ring-action"
              />
              <PctInput
                value={v2.hard.referral_pct}
                onChange={(v) => onUpdateHard({ referral_pct: v })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">转介绍收入</label>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                checked={v2.hard.lock_field === 'amount'}
                onChange={() => onUpdateHard({ lock_field: 'amount' })}
                className="focus-visible:ring-2 focus-visible:ring-action"
              />
              <NumInput
                value={v2.hard.referral_revenue}
                onChange={(v) => onUpdateHard({ referral_revenue: v })}
                suffix="USD"
              />
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
