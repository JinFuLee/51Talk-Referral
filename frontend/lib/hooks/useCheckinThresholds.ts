'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CheckinThresholds {
  /** ≥ good = 绿色达标 (默认 0.6) */
  good: number;
  /** ≥ warning = 黄色接近 (默认 0.4) */
  warning: number;
}

const STORAGE_KEY = 'checkin_thresholds';

const DEFAULT_THRESHOLDS: CheckinThresholds = {
  good: 0.6,
  warning: 0.4,
};

function loadThresholds(): CheckinThresholds {
  if (typeof window === 'undefined') return DEFAULT_THRESHOLDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CheckinThresholds>;
      return {
        good: typeof parsed.good === 'number' ? parsed.good : DEFAULT_THRESHOLDS.good,
        warning: typeof parsed.warning === 'number' ? parsed.warning : DEFAULT_THRESHOLDS.warning,
      };
    }
  } catch {
    /* fallback */
  }
  return DEFAULT_THRESHOLDS;
}

export function saveThresholds(thresholds: CheckinThresholds) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
    window.dispatchEvent(new Event('checkin-thresholds-changed'));
  } catch {
    /* ignore */
  }
}

/**
 * 读取打卡率阈值配置 + 监听变更。
 * 返回 thresholds + 颜色工具函数（自动使用配置阈值）。
 */
export function useCheckinThresholds() {
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);

  const reload = useCallback(() => setThresholds(loadThresholds()), []);

  useEffect(() => {
    reload();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) reload();
    };
    const onCustom = () => reload();
    window.addEventListener('storage', onStorage);
    window.addEventListener('checkin-thresholds-changed', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('checkin-thresholds-changed', onCustom);
    };
  }, [reload]);

  /** 打卡率文字颜色 class */
  function rateColor(rate: number): string {
    if (rate >= thresholds.good) return 'text-green-600';
    if (rate >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  }

  /** 打卡率背景色 class (用于 badge) */
  function rateBg(rate: number): string {
    if (rate >= thresholds.good) return 'bg-green-50 text-green-700 border-green-200';
    if (rate >= thresholds.warning) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-red-50 text-red-600 border-red-200';
  }

  /** 图例文案 */
  const legend = {
    good: `≥${Math.round(thresholds.good * 100)}% 达标`,
    warning: `${Math.round(thresholds.warning * 100)}–${Math.round(thresholds.good * 100)}% 接近`,
    bad: `<${Math.round(thresholds.warning * 100)}% 落后`,
  };

  return { thresholds, rateColor, rateBg, legend };
}
