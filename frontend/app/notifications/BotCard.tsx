'use client';

import { useState } from 'react';
import { Edit2, Trash2, Eye, EyeOff } from 'lucide-react';

export interface BotChannel {
  id: string;
  name: string;
  platform?: 'lark' | 'dingtalk';
  group_name: string;
  role?: string;
  enabled: boolean;
  /** 后端返回的脱敏预览字段（读展示用） */
  webhook_preview?: string;
  secret_preview?: string;
  /** 本地表单字段（新建/编辑时填写真实值） */
  webhook?: string;
  secret?: string;
  is_test: boolean;
  description?: string;
  last_sent?: string;
}

const ROLE_COLORS: Record<string, string> = {
  CC: 'bg-brand-100 text-brand-600',
  LP: 'bg-purple-100 text-purple-700',
  SS: 'bg-navy-100 text-navy-600',
  运营: 'bg-stone-100 text-stone-600',
  ALL: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]',
};

interface BotCardProps {
  bot: BotChannel;
  onEdit: (bot: BotChannel) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

export function BotCard({ bot, onEdit, onDelete, onToggle }: BotCardProps) {
  const [showSecret, setShowSecret] = useState(false);
  const roleColor =
    ROLE_COLORS[bot.role ?? ''] ?? 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]';
  const borderColor = bot.platform === 'lark' ? 'border-l-navy-400' : 'border-l-orange-500';

  return (
    <div
      className={`rounded-lg bg-[var(--bg-surface)] shadow-sm border border-[var(--border-default)] border-l-4 ${borderColor} p-4 flex flex-col gap-3`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{bot.name}</span>
            {bot.is_test && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                测试群
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{bot.group_name}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(bot)}
            className="p-1.5 rounded-md hover:bg-[var(--bg-subtle)] transition-colors text-[var(--text-secondary)]"
            title="编辑"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`确定删除机器人"${bot.name}"？`)) {
                onDelete(bot.id);
              }
            }}
            className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-[var(--text-secondary)] hover:text-red-500"
            title="删除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Role badge + enable toggle */}
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor}`}>
          {bot.role ?? 'ALL'}
        </span>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs text-[var(--text-muted)]">{bot.enabled ? '启用' : '停用'}</span>
          <div
            onClick={() => onToggle(bot.id, !bot.enabled)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              bot.enabled ? 'bg-brand-400' : 'bg-[var(--bg-elevated)]'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                bot.enabled ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </div>
        </label>
      </div>

      {/* Webhook */}
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-1">Webhook</p>
        <div className="flex items-center gap-1">
          <input
            type={showSecret ? 'text' : 'password'}
            value={bot.webhook_preview ?? bot.webhook ?? ''}
            readOnly
            className="flex-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-2 py-1 font-mono text-[var(--text-secondary)] outline-none"
          />
          <button
            onClick={() => setShowSecret((v) => !v)}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Last sent */}
      {bot.last_sent && (
        <p className="text-xs text-[var(--text-muted)]">上次推送：{bot.last_sent}</p>
      )}
    </div>
  );
}
