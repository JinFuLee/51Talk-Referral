'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

const I18N = {
  zh: {
    cardTitle: 'BI 数据源',
    platform: '平台',
    platformName: '阿里云 Quick BI',
    accessTicket: 'Access Ticket',
    tableCount: '表格数',
    tableUnit: '个',
    lastUpdated: '上次更新',
    neverUpdated: '从未更新',
    urlLabel: '仪表板链接（群里发的新链接粘贴到这里）',
    updateBtn: '更新链接',
    updateSuccess: '链接已更新',
    updateFailed: '更新失败',
    tablesExpand: '个数据表',
    hint: 'Access Ticket 会定期过期。过期后群里会发出新链接，粘贴到上面保存即可。脚本自动读取最新链接：',
    minAgo: '分钟前',
    hrAgo: '小时前',
    dayAgo: '天前',
  },
  'zh-TW': {
    cardTitle: 'BI 資料來源',
    platform: '平台',
    platformName: '阿里雲 Quick BI',
    accessTicket: 'Access Ticket',
    tableCount: '資料表數',
    tableUnit: '個',
    lastUpdated: '上次更新',
    neverUpdated: '從未更新',
    urlLabel: '儀表板連結（將群組發的新連結貼到這裡）',
    updateBtn: '更新連結',
    updateSuccess: '連結已更新',
    updateFailed: '更新失敗',
    tablesExpand: '個資料表',
    hint: 'Access Ticket 會定期過期。過期後群組會發出新連結，貼到上面儲存即可。腳本自動讀取最新連結：',
    minAgo: '分鐘前',
    hrAgo: '小時前',
    dayAgo: '天前',
  },
  en: {
    cardTitle: 'BI Data Source',
    platform: 'Platform',
    platformName: 'Alibaba Cloud Quick BI',
    accessTicket: 'Access Ticket',
    tableCount: 'Tables',
    tableUnit: '',
    lastUpdated: 'Last Updated',
    neverUpdated: 'Never updated',
    urlLabel: 'Dashboard URL (paste new link from group chat here)',
    updateBtn: 'Update Link',
    updateSuccess: 'Link updated',
    updateFailed: 'Update failed',
    tablesExpand: 'data tables',
    hint: 'Access Ticket expires periodically. When it does, a new link will be posted in the group. Paste it above and save. Script auto-reads the latest link:',
    minAgo: ' min ago',
    hrAgo: ' hr ago',
    dayAgo: ' day(s) ago',
  },
  th: {
    cardTitle: 'แหล่งข้อมูล BI',
    platform: 'แพลตฟอร์ม',
    platformName: 'Alibaba Cloud Quick BI',
    accessTicket: 'Access Ticket',
    tableCount: 'จำนวนตาราง',
    tableUnit: '',
    lastUpdated: 'อัปเดตล่าสุด',
    neverUpdated: 'ยังไม่เคยอัปเดต',
    urlLabel: 'URL แดชบอร์ด (วางลิงก์ใหม่จากกลุ่มที่นี่)',
    updateBtn: 'อัปเดตลิงก์',
    updateSuccess: 'อัปเดตลิงก์แล้ว',
    updateFailed: 'อัปเดตไม่สำเร็จ',
    tablesExpand: 'ตารางข้อมูล',
    hint: 'Access Ticket หมดอายุเป็นระยะ เมื่อหมดอายุจะมีลิงก์ใหม่ในกลุ่ม วางด้านบนแล้วบันทึก สคริปต์อ่านลิงก์ล่าสุดอัตโนมัติ:',
    minAgo: ' นาทีที่แล้ว',
    hrAgo: ' ชั่วโมงที่แล้ว',
    dayAgo: ' วันที่แล้ว',
  },
};

interface QuickBISource {
  dashboard_url: string;
  tables: Array<{ name: string; file: string }>;
  last_updated: string | null;
}

export default function DataSourceCard() {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
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
      setMsg({ ok: true, text: t.updateSuccess });
    } catch (e: unknown) {
      const detail =
        e && typeof e === 'object' && 'message' in e
          ? (e as { message: string }).message
          : t.updateFailed;
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
    if (!iso) return t.neverUpdated;
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}${t.minAgo}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}${t.hrAgo}`;
    return `${Math.floor(hrs / 24)}${t.dayAgo}`;
  }

  return (
    <Card title={t.cardTitle}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[var(--text-muted)]">{t.platform}</span>
            <p className="font-medium text-[var(--text-primary)]">{t.platformName}</p>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">{t.accessTicket}</span>
            <p className="font-mono text-[var(--text-primary)]">
              {data ? ticketPreview(data.dashboard_url) : '…'}
            </p>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">{t.tableCount}</span>
            <p className="font-medium text-[var(--text-primary)]">
              {data?.tables?.length ?? '…'}
              {t.tableUnit ? ` ${t.tableUnit}` : ''}
            </p>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">{t.lastUpdated}</span>
            <p className="font-medium text-[var(--text-primary)]">{timeAgo(data?.last_updated)}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="quickbi-url" className="text-xs font-medium text-[var(--text-secondary)]">
            {t.urlLabel}
          </label>
          <textarea
            id="quickbi-url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://bi.aliyuncs.com/token3rd/dashboard/view/pc.htm?..."
            rows={3}
            className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-action resize-none"
          />
        </div>

        {/* 保存按钮 */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !urlInput.trim()}
            className="px-4 py-2 bg-action text-white rounded-lg text-sm font-medium hover:bg-action-active disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-action"
          >
            {saving ? <Spinner size="sm" /> : t.updateBtn}
          </button>
          {msg && (
            <span
              className={`text-xs ${msg.ok ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}
            >
              {msg.text}
            </span>
          )}
        </div>

        {/* 表格清单 */}
        {data?.tables && data.tables.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
              {data.tables.length} {t.tablesExpand}
            </summary>
            <ul className="mt-1.5 space-y-0.5 pl-4 text-[var(--text-secondary)]">
              {data.tables.map((tbl: { name: string; file: string }, i: number) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-[var(--text-muted)]">{tbl.file}</span>
                  <span>← {tbl.name}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* 使用说明 */}
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
          {t.hint}
          <code className="mx-1 px-1 py-0.5 bg-[var(--bg-subtle)] rounded text-[9px]">
            uv run python scripts/quickbi_fetch.py --headless
          </code>
        </p>
      </div>
    </Card>
  );
}
