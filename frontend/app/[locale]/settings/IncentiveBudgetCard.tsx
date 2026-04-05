'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import type { IncentiveBudget } from '@/lib/types/incentive';

interface Props {
  month: string;
}

export default function IncentiveBudgetCard({ month }: Props) {
  const t = useTranslations('IncentiveBudgetCard');
  const { data, mutate, isLoading } = useFilteredSWR<IncentiveBudget>('/api/incentive/budget');

  const [indoorBudget, setIndoorBudget] = useState('');
  const [outdoorBudget, setOutdoorBudget] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && data) {
      setIndoorBudget(String(data.indoor_budget_thb));
      setOutdoorBudget(String(data.outdoor_budget_thb));
    }
  }, [isLoading, data]);

  async function handleSave() {
    const indoor = parseFloat(indoorBudget);
    const outdoor = parseFloat(outdoorBudget);
    if (isNaN(indoor) || indoor < 0 || isNaN(outdoor) || outdoor < 0) {
      setError(t('invalidBudget'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/incentive/budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indoor_budget_thb: indoor,
          outdoor_budget_thb: outdoor,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title={t('cardTitle')}>
      <div className="space-y-4">
        <p className="text-xs text-muted-token">
          {t('desc')}
          {t('year')
            ? `${month.slice(0, 4)}${t('year')}${month.slice(4)}${t('month')}`
            : `${month.slice(0, 4)}-${month.slice(4)}`}
        </p>

        {isLoading && <div className="py-2 text-center text-xs text-muted-token">{t('loading')}</div>}

        <div className="grid grid-cols-2 gap-4">
          {/* indoor */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary-token flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-accent-token" />
              {t('indoor')}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                step={1000}
                value={indoorBudget}
                onChange={(e) => setIndoorBudget(e.target.value)}
                placeholder="35000"
                className="w-28 px-2 py-1.5 border border-subtle-token rounded text-sm font-mono tabular-nums bg-surface focus:outline-none focus:ring-2 focus:ring-action"
              />
              <span className="text-xs text-muted-token">฿</span>
            </div>
            <p className="text-[10px] text-muted-token">{t('indoorHint')}</p>
          </div>

          {/* outdoor */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary-token flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-accent-token" />
              {t('outdoor')}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                step={1000}
                value={outdoorBudget}
                onChange={(e) => setOutdoorBudget(e.target.value)}
                placeholder="20000"
                className="w-28 px-2 py-1.5 border border-subtle-token rounded text-sm font-mono tabular-nums bg-surface focus:outline-none focus:ring-2 focus:ring-action"
              />
              <span className="text-xs text-muted-token">฿</span>
            </div>
            <p className="text-[10px] text-muted-token">{t('outdoorHint')}</p>
          </div>
        </div>

        {error && <p className="text-xs text-danger-token">{error}</p>}

        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={handleSave}
            disabled={saving || isLoading}
            className="px-3 py-1 bg-action text-white rounded text-xs font-medium hover:bg-action-active transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-action disabled:opacity-40"
          >
            {saving ? t('savingBtn') : saved ? t('savedBtn') : t('saveBtn')}
          </button>
        </div>
      </div>
    </Card>
  );
}
