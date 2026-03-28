'use client';

import { useState } from 'react';
import { Loader2, AlertCircle, ImageIcon } from 'lucide-react';
import useSWR from 'swr';
import { useLocale } from 'next-intl';
import { swrFetcher } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';

const I18N = {
  zh: {
    loading: '加载产出档案…',
    loadError: '无法加载产出档案',
    outputCount: (n: number) => `${n} 个产出`,
    emptyTitle: '暂无产出档案',
    emptyDesc: (date: string, role: string) =>
      `${date} 无 ${role !== 'ALL' ? role + ' ' : ''}推送产出`,
    roleAll: 'ALL',
    opsLabel: '运营',
  },
  'zh-TW': {
    loading: '載入產出檔案…',
    loadError: '無法載入產出檔案',
    outputCount: (n: number) => `${n} 個產出`,
    emptyTitle: '暫無產出檔案',
    emptyDesc: (date: string, role: string) =>
      `${date} 無 ${role !== 'ALL' ? role + ' ' : ''}推送產出`,
    roleAll: 'ALL',
    opsLabel: '運營',
  },
  en: {
    loading: 'Loading output archive…',
    loadError: 'Failed to load output archive',
    outputCount: (n: number) => `${n} output(s)`,
    emptyTitle: 'No outputs',
    emptyDesc: (date: string, role: string) =>
      `No ${role !== 'ALL' ? role + ' ' : ''}push outputs on ${date}`,
    roleAll: 'ALL',
    opsLabel: 'Ops',
  },
  th: {
    loading: 'กำลังโหลดไฟล์ผลลัพธ์…',
    loadError: 'ไม่สามารถโหลดไฟล์ผลลัพธ์ได้',
    outputCount: (n: number) => `${n} รายการ`,
    emptyTitle: 'ไม่มีผลลัพธ์',
    emptyDesc: (date: string, role: string) =>
      `ไม่มีผลลัพธ์การส่ง${role !== 'ALL' ? ' ' + role : ''} วันที่ ${date}`,
    roleAll: 'ALL',
    opsLabel: 'ปฏิบัติการ',
  },
};

/** 后端返回格式 */
interface OutputItem {
  filename: string;
  size_kb: number;
  modified: string;
}

const ROLES_BASE = ['ALL', 'CC', 'SS', 'LP'];

/** 从文件名提取 role 标签（格式：lark-xxx-ROLE-YYYYMMDD*.png） */
function extractRole(filename: string): string {
  const parts = filename.split('-');
  if (parts.length >= 3) return parts[2];
  return 'ALL';
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

interface OutputGalleryProps {
  platform: 'lark' | 'dingtalk';
}

export function OutputGallery({ platform: _platform }: OutputGalleryProps) {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const ROLES = [...ROLES_BASE, t.opsLabel];
  const [date, setDate] = useState(todayStr);
  const [role, setRole] = useState('ALL');

  const params = new URLSearchParams({ date, ...(role !== 'ALL' && { role }) });
  const {
    data: rawData,
    isLoading,
    error,
  } = useSWR<{ files: OutputItem[]; total: number }>(
    `/api/notifications/outputs?${params}`,
    swrFetcher
  );
  const data: OutputItem[] = rawData?.files ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-[var(--text-muted)]">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">{t.loading}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-amber-600">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">{t.loadError}</span>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-action"
        />
        <div className="flex gap-1.5 flex-wrap">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                role === r
                  ? 'bg-action text-white'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--text-muted)] ml-auto">
          {t.outputCount(data.length)}
        </span>
      </div>

      {/* Gallery */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-10 justify-center text-[var(--text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{t.loading}</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-10 justify-center text-amber-600">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{t.loadError}</span>
        </div>
      ) : data.length === 0 ? (
        <EmptyState title={t.emptyTitle} description={t.emptyDesc(date, role)} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.map((item) => {
            const itemRole = extractRole(item.filename);
            return (
              <div
                key={item.filename}
                className="card-compact overflow-hidden !p-0 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() =>
                  window.open(`/api/notifications/outputs/image/${item.filename}`, '_blank')
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/notifications/outputs/image/${item.filename}`}
                  alt={`${itemRole}`}
                  className="w-full aspect-video object-cover group-hover:opacity-90 transition-opacity"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    (e.currentTarget.nextSibling as HTMLElement | null)?.removeAttribute('hidden');
                  }}
                />
                <div
                  hidden
                  className="w-full aspect-video bg-[var(--bg-primary)] flex items-center justify-center"
                >
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                </div>
                <div className="px-2.5 py-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--text-muted)] truncate">
                    {item.filename.slice(0, 20)}…
                  </span>
                  <span className="text-xs text-[var(--text-muted)] shrink-0">
                    {item.size_kb}KB
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
