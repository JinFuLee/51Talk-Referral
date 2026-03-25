'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';

interface ExportButtonProps {
  onExportCsv?: () => void;
  onExportExcel?: () => void;
  isExporting?: boolean;
}

export function ExportButton({ onExportCsv, onExportExcel, isExporting }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-lg hover:bg-action-surface hover:text-action-text hover:border-action transition-colors shadow-sm disabled:opacity-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-action/20"
      >
        <Download className="w-4 h-4" />
        {isExporting ? '导出中...' : '数据导出'}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xl rounded-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 focus:outline-none origin-top-right">
          <button
            onClick={() => {
              setIsOpen(false);
              onExportCsv?.();
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors text-left border-b border-[var(--border-subtle)] last:border-0"
          >
            <FileText className="w-4 h-4 text-action-text" />
            CSV 格式
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              onExportExcel?.();
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors text-left"
          >
            <FileSpreadsheet className="w-4 h-4 text-action-text" />
            Excel 格式
          </button>
        </div>
      )}
    </div>
  );
}
