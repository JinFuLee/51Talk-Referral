'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
interface ExportButtonProps {
  onExportCsv?: () => void;
  onExportExcel?: () => void;
  isExporting?: boolean;
}

export function ExportButton({ onExportCsv, onExportExcel, isExporting }: ExportButtonProps) {
  const t = useTranslations('ExportButton');
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
        className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-subtle-token text-secondary-token rounded-lg hover:bg-action-surface hover:text-action-text hover:border-action transition-colors shadow-sm disabled:opacity-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-action/20"
      >
        <Download className="w-4 h-4" />
        {isExporting ? t('exporting') : t('export')}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-surface border border-subtle-token shadow-xl rounded-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 focus:outline-none origin-top-right">
          <button
            onClick={() => {
              setIsOpen(false);
              onExportCsv?.();
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-primary-token hover:bg-subtle transition-colors text-left border-b border-subtle-token last:border-0"
          >
            <FileText className="w-4 h-4 text-action-text" />
            {t('csv')}
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              onExportExcel?.();
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-primary-token hover:bg-subtle transition-colors text-left"
          >
            <FileSpreadsheet className="w-4 h-4 text-action-text" />
            {t('excel')}
          </button>
        </div>
      )}
    </div>
  );
}
