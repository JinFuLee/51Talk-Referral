'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { type CheckinThresholds, saveThresholds } from '@/lib/hooks/useCheckinThresholds';

const STORAGE_KEY = 'checkin_thresholds';

const DEFAULT: CheckinThresholds = { good: 0.6, warning: 0.4 };

function load(): CheckinThresholds {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<CheckinThresholds>;
      return {
        good: typeof p.good === 'number' ? p.good : DEFAULT.good,
        warning: typeof p.warning === 'number' ? p.warning : DEFAULT.warning,
      };
    }
  } catch {
    /* fallback */
  }
  return DEFAULT;
}

export default function CheckinThresholdsCard() {
  const [cfg, setCfg] = useState<CheckinThresholds>(DEFAULT);
  const [saved, setSaved] = useState(false);

  useEffect(() => setCfg(load()), []);

  function handleSave() {
    // 确保 good > warning > 0
    const good = Math.max(0.01, Math.min(1, cfg.good));
    const warning = Math.max(0, Math.min(good - 0.01, cfg.warning));
    const final = { good, warning };
    setCfg(final);
    saveThresholds(final);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    setCfg(DEFAULT);
    saveThresholds(DEFAULT);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card title="打卡率阈值配置">
      <div className="space-y-4">
        <p className="text-xs text-[var(--text-muted)]">
          设置打卡率的达标/接近/落后阈值，影响打卡管理页面所有颜色标注。
        </p>

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
                className="w-20 px-2 py-1.5 border border-[var(--border-subtle)] rounded text-sm font-mono tabular-nums bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-20 px-2 py-1.5 border border-[var(--border-subtle)] rounded text-sm font-mono tabular-nums bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            重置默认
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-brand-600 text-white rounded text-xs font-medium hover:bg-brand-700 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-500"
          >
            {saved ? '已保存' : '保存'}
          </button>
        </div>
      </div>
    </Card>
  );
}
