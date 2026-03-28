'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import {
  type CheckinThresholds,
  DEFAULT_THRESHOLDS,
  useCheckinThresholds,
} from '@/lib/hooks/useCheckinThresholds';

export default function CheckinThresholdsCard() {
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
    <Card title="打卡率阈值配置">
      <div className="space-y-4">
        <p className="text-xs text-[var(--text-muted)]">
          设置打卡率的达标/接近/落后阈值，影响打卡管理页面所有颜色标注。
        </p>

        {isLoading && (
          <div className="py-2 text-center text-xs text-[var(--text-muted)]">加载中…</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* 达标阈值 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500" />
              达标阈值
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={Math.round(cfg.good * 100)}
                onChange={(e) => setCfg((p) => ({ ...p, good: Number(e.target.value) / 100 }))}
                className="w-20 px-2 py-1.5 border border-[var(--border-subtle)] rounded text-sm font-mono tabular-nums bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
              />
              <span className="text-xs text-[var(--text-muted)]">%</span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">≥ 此值显示绿色</p>
          </div>

          {/* 接近阈值 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-400" />
              接近阈值
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={99}
                step={1}
                value={Math.round(cfg.warning * 100)}
                onChange={(e) => setCfg((p) => ({ ...p, warning: Number(e.target.value) / 100 }))}
                className="w-20 px-2 py-1.5 border border-[var(--border-subtle)] rounded text-sm font-mono tabular-nums bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
              />
              <span className="text-xs text-[var(--text-muted)]">%</span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              ≥ 此值显示黄色，&lt; 此值显示红色
            </p>
          </div>
        </div>

        {/* 预览 */}
        <div className="flex items-center gap-3 text-xs py-2 px-3 bg-[var(--bg-subtle)] rounded">
          <span className="text-[var(--text-muted)]">预览：</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />≥
            {Math.round(cfg.good * 100)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />
            {Math.round(cfg.warning * 100)}–{Math.round(cfg.good * 100)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
            &lt;{Math.round(cfg.warning * 100)}%
          </span>
        </div>

        {/* 按钮 */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={handleReset}
            disabled={saving || isLoading}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
          >
            重置默认
          </button>
          <button
            onClick={handleSave}
            disabled={saving || isLoading}
            className="px-3 py-1 bg-action text-white rounded text-xs font-medium hover:bg-action-active transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-action disabled:opacity-40"
          >
            {saving ? '保存中…' : saved ? '已保存' : '保存'}
          </button>
        </div>
      </div>
    </Card>
  );
}
