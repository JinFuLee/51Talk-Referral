'use client';

import { AlertTriangle } from 'lucide-react';
import { useConfigStore, useStoreHydrated } from '@/lib/stores/config-store';

/** 将 YYYYMM 转成 "2026年3月" */
function formatYYYYMMtoChinese(yyyymm: string): string {
  const year = parseInt(yyyymm.slice(0, 4), 10);
  const month = parseInt(yyyymm.slice(4, 6), 10);
  return `${year}年${month}月`;
}

function getCurrentYYYYMM(): string {
  return new Date().toISOString().slice(0, 7).replace('-', '');
}

/**
 * HistoricalMonthBanner — 当用户选择了历史月份时，在页面顶部展示黄色提示横幅。
 * 包含"当前查看的月份"说明 + "返回当月"快捷按钮。
 */
export function HistoricalMonthBanner() {
  const hydrated = useStoreHydrated();
  const selectedMonth = useConfigStore((s) => s.selectedMonth);
  const setSelectedMonth = useConfigStore((s) => s.setSelectedMonth);

  const currentYYYYMM = getCurrentYYYYMM();
  const isHistorical = hydrated && selectedMonth !== null && selectedMonth !== currentYYYYMM;

  if (!isHistorical) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
      <span className="font-medium">
        正在查看 {formatYYYYMMtoChinese(selectedMonth!)} 历史数据 — 部分操作已禁用
      </span>
      <button
        onClick={() => setSelectedMonth(null)}
        className="ml-auto px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-700 hover:bg-amber-200 transition-colors font-medium whitespace-nowrap"
      >
        返回当月
      </button>
    </div>
  );
}
