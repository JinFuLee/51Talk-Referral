"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, totalItems, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {totalItems !== undefined && (
        <span className="text-[var(--text-secondary)] hidden sm:inline-block">共 {totalItems.toLocaleString()} 条记录</span>
      )}
      <div className="flex items-center bg-[var(--bg-surface)] border border-slate-200 rounded-lg shadow-sm">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent rounded-l-lg transition-colors border-r border-slate-200"
          aria-label="上一页"
        >
          <ChevronLeft className="w-5 h-5 mx-0.5" />
        </button>
        <div className="px-3 py-1 font-medium text-[var(--text-secondary)] min-w-[64px] text-center">
          {currentPage} <span className="text-[var(--text-muted)] font-normal">/ {totalPages}</span>
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent rounded-r-lg transition-colors border-l border-slate-200"
          aria-label="下一页"
        >
          <ChevronRight className="w-5 h-5 mx-0.5" />
        </button>
      </div>
    </div>
  );
}
