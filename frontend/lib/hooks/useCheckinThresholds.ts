'use client';

import { useCallback } from 'react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { configAPI } from '@/lib/api';

export interface CheckinThresholds {
  /** ≥ good = 绿色达标 (默认 0.6) */
  good: number;
  /** ≥ warning = 黄色接近 (默认 0.4) */
  warning: number;
}

// 旧 localStorage key（一次性迁移用）
const STORAGE_KEY = 'checkin_thresholds';

export const DEFAULT_THRESHOLDS: CheckinThresholds = {
  good: 0.6,
  warning: 0.4,
};

/** 从 localStorage 读取旧数据（迁移用，读完即删） */
function readLocalStorageThresholds(): CheckinThresholds | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CheckinThresholds>;
      if (typeof parsed.good === 'number' || typeof parsed.warning === 'number') {
        return {
          good: typeof parsed.good === 'number' ? parsed.good : DEFAULT_THRESHOLDS.good,
          warning: typeof parsed.warning === 'number' ? parsed.warning : DEFAULT_THRESHOLDS.warning,
        };
      }
    }
  } catch {
    /* fallback */
  }
  return null;
}

/**
 * 读取打卡率阈值配置 + 监听变更。
 * 返回 thresholds + 颜色工具函数（自动使用配置阈值）。
 * 数据持久化到后端 API，localStorage 仅用于一次性迁移。
 */
export function useCheckinThresholds() {
  const { data, mutate, isLoading } = useFilteredSWR<CheckinThresholds>(
    '/api/config/checkin-thresholds',
    {
      // API 返回空时尝试一次性迁移 localStorage
      onSuccess: async (apiData) => {
        const hasData =
          apiData && (typeof apiData.good === 'number' || typeof apiData.warning === 'number');
        if (!hasData) {
          const legacy = readLocalStorageThresholds();
          if (legacy) {
            await configAPI.putCheckinThresholds(legacy);
            void mutate(legacy, false);
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {
              /* ignore */
            }
          }
        }
      },
    }
  );

  const thresholds: CheckinThresholds = {
    good: typeof data?.good === 'number' ? data.good : DEFAULT_THRESHOLDS.good,
    warning: typeof data?.warning === 'number' ? data.warning : DEFAULT_THRESHOLDS.warning,
  };

  const update = useCallback(
    async (newThresholds: CheckinThresholds) => {
      await configAPI.putCheckinThresholds(newThresholds);
      await mutate(newThresholds, false);
      // 通知同 tab 内其他组件刷新
      window.dispatchEvent(new Event('checkin-thresholds-changed'));
    },
    [mutate]
  );

  /** 打卡率文字颜色 class */
  function rateColor(rate: number): string {
    if (rate >= thresholds.good) return 'text-[var(--color-success)]';
    if (rate >= thresholds.warning) return 'text-[var(--color-warning)]';
    return 'text-[var(--color-danger)]';
  }

  /** 打卡率背景色 class (用于 badge) */
  function rateBg(rate: number): string {
    if (rate >= thresholds.good)
      return 'bg-[var(--color-success-surface)] text-[var(--color-success)] border-[var(--color-success)]';
    if (rate >= thresholds.warning)
      return 'bg-[var(--color-warning-surface)] text-[var(--color-warning)] border-[var(--color-warning)]';
    return 'bg-[var(--color-danger-surface)] text-[var(--color-danger)] border-[var(--color-danger)]';
  }

  /** 图例文案 */
  const legend = {
    good: `≥${Math.round(thresholds.good * 100)}% 达标`,
    warning: `${Math.round(thresholds.warning * 100)}–${Math.round(thresholds.good * 100)}% 接近`,
    bad: `<${Math.round(thresholds.warning * 100)}% 落后`,
  };

  return { thresholds, update, rateColor, rateBg, legend, isLoading };
}

/**
 * @deprecated 直接使用 useCheckinThresholds().update() 代替
 * 保留仅为向后兼容，新代码请勿使用
 */
export function saveThresholds(thresholds: CheckinThresholds) {
  configAPI.putCheckinThresholds(thresholds).catch(() => {
    // 回退：写 localStorage 防数据丢失
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
    } catch {
      /* ignore */
    }
  });
  window.dispatchEvent(new Event('checkin-thresholds-changed'));
}
