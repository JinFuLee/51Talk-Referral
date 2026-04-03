'use client';

import { useLocale } from 'next-intl';
import { useConfigStore, useStoreHydrated } from '@/lib/stores/config-store';
import type { BenchmarkMode } from '@/lib/types/filters';

const BENCHMARK_I18N = {
  zh: {
    compare: '对比',
    target: 'vs 目标',
    bm_progress: 'vs BM进度',
    bm_today: 'vs 今日BM',
    prediction: 'vs 预测',
  },
  'zh-TW': {
    compare: '對比',
    target: 'vs 目標',
    bm_progress: 'vs BM進度',
    bm_today: 'vs 今日BM',
    prediction: 'vs 預測',
  },
  en: {
    compare: 'Compare',
    target: 'vs Target',
    bm_progress: 'vs BM Progress',
    bm_today: 'vs BM Today',
    prediction: 'vs Forecast',
  },
  th: {
    compare: 'เปรียบเทียบ',
    target: 'vs เป้าหมาย',
    bm_progress: 'vs ความคืบหน้า BM',
    bm_today: 'vs BM วันนี้',
    prediction: 'vs การคาดการณ์',
  },
} as const;

type BenchmarkI18NKey = keyof typeof BENCHMARK_I18N;
type BenchmarkLabelKey = 'target' | 'bm_progress' | 'bm_today' | 'prediction';

interface BenchmarkOption {
  value: BenchmarkMode;
  labelKey: BenchmarkLabelKey;
}

const BENCHMARK_OPTIONS: BenchmarkOption[] = [
  { value: 'target', labelKey: 'target' },
  { value: 'bm_progress', labelKey: 'bm_progress' },
  { value: 'bm_today', labelKey: 'bm_today' },
  { value: 'prediction', labelKey: 'prediction' },
];

export function BenchmarkSelector() {
  const locale = useLocale();
  const t =
    BENCHMARK_I18N[
      (locale as BenchmarkI18NKey) in BENCHMARK_I18N ? (locale as BenchmarkI18NKey) : 'zh'
    ];
  const hydrated = useStoreHydrated();
  const benchmarks = useConfigStore((s) => s.benchmarks);
  const setBenchmarks = useConfigStore((s) => s.setBenchmarks);

  // 水合前使用默认值避免 SSR 不匹配
  const activeBenchmarks = hydrated ? benchmarks : ['target' as BenchmarkMode];

  function handleToggle(value: BenchmarkMode) {
    const isActive = activeBenchmarks.includes(value);
    if (isActive) {
      // 取消选中：至少保留 1 个，除非选了 off
      const next = activeBenchmarks.filter((b) => b !== value);
      setBenchmarks(next.length > 0 ? next : ['target']);
    } else {
      // 最多同时选 2 个
      const next = [...activeBenchmarks, value];
      setBenchmarks(next.length > 2 ? next.slice(next.length - 2) : next);
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-[var(--text-muted)] shrink-0 mr-0.5">{t.compare}</span>
      {BENCHMARK_OPTIONS.map((opt) => {
        const isActive = activeBenchmarks.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => handleToggle(opt.value)}
            className={[
              'px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
              isActive
                ? 'bg-[var(--brand-p1)] text-white border-[var(--brand-p1)]'
                : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--brand-p1)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {t[opt.labelKey]}
          </button>
        );
      })}
    </div>
  );
}
