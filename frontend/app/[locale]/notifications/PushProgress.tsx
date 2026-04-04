'use client';

import { useLocale } from 'next-intl';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export interface PushProgressItem {
  channel: string;
  role: string;
  status: 'pending' | 'sending' | 'success' | 'error';
  message?: string;
}

interface PushProgressProps {
  items: PushProgressItem[];
}

const STATUS_TEXT_I18N = {
  zh: {
    pending: '等待中',
    sending: '发送中…',
    success: '已发送',
    error: '失败',
    progress: '推送进度',
  },
  'zh-TW': {
    pending: '等待中',
    sending: '傳送中…',
    success: '已傳送',
    error: '失敗',
    progress: '推送進度',
  },
  en: {
    pending: 'Pending',
    sending: 'Sending…',
    success: 'Sent',
    error: 'Failed',
    progress: 'Push Progress',
  },
  th: {
    pending: 'รอดำเนินการ',
    sending: 'กำลังส่ง…',
    success: 'ส่งแล้ว',
    error: 'ล้มเหลว',
    progress: 'ความคืบหน้าการส่ง',
  },
};

const STATUS_ICON = {
  pending: <div className="w-4 h-4 rounded-full border-2 border-[var(--border-hover)]" />,
  sending: <Loader2 className="w-4 h-4 animate-spin text-action-accent" />,
  success: <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />,
  error: <XCircle className="w-4 h-4 text-[var(--color-danger)]" />,
};

export function PushProgress({ items }: PushProgressProps) {
  const locale = useLocale();
  const STATUS_TEXT =
    (STATUS_TEXT_I18N as unknown as Record<string, (typeof STATUS_TEXT_I18N)['zh']>)[locale] ??
    STATUS_TEXT_I18N['zh'];
  const done = items.filter((i) => i.status === 'success' || i.status === 'error').length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Overall progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[var(--text-muted)]">{STATUS_TEXT.progress}</span>
          <span className="text-xs font-medium text-[var(--text-primary)]">
            {done}/{total}
          </span>
        </div>
        <div className="w-full h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
          <div
            className="h-full bg-action-active rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Per-channel items */}
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={`${item.channel}-${item.role}`}
            className="flex items-center gap-3 py-1.5 px-2 rounded-lg bg-[var(--bg-primary)]"
          >
            {STATUS_ICON[item.status]}
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-[var(--text-primary)]">{item.channel}</span>
              {item.message && item.status === 'error' && (
                <p className="text-xs text-[var(--color-danger)] truncate">{item.message}</p>
              )}
            </div>
            <span
              className={`text-xs ${
                item.status === 'success'
                  ? 'text-[var(--color-success)]'
                  : item.status === 'error'
                    ? 'text-[var(--color-danger)]'
                    : 'text-[var(--text-muted)]'
              }`}
            >
              {STATUS_TEXT[item.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
