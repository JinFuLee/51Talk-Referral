'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

interface QuickBISource {
  dashboard_url: string;
  tables: Array<{ name: string; file: string }>;
  last_updated: string | null;
}

export default function DataSourceCard() {
  const t = useTranslations('DataSourceCard');
  const { data, mutate } = useFilteredSWR<QuickBISource>('/api/config/quickbi-source');
  const [urlInput, setUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 初始填充
  useEffect(() => {
    if (data?.dashboard_url) {
      setUrlInput(data.dashboard_url);
    }
  }, [data?.dashboard_url]);

  async function handleSave() {
    const url = urlInput.trim();
    if (!url) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/config/quickbi-source', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboard_url: url }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      await mutate();
      setMsg({ ok: true, text: t('updateSuccess') });
    } catch (e: unknown) {
      const detail =
        e && typeof e === 'object' && 'message' in e
          ? (e as { message: string }).message
          : t('updateFailed');
      setMsg({ ok: false, text: detail });
    } finally {
      setSaving(false);
    }
  }

  // 提取 accessTicket 显示（脱敏）
  function ticketPreview(url: string): string {
    const m = url.match(/accessTicket=([^&]+)/);
    if (!m) return '—';
    const tk = m[1];
    return tk.length > 12 ? `${tk.slice(0, 6)}...${tk.slice(-4)}` : tk;
  }

  function timeAgo(iso: string | null | undefined): string {
    if (!iso) return t('neverUpdated');
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}${t('minAgo')}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}${t('hrAgo')}`;
    return `${Math.floor(hrs / 24)}${t('dayAgo')}`;
  }

  return (
    <Card title={t('cardTitle')}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-token">{t('platform')}</span>
            <p className="font-medium text-primary-token">{t('platformName')}</p>
          </div>
          <div>
            <span className="text-muted-token">{t('accessTicket')}</span>
            <p className="font-mono text-primary-token">
              {data ? ticketPreview(data.dashboard_url) : '…'}
            </p>
          </div>
          <div>
            <span className="text-muted-token">{t('tableCount')}</span>
            <p className="font-medium text-primary-token">
              {data?.tables?.length ?? '…'}
              {t('tableUnit') ? ` ${t('tableUnit')}` : ''}
            </p>
          </div>
          <div>
            <span className="text-muted-token">{t('lastUpdated')}</span>
            <p className="font-medium text-primary-token">{timeAgo(data?.last_updated)}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="quickbi-url" className="text-xs font-medium text-secondary-token">
            {t('urlLabel')}
          </label>
          <textarea
            id="quickbi-url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://bi.aliyuncs.com/token3rd/dashboard/view/pc.htm?..."
            rows={3}
            className="w-full px-3 py-2 border border-subtle-token rounded-lg text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-action resize-none"
          />
        </div>

        {/* 保存按钮 */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !urlInput.trim()}
            className="px-4 py-2 bg-action text-white rounded-lg text-sm font-medium hover:bg-action-active disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-action"
          >
            {saving ? <Spinner size="sm" /> : t('updateBtn')}
          </button>
          {msg && (
            <span className={`text-xs ${msg.ok ? 'text-success-token' : 'text-danger-token'}`}>
              {msg.text}
            </span>
          )}
        </div>

        {/* 表格清单 */}
        {data?.tables && data.tables.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-token hover:text-secondary-token">
              {data.tables.length} {t('tablesExpand')}
            </summary>
            <ul className="mt-1.5 space-y-0.5 pl-4 text-secondary-token">
              {data.tables.map((tbl: { name: string; file: string }, i: number) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-muted-token">{tbl.file}</span>
                  <span>← {tbl.name}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* 使用说明 */}
        <p className="text-[10px] text-muted-token leading-relaxed">
          {t('hint')}
          <code className="mx-1 px-1 py-0.5 bg-subtle rounded text-[9px]">
            uv run python scripts/quickbi_fetch.py --headless
          </code>
        </p>
      </div>
    </Card>
  );
}
