'use client';

import { useState } from 'react';
import { Loader2, AlertCircle, ImageIcon, FileText, X } from 'lucide-react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';

interface OutputItem {
  id: string;
  date: string;
  role: string;
  platform: 'lark' | 'dingtalk';
  type: 'image' | 'text';
  url?: string;
  text?: string;
  created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  CC: 'bg-emerald-100 text-emerald-700',
  LP: 'bg-purple-100 text-purple-700',
  SS: 'bg-blue-100 text-blue-700',
  运营: 'bg-stone-100 text-stone-600',
  ALL: 'bg-gray-100 text-gray-600',
};

const ROLES = ['ALL', 'CC', 'SS', 'LP', '运营'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

interface TextPreviewDrawerProps {
  text: string;
  role: string;
  date: string;
  onClose: () => void;
}

function TextPreviewDrawer({ text, role, date, onClose }: TextPreviewDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)] shrink-0">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">文本预览</p>
            <p className="text-xs text-[var(--text-muted)]">
              {role} · {date}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-100 text-[var(--text-muted)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <pre className="text-xs whitespace-pre-wrap font-sans text-[var(--text-primary)]">
            {text}
          </pre>
        </div>
      </div>
    </div>
  );
}

interface OutputGalleryProps {
  platform: 'lark' | 'dingtalk';
}

export function OutputGallery({ platform }: OutputGalleryProps) {
  const [date, setDate] = useState(todayStr);
  const [role, setRole] = useState('ALL');
  const [previewText, setPreviewText] = useState<OutputItem | null>(null);

  const params = new URLSearchParams({ date, ...(role !== 'ALL' && { role }) });
  const { data, isLoading, error } = useSWR<OutputItem[]>(
    `/api/notifications/outputs?${params}&platform=${platform}`,
    swrFetcher
  );

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

  const items = data ?? [];

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
        <span className="text-xs text-[var(--text-muted)] ml-auto">{items.length} 个产出</span>
      </div>

      {/* Gallery */}
      {items.length === 0 ? (
        <EmptyState
          title="暂无产出档案"
          description={`${date} 无 ${role !== 'ALL' ? role + ' ' : ''}推送产出`}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => {
            const roleColor = ROLE_COLORS[item.role] ?? 'bg-gray-100 text-gray-600';
            return (
              <div
                key={item.id}
                className="rounded-xl border border-[var(--border-default)] overflow-hidden bg-white hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => {
                  if (item.type === 'text' && item.text) {
                    setPreviewText(item);
                  } else if (item.type === 'image' && item.url) {
                    window.open(item.url, '_blank');
                  }
                }}
              >
                {item.type === 'image' && item.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={`${item.role} 推送图片`}
                    className="w-full aspect-video object-cover group-hover:opacity-90 transition-opacity"
                  />
                ) : (
                  <div className="w-full aspect-video bg-slate-50 flex items-center justify-center">
                    {item.type === 'image' ? (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    ) : (
                      <FileText className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                )}
                <div className="px-2.5 py-2 flex items-center justify-between gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleColor}`}>
                    {item.role}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] truncate">
                    {item.created_at?.slice(11, 16) ?? ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewText && (
        <TextPreviewDrawer
          text={previewText.text ?? ''}
          role={previewText.role}
          date={previewText.date}
          onClose={() => setPreviewText(null)}
        />
      )}
    </>
  );
}
