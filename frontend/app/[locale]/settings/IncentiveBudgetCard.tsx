'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/Card';
import { swrFetcher } from '@/lib/api';
import type { IncentiveBudget } from '@/lib/types/incentive';

interface Props {
  month: string;
}

export default function IncentiveBudgetCard({ month }: Props) {
  const { data, mutate, isLoading } = useSWR<IncentiveBudget>('/api/incentive/budget', swrFetcher);

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
      setError('请输入有效的预算金额（≥0）');
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
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="激励预算配置">
      <div className="space-y-4">
        <p className="text-xs text-[var(--text-muted)]">
          设置当月内场与外场激励总预算（泰铢），进度页面将自动计算消耗比例。当前月份：
          {month.slice(0, 4)}年{month.slice(4)}月
        </p>

        {isLoading && (
          <div className="py-2 text-center text-xs text-[var(--text-muted)]">加载中…</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* 内场预算 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500" />
              内场激励预算
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                step={1000}
                value={indoorBudget}
                onChange={(e) => setIndoorBudget(e.target.value)}
                placeholder="如 35000"
                className="w-28 px-2 py-1.5 border border-[var(--border-subtle)] rounded text-sm font-mono tabular-nums bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
              />
              <span className="text-xs text-[var(--text-muted)]">฿</span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">对 CC/SS/LP 员工的内部奖励</p>
          </div>

          {/* 外场预算 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-purple-500" />
              外场激励预算
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                step={1000}
                value={outdoorBudget}
                onChange={(e) => setOutdoorBudget(e.target.value)}
                placeholder="如 20000"
                className="w-28 px-2 py-1.5 border border-[var(--border-subtle)] rounded text-sm font-mono tabular-nums bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
              />
              <span className="text-xs text-[var(--text-muted)]">฿</span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">对学员推荐人的外部奖励</p>
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* 按钮 */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={handleSave}
            disabled={saving || isLoading}
            className="px-3 py-1 bg-action text-white rounded text-xs font-medium hover:bg-action-active transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-action disabled:opacity-40"
          >
            {saving ? '保存中…' : saved ? '已保存' : '保存预算'}
          </button>
        </div>
      </div>
    </Card>
  );
}
