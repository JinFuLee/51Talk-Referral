'use client';

import { AlertTriangle } from 'lucide-react';
import { useConfigStore, useStoreHydrated } from '@/lib/stores/config-store';
import { useLocale } from 'next-intl';

const I18N = {
  zh: {
    viewing: (label: string) => `正在查看 ${label} 历史数据 — 部分操作已禁用`,
    backToNow: '返回当月',
    formatDate: (year: number, month: number) => `${year}年${month}月`,
  },
  'zh-TW': {
    viewing: (label: string) => `正在查看 ${label} 歷史數據 — 部分操作已停用`,
    backToNow: '返回當月',
    formatDate: (year: number, month: number) => `${year}年${month}月`,
  },
  en: {
    viewing: (label: string) => `Viewing historical data for ${label} — some actions disabled`,
    backToNow: 'Back to current month',
    formatDate: (year: number, month: number) =>
      new Date(year, month - 1).toLocaleString('en', { year: 'numeric', month: 'long' }),
  },
  th: {
    viewing: (label: string) => `กำลังดูข้อมูลประวัติ ${label} — บางการดำเนินการถูกปิดใช้งาน`,
    backToNow: 'กลับเดือนปัจจุบัน',
    formatDate: (year: number, month: number) =>
      new Date(year, month - 1).toLocaleString('th-TH', { year: 'numeric', month: 'long' }),
  },
} as const;
type I18NKey = keyof typeof I18N;
function useT() {
  const locale = useLocale();
  return I18N[(locale as I18NKey) in I18N ? (locale as I18NKey) : 'zh'];
}

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
  const t = useT();
  const hydrated = useStoreHydrated();
  const selectedMonth = useConfigStore((s) => s.selectedMonth);
  const setSelectedMonth = useConfigStore((s) => s.setSelectedMonth);

  const currentYYYYMM = getCurrentYYYYMM();
  const isHistorical = hydrated && selectedMonth !== null && selectedMonth !== currentYYYYMM;

  if (!isHistorical) return null;

  const monthLabel = formatYYYYMM(selectedMonth!, t.formatDate);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-warning-surface)] border-b border-[var(--color-warning)] text-[var(--color-warning)] text-xs">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[var(--color-warning)]" />
      <span className="font-medium">{t.viewing(monthLabel)}</span>
      <button
        onClick={() => setSelectedMonth(null)}
        className="ml-auto px-2.5 py-0.5 rounded-full bg-[var(--color-warning-surface)] border border-[var(--color-warning)] text-[var(--color-warning)] hover:bg-[var(--color-warning-surface)] transition-colors font-medium whitespace-nowrap"
      >
        {t.backToNow}
      </button>
    </div>
  );
}
