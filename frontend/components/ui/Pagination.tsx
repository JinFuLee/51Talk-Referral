'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, totalItems, onPageChange }: PaginationProps) {
  const t = useTranslations('Pagination');

  return (
    <div className="flex items-center gap-3 text-sm">
      {totalItems !== undefined && (
        <span className="text-secondary-token hidden sm:inline-block">
          {t('totalItems', { n: totalItems })}
        </span>
      )}
      <div className="flex items-center bg-surface border border-subtle-token rounded-lg shadow-sm">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1 text-muted-token hover:text-primary-token hover:bg-subtle disabled:opacity-50 disabled:hover:bg-transparent rounded-l-lg transition-colors border-r border-subtle-token min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={t('prevPage')}
        >
          <ChevronLeft className="w-5 h-5 mx-0.5" />
        </button>
        <div className="px-3 py-1 font-medium text-secondary-token min-w-[64px] text-center">
          {currentPage} <span className="text-muted-token font-normal">/ {totalPages}</span>
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1 text-muted-token hover:text-primary-token hover:bg-subtle disabled:opacity-50 disabled:hover:bg-transparent rounded-r-lg transition-colors border-l border-subtle-token min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={t('nextPage')}
        >
          <ChevronRight className="w-5 h-5 mx-0.5" />
        </button>
      </div>
    </div>
  );
}
