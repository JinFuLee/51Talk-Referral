'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { useReportList } from '@/lib/hooks';
import { PageHeader } from '@/components/layout/PageHeader';
import { BIZ_PAGE } from '@/lib/layout';
import { reportsAPI } from '@/lib/api';
import { ReportViewer } from '@/components/reports/ReportViewer';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';
import type { ReportFile } from '@/lib/types';

export default function ReportsPage() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
    channel: true,
  });
  const t = useTranslations();
  const { data: reports, isLoading } = useReportList();
  const [selected, setSelected] = useState<ReportFile | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  async function handleSelect(report: ReportFile) {
    setSelected(report);
    setContent(null);
    if (!report.date || report.report_type === 'unknown') return;
    setContentLoading(true);
    try {
      const res = await reportsAPI.getContent(report.report_type as 'ops' | 'exec', report.date);
      setContent(res.content);
    } catch {
      setContent('加载失败');
    } finally {
      setContentLoading(false);
    }
  }

  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t('reports.title')} />

      <ErrorBoundary>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-160px)]">
          {/* File list */}
          <Card title={t('reports.card.list')} className="overflow-auto">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : reports && reports.length > 0 ? (
              <ul className="space-y-1">
                {reports.map((r) => (
                  <li key={r.filename}>
                    <button
                      onClick={() => handleSelect(r)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        selected?.filename === r.filename
                          ? 'bg-action-surface text-action-text font-medium'
                          : 'hover:bg-subtle text-secondary-token'
                      }`}
                    >
                      <div className="font-medium truncate">{r.filename}</div>
                      <div className="flex gap-2 mt-0.5">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            r.report_type === 'ops'
                              ? 'bg-action-accent-subtle text-action-accent'
                              : r.report_type === 'exec'
                                ? 'bg-accent-surface text-accent-token'
                                : 'bg-subtle text-secondary-token'
                          }`}
                        >
                          {r.report_type}
                        </span>
                        {r.date && <span className="text-xs text-muted-token">{r.date}</span>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-token text-center py-8">
                {t('reports.label.noReports')}
              </div>
            )}
          </Card>

          {/* Report content */}
          <div className="lg:col-span-2 overflow-auto">
            {selected ? (
              contentLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : content ? (
                <ReportViewer
                  content={content}
                  filename={selected.filename}
                  downloadURL={reportsAPI.downloadURL(selected.filename)}
                />
              ) : (
                <div className="text-sm text-muted-token text-center py-20">
                  {t('reports.label.loading')}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-token">
                <svg
                  className="w-12 h-12 mb-3 opacity-30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-sm">{t('reports.label.selectReport')}</span>
              </div>
            )}
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
}
