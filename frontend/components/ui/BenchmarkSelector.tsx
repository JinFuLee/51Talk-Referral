'use client';

import { useConfigStore, useStoreHydrated } from '@/lib/stores/config-store';
import type { BenchmarkMode } from '@/lib/types/filters';

interface BenchmarkOption {
  value: BenchmarkMode;
  label: string;
}

const BENCHMARK_OPTIONS: BenchmarkOption[] = [
  { value: 'target', label: 'vs 目标' },
  { value: 'bm_progress', label: 'vs BM进度' },
  { value: 'bm_today', label: 'vs 今日BM' },
  { value: 'prediction', label: 'vs 预测' },
];

export function BenchmarkSelector() {
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
      <span className="text-xs text-[var(--text-muted)] shrink-0 mr-0.5">对比</span>
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
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
