'use client';

import { useTranslations } from 'next-intl';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

interface ImportResult {
  status: string;
  month: string;
  referral_revenue: number;
  total_target_from_excel: number;
  referral_ratio_pct: number;
  cc_count: number;
  total_allocated: number;
  preview: { cc_name: string; total_target_usd: number; referral_usd_target: number }[];
}

export default function SMTargetImportCard({ month }: { month: string }) {
  const t = useTranslations('SMTargetImportCard');
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState('');

  async function handleImport(file: File) {
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/cc-performance/targets/import-sm?month=${month}`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || t('importFailed'));
      }
      const data: ImportResult = await res.json();
      setResult(data);
      toast.success(t('importSuccess').replace('{n}', String(data.cc_count)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('importFailed');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    handleImport(file);
  }

  const fmt = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-primary-token">{t('title')}</h3>
          <p className="text-xs text-muted-token mt-1">{t('desc')}</p>
        </div>

        {/* Upload area */}
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={onFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="btn-secondary px-4 py-2 text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" /> {t('importing')}
              </span>
            ) : fileName ? (
              t('change')
            ) : (
              t('upload')
            )}
          </button>
          {fileName && !loading && (
            <span className="text-xs text-secondary-token truncate max-w-[200px]">{fileName}</span>
          )}
        </div>

        {/* Result summary */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: t('referralTarget'), value: fmt(result.referral_revenue) },
                { label: t('totalFromExcel'), value: fmt(result.total_target_from_excel) },
                { label: t('ratio'), value: `${result.referral_ratio_pct}%` },
                { label: t('ccCount'), value: String(result.cc_count) },
                { label: t('allocated'), value: fmt(result.total_allocated) },
              ].map((item) => (
                <div key={item.label} className="bg-subtle rounded-lg p-3">
                  <div className="text-[10px] text-muted-token uppercase tracking-wide">
                    {item.label}
                  </div>
                  <div className="text-sm font-semibold text-primary-token mt-1">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Preview table */}
            <details>
              <summary className="text-xs text-secondary-token cursor-pointer hover:text-primary-token transition-colors">
                {t('preview')} ({result.cc_count})
              </summary>
              <div className="mt-2 max-h-[300px] overflow-y-auto border border-default-token rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-subtle sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-secondary-token">
                        {t('ccName')}
                      </th>
                      <th className="text-right px-3 py-2 font-medium text-secondary-token">
                        {t('totalTarget')}
                      </th>
                      <th className="text-right px-3 py-2 font-medium text-secondary-token">
                        {t('referralUsd')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {result.preview.map((row) => (
                      <tr key={row.cc_name} className="hover:bg-subtle transition-colors">
                        <td className="px-3 py-1.5 text-primary-token">{row.cc_name}</td>
                        <td className="px-3 py-1.5 text-right text-secondary-token">
                          {fmt(row.total_target_usd)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium text-primary-token">
                          {fmt(row.referral_usd_target)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}
      </div>
    </Card>
  );
}
