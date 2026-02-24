"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-colors shadow-sm disabled:opacity-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        <Download className="w-4 h-4" />
        {isExporting ? "导出中..." : "数据导出"}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 focus:outline-none origin-top-right">
          <button
            onClick={() => {
              setIsOpen(false);
              onExportCsv?.();
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            CSV 格式
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              onExportExcel?.();
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Excel 格式
          </button>
        </div>
      )}
    </div>
  );
}
