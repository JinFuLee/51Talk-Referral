'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import {
  type CheckinThresholds,
  DEFAULT_THRESHOLDS,
  useCheckinThresholds,
} from '@/lib/hooks/useCheckinThresholds';

export default function CheckinThresholdsCard() {
  const t = useTranslations('CheckinThresholdsCard');
  const { thresholds, update, isLoading } = useCheckinThresholds();
  const [cfg, setCfg] = useState<CheckinThresholds>(DEFAULT_THRESHOLDS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // 当 SWR 数据加载完成后同步到本地编辑状态
  // 依赖用原始值而非对象引用，避免无限循环
  useEffect(() => {
    if (!isLoading) {
      setCfg({ good: thresholds.good, warning: thresholds.warning });
    }
  }, [isLoading, thresholds.good, thresholds.warning]);

  async function handleSave() {
    // 确保 good > warning > 0
    const good = Math.max(0.01, Math.min(1, cfg.good));
    const warning = Math.max(0, Math.min(good - 0.01, cfg.warning));
    const final = { good, warning };
    setCfg(final);
    setSaving(true);
    try {
      await update(final);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      await update(DEFAULT_THRESHOLDS);
      setCfg(DEFAULT_THRESHOLDS);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title={t('cardTitle')}>
      <div className="space-y-4">
        <p className="text-xs text-muted-token">{t('desc')}</p>

        {isLoading && <div className="py-2 text-center text-xs text-muted-token">{t('loading')}</div>}

        <div className="grid grid-cols-2 gap-4">
          {/* good threshold */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary-token flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-success-token" />
              {t('goodLabel')}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={Math.round(cfg.good * 100)}
                onChange={(e) => setCfg((p) => ({ ...p, good: Number(e.target.value) / 100 }))}
                className="w-20 px-2 py-1.5 border border-subtle-token rounded text-sm font-mono tabular-nums bg-surface focus:outline-none focus:ring-2 focus:ring-action"
              />
              <span className="text-xs text-muted-token">%</span>
            </div>
            <p className="text-[10px] text-muted-token">{t('goodHint')}</p>
          </div>

          {/* warning threshold */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary-token flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-warning-token" />
              {t('warningLabel')}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={99}
                step={1}
                value={Math.round(cfg.warning * 100)}
                onChange={(e) => setCfg((p) => ({ ...p, warning: Number(e.target.value) / 100 }))}
                className="w-20 px-2 py-1.5 border border-subtle-token rounded text-sm font-mono tabular-nums bg-surface focus:outline-none focus:ring-2 focus:ring-action"
              />
              <span className="text-xs text-muted-token">%</span>
            </div>
            <p className="text-[10px] text-muted-token">{t('warningHint')}</p>
          </div>
        </div>

        {/* preview */}
        <div className="flex items-center gap-3 text-xs py-2 px-3 bg-subtle rounded">
          <span className="text-muted-token">{t('preview')}</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-success-token" />≥
            {Math.round(cfg.good * 100)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-warning-token" />
            {Math.round(cfg.warning * 100)}–{Math.round(cfg.good * 100)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-danger-token" />
            &lt;{Math.round(cfg.warning * 100)}%
          </span>
        </div>

        {/* 按钮 */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={handleReset}
            disabled={saving || isLoading}
            className="text-xs text-secondary-token hover:text-primary-token transition-colors disabled:opacity-40"
          >
            {t('resetBtn')}
          </button>
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
