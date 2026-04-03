'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';

const I18N = {
  zh: {
    totalItems: (n: number) => `共 ${n.toLocaleString()} 条记录`,
    prevPage: '上一页',
    nextPage: '下一页',
  },
  en: {
    totalItems: (n: number) => `${n.toLocaleString()} records`,
    prevPage: 'Previous',
    nextPage: 'Next',
  },
  'zh-TW': {
    totalItems: (n: number) => `共 ${n.toLocaleString()} 條記錄`,
    prevPage: '上一頁',
    nextPage: '下一頁',
  },
  th: {
    totalItems: (n: number) => `ทั้งหมด ${n.toLocaleString()} รายการ`,
    prevPage: 'ก่อนหน้า',
    nextPage: 'ถัดไป',
  },
} as const;

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, totalItems, onPageChange }: PaginationProps) {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] ?? I18N.zh;

  return (
    <div className="flex items-center gap-3 text-sm">
      {totalItems !== undefined && (
        <span className="text-[var(--text-secondary)] hidden sm:inline-block">
          {t.totalItems(totalItems)}
        </span>
      )}
      <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-sm">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-50 disabled:hover:bg-transparent rounded-l-lg transition-colors border-r border-[var(--border-subtle)] min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={t.prevPage}
        >
          <ChevronLeft className="w-5 h-5 mx-0.5" />
        </button>
        <div className="px-3 py-1 font-medium text-[var(--text-secondary)] min-w-[64px] text-center">
          {currentPage} <span className="text-[var(--text-muted)] font-normal">/ {totalPages}</span>
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-50 disabled:hover:bg-transparent rounded-r-lg transition-colors border-l border-[var(--border-subtle)] min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={t.nextPage}
        >
          <ChevronRight className="w-5 h-5 mx-0.5" />
        </button>
      </div>
    </div>
  );
}
