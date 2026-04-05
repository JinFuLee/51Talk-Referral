'use client';

import { useTranslations } from 'next-intl';
import { useLabel, FEASIBILITY_LABELS } from '@/lib/label-maps';
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
  const t = useTranslations('TargetSettingsCard');
  const label = useLabel();
  return (
    <>
      {/* 智能推荐 */}
      {recommendation && (
        <Card title={t('smartRec')}>
          <div className="space-y-2">
            <div className="text-xs text-secondary-token">
              {t('growthRates')} {formatRate(recommendation.growth_rates.reg)} {t('growthPaid')}{' '}
              {formatRate(recommendation.growth_rates.paid)} {t('growthRev')}{' '}
              {formatRate(recommendation.growth_rates.revenue)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['conservative', 'base', 'aggressive'] as const).map((key) => {
                const s = recommendation.scenarios[key];
                const colors: Record<typeof key, string> = {
                  conservative: 'border-action-accent-subtle bg-action-accent-surface',
                  base: 'border-success-token bg-success-surface',
                  aggressive: 'border-orange-200 bg-orange-50',
                };
                return (
                  <div key={key} className={`rounded-lg border p-3 ${colors[key]}`}>
                    <div className="font-medium text-sm text-primary-token">{s.label}</div>
                    <div className="text-xs text-secondary-token mb-2">×{s.multiplier}</div>
                    <div className="space-y-1 text-xs text-secondary-token">
                      <div>
                        {t('regTarget')} {s.summary.注册目标}
                      </div>
                      <div>
                        {t('paidTarget')} {s.summary.付费目标}
                      </div>
                      <div>
                        {t('revTarget')} ${s.summary.金额目标.toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => onApplyScenario(s)}
                      className="mt-2 w-full px-2 py-1 text-xs font-medium rounded bg-surface border border-subtle-token hover:bg-bg-primary transition-colors focus-visible:ring-2 focus-visible:ring-action"
                    >
                      {t('applyPlan')}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* 硬性目标 */}
      <Card title={t('hardTargets')}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-secondary-token mb-1 block">{t('hqRevTarget')}</label>
            <NumInput
              value={v2.hard.total_revenue}
              onChange={(v) => onUpdateHard({ total_revenue: v })}
              suffix="USD"
            />
            {v2.hard.total_revenue > 0 && (
              <span className="text-xs text-muted-token mt-1 block">
                ≈ {(v2.hard.total_revenue * exchangeRate).toLocaleString()} THB
              </span>
            )}
            {recommendation?.feasibility.score !== null &&
              recommendation?.feasibility.score !== undefined && (
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    recommendation.feasibility.confidence === 'high'
                      ? 'bg-success-surface text-success-token'
                      : recommendation.feasibility.confidence === 'medium'
                        ? 'bg-warning-surface text-warning-token'
                        : 'bg-danger-surface text-danger-token'
                  }`}
                >
                  <span>{label(FEASIBILITY_LABELS, recommendation.feasibility.label)}</span>
                  <span className="text-secondary-token">
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
                      className="flex items-center gap-2 text-xs text-secondary-token"
                    >
                      <span>{metric}:</span>
                      <span>
                        {d.actual.toLocaleString()} / {d.target.toLocaleString()}
                      </span>
                      <span
                        className={d.pace_ratio >= 1 ? 'text-success-token' : 'text-warning-token'}
                      >
                        ({t('rhythm')} {formatRate(d.pace_ratio, 0)})
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </div>
          <div>
            <label className="text-xs text-secondary-token mb-1 block">{t('displayCurrency')}</label>
            <select
              value={v2.hard.display_currency}
              onChange={(e) => onUpdateHard({ display_currency: e.target.value as 'THB' | 'USD' })}
              className="px-2 py-1 border border-subtle-token rounded text-sm focus-visible:ring-2 focus-visible:ring-action"
            >
              <option value="THB">THB</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-secondary-token mb-1 block">{t('referralPct')}</label>
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
            <label className="text-xs text-secondary-token mb-1 block">{t('referralRev')}</label>
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
