'use client';

import { useTranslations } from 'next-intl';
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
  CC: 'bg-action-surface text-action-text',
  LP: 'bg-accent-surface text-accent-token',
  SS: 'bg-action-accent-subtle text-action-accent',
  运营: 'bg-stone-100 text-stone-600',
  ALL: 'bg-subtle text-secondary-token',
};

interface BotCardProps {
  bot: BotChannel;
  onEdit: (bot: BotChannel) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

export function BotCard({ bot, onEdit, onDelete, onToggle }: BotCardProps) {
  const t = useTranslations('BotCard');
  const [showSecret, setShowSecret] = useState(false);
  const roleColor = ROLE_COLORS[bot.role ?? ''] ?? 'bg-subtle text-secondary-token';
  const borderColor = bot.platform === 'lark' ? 'border-l-action-accent' : 'border-l-orange-500';

  return (
    <div
      className={`rounded-xl bg-surface border border-default-token border-l-4 ${borderColor} p-4 flex flex-col gap-3`}
      style={{ boxShadow: 'var(--shadow-subtle)', transition: 'box-shadow 0.2s ease' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-medium)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-subtle)';
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary-token">{bot.name}</span>
            {bot.is_test && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-warning-surface text-warning-token font-medium">
                {t('testBadge')}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-token mt-0.5">{bot.group_name}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(bot)}
            className="p-1.5 rounded-md hover:bg-subtle transition-colors text-secondary-token"
            title="编辑"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (window.confirm(t('confirmDelete', { name: bot.name }))) {
                onDelete(bot.id);
              }
            }}
            className="p-1.5 rounded-md hover:bg-danger-surface transition-colors text-secondary-token hover:text-danger-token"
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
          <span className="text-xs text-muted-token">{bot.enabled ? t('enabled') : t('disabled')}</span>
          <div
            onClick={() => onToggle(bot.id, !bot.enabled)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              bot.enabled ? 'bg-action' : 'bg-bg-elevated'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface shadow transition-transform ${
                bot.enabled ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </div>
        </label>
      </div>

      {/* Webhook */}
      <div>
        <p className="text-xs text-muted-token mb-1">{t('webhookLabel')}</p>
        <div className="flex items-center gap-1">
          <input
            type={showSecret ? 'text' : 'password'}
            value={bot.webhook_preview ?? bot.webhook ?? ''}
            readOnly
            className="flex-1 text-xs bg-bg-primary border border-subtle-token rounded px-2 py-1 font-mono text-secondary-token outline-none"
          />
          <button
            onClick={() => setShowSecret((v) => !v)}
            className="p-1 text-muted-token hover:text-primary-token"
          >
            {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Last sent */}
      {bot.last_sent && <p className="text-xs text-muted-token">{t('lastSent', { time: bot.last_sent })}</p>}
    </div>
  );
}
