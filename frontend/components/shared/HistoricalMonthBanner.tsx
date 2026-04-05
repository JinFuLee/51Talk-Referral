'use client';

import { AlertTriangle } from 'lucide-react';
import { useConfigStore, useStoreHydrated } from '@/lib/stores/config-store';
import { useTranslations } from 'next-intl';
/** 将 YYYYMM 按 locale 格式化为月份标签 */
function formatYYYYMM(yyyymm: string, formatter: (y: number, m: number) => string): string {
  const year = parseInt(yyyymm.slice(0, 4), 10);
  const month = parseInt(yyyymm.slice(4, 6), 10);
  return formatter(year, month);
}

function getCurrentYYYYMM(): string {
  return new Date().toISOString().slice(0, 7).replace('-', '');
}

/**
 * HistoricalMonthBanner — 当用户选择了历史月份时，在页面顶部展示黄色提示横幅。
 * 包含"当前查看的月份"说明 + "返回当月"快捷按钮。
 */
export function HistoricalMonthBanner() {
  const t = useTranslations('HistoricalMonthBanner');
  const hydrated = useStoreHydrated();
  const selectedMonth = useConfigStore((s) => s.selectedMonth);
  const setSelectedMonth = useConfigStore((s) => s.setSelectedMonth);

  const currentYYYYMM = getCurrentYYYYMM();
  const isHistorical = hydrated && selectedMonth !== null && selectedMonth !== currentYYYYMM;

  if (!isHistorical) return null;

  const monthLabel = formatYYYYMM(selectedMonth!, (y: number, m: number) => t('formatDate', { y, m }));

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-warning-surface border-b border-warning-token text-warning-token text-xs">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-warning-token" />
      <span className="font-medium">{t('viewing', { label: monthLabel })}</span>
      <button
        onClick={() => setSelectedMonth(null)}
        className="ml-auto px-2.5 py-0.5 rounded-full bg-warning-surface border border-warning-token text-warning-token hover:bg-warning-surface transition-colors font-medium whitespace-nowrap"
      >
        {t('backToNow')}
      </button>
    </div>
  );
}
