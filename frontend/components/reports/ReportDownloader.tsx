'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { ClipboardList, TrendingUp, Download } from 'lucide-react';

interface ReportDownloaderProps {
  reportType: 'ops' | 'exec';
  date?: string;
  /** @deprecated Pass locale via next-intl useLocale instead */
  lang?: string;
}

const REPORT_I18N = {
  zh: {
    ops: '下载运营报告',
    exec: '下载管理层报告',
    downloading: '下载中...',
    error: '下载失败',
  },
  'zh-TW': {
    ops: '下載運營報告',
    exec: '下載管理層報告',
    downloading: '下載中...',
    error: '下載失敗',
  },
  en: {
    ops: 'Download Ops Report',
    exec: 'Download Executive Report',
    downloading: 'Downloading...',
    error: 'Download failed',
  },
  th: {
    ops: 'ดาวน์โหลดรายงานปฏิบัติการ',
    exec: 'ดาวน์โหลดรายงานผู้บริหาร',
    downloading: 'กำลังดาวน์โหลด...',
    error: 'ดาวน์โหลดล้มเหลว',
  },
} as const;
export function ReportDownloader({ reportType, date }: ReportDownloaderProps) {
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type RIKey = keyof typeof REPORT_I18N;
  const l = REPORT_I18N[(locale as RIKey) in REPORT_I18N ? (locale as RIKey) : 'zh'];

  async function handleDownload() {
    setLoading(true);
    setError(null);

    try {
      // First, list available reports to find the matching filename
      const listRes = await fetch('/api/reports/list');
      const listData = await listRes.json();

      if (!listData.success || !Array.isArray(listData.data)) {
        throw new Error('Failed to list reports');
      }

      // Find most recent matching report
      const matching = listData.data.filter(
        (r: { report_type: string; date: string | null }) =>
          r.report_type === reportType && (!date || r.date === date)
      );

      if (matching.length === 0) {
        throw new Error('No matching report found');
      }

      // Sort by date descending, pick latest
      matching.sort((a: { date: string | null }, b: { date: string | null }) =>
        (b.date ?? '').localeCompare(a.date ?? '')
      );
      const target = matching[0];

      // Download
      const dlRes = await fetch(`/api/reports/download/${encodeURIComponent(target.filename)}`);
      if (!dlRes.ok) throw new Error('Download request failed');

      const blob = await dlRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = target.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : l.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-hover-token hover:bg-bg-primary disabled:opacity-50 text-sm font-medium text-primary-token rounded-lg transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {loading ? (
          <Download className="w-4 h-4 animate-bounce" aria-hidden="true" />
        ) : reportType === 'ops' ? (
          <ClipboardList className="w-4 h-4" aria-hidden="true" />
        ) : (
          <TrendingUp className="w-4 h-4" aria-hidden="true" />
        )}
        {loading ? l.downloading : reportType === 'ops' ? l.ops : l.exec}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
