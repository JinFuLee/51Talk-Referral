"use client";

import { useConfigStore } from "@/lib/stores/config-store";
import type { CompareMode } from "@/lib/stores/config-store";

// MoM 已内嵌 KPICard，此处仅保留 同比 / 巅峰 / 低谷
const COMPARE_OPTIONS = [
  { value: "yoy", label: "同比" },
  { value: "peak", label: "巅峰" },
  { value: "valley", label: "低谷" },
] as const;

type ActiveCompareMode = Exclude<CompareMode, "off">;

export function CompareToggle() {
  const compareMode = useConfigStore((s) => s.compareMode);
  const setCompareMode = useConfigStore((s) => s.setCompareMode);

  function handleClick(mode: ActiveCompareMode) {
    if (compareMode === mode) {
      setCompareMode("off");
    } else {
      setCompareMode(mode);
    }
  }

  return (
    <div className="flex items-center gap-1">
      {COMPARE_OPTIONS.map((opt) => {
        const isActive = compareMode === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => handleClick(opt.value)}
            className={
              isActive
                ? "h-8 px-3 rounded-full text-xs font-semibold bg-slate-700 text-white transition-all"
                : "h-8 px-3 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
