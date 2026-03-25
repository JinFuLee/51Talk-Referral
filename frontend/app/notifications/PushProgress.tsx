'use client';

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

const STATUS_ICON = {
  pending: <div className="w-4 h-4 rounded-full border-2 border-[var(--border-hover)]" />,
  sending: <Loader2 className="w-4 h-4 animate-spin text-action-accent" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  error: <XCircle className="w-4 h-4 text-red-500" />,
};

const STATUS_TEXT = {
  pending: '等待中',
  sending: '发送中…',
  success: '已发送',
  error: '失败',
};

export function PushProgress({ items }: PushProgressProps) {
  const done = items.filter((i) => i.status === 'success' || i.status === 'error').length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Overall progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[var(--text-muted)]">推送进度</span>
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
                <p className="text-xs text-red-500 truncate">{item.message}</p>
              )}
            </div>
            <span
              className={`text-xs ${
                item.status === 'success'
                  ? 'text-emerald-600'
                  : item.status === 'error'
                    ? 'text-red-500'
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
