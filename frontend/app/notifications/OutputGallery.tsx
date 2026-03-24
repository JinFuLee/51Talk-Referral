'use client';

import { useState } from 'react';
import { Loader2, AlertCircle, ImageIcon } from 'lucide-react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';

/** 后端返回格式 */
interface OutputItem {
  filename: string;
  size_kb: number;
  modified: string;
}

const ROLES = ['ALL', 'CC', 'SS', 'LP', '运营'];

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
        <span className="text-sm">加载产出档案…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-amber-600">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">无法加载产出档案</span>
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
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div className="flex gap-1.5 flex-wrap">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                role === r
                  ? 'bg-[var(--brand-600,#0284c7)] text-white'
                  : 'bg-slate-100 text-[var(--text-secondary)] hover:bg-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--text-muted)] ml-auto">{data.length} 个产出</span>
      </div>

      {/* Gallery */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-10 justify-center text-[var(--text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">加载产出档案…</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-10 justify-center text-amber-600">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">无法加载产出档案</span>
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          title="暂无产出档案"
          description={`${date} 无 ${role !== 'ALL' ? role + ' ' : ''}推送产出`}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.map((item) => {
            const itemRole = extractRole(item.filename);
            return (
              <div
                key={item.filename}
                className="rounded-xl border border-[var(--border-default)] overflow-hidden bg-white hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() =>
                  window.open(`/api/notifications/outputs/image/${item.filename}`, '_blank')
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/notifications/outputs/image/${item.filename}`}
                  alt={`${itemRole} 推送图片`}
                  className="w-full aspect-video object-cover group-hover:opacity-90 transition-opacity"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    (e.currentTarget.nextSibling as HTMLElement | null)?.removeAttribute('hidden');
                  }}
                />
                <div
                  hidden
                  className="w-full aspect-video bg-slate-50 flex items-center justify-center"
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
