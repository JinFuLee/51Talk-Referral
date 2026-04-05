'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { BotCard, type BotChannel } from './BotCard';
import { BotFormModal } from './BotFormModal';
import { EmptyState } from '@/components/ui/EmptyState';

interface BotManagerProps {
  platform: 'lark' | 'dingtalk';
}

export function BotManager({ platform }: BotManagerProps) {
  const t = useTranslations('BotManager');
  const {
    data: rawData,
    isLoading,
    error,
    mutate,
  } = useFilteredSWR<{ channels: BotChannel[]; total: number } | BotChannel[]>(
    `/api/notifications/channels/${platform}`
  );
  // API 返回 {channels: [...], total: N}，兼容直接数组
  const data: BotChannel[] | undefined = rawData
    ? Array.isArray(rawData)
      ? rawData
      : (rawData as { channels: BotChannel[] }).channels
    : undefined;

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BotChannel | null>(null);

  async function handleSave(payload: Omit<BotChannel, 'id' | 'last_sent'>) {
    if (editTarget) {
      // PUT /api/notifications/channels/{platform}/{channel_id}
      await fetch(`/api/notifications/channels/${platform}/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      // POST /api/notifications/channels/{platform}
      await fetch(`/api/notifications/channels/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    await mutate();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/notifications/channels/${platform}/${id}`, { method: 'DELETE' });
    await mutate();
  }

  async function handleToggle(id: string, enabled: boolean) {
    // 后端无 /toggle 端点，用 PUT 更新 enabled 字段
    await fetch(`/api/notifications/channels/${platform}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    await mutate();
  }

  function openAdd() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(bot: BotChannel) {
    setEditTarget(bot);
    setFormOpen(true);
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-muted-token">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">{t('loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-warning-token">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">{t('loadError')}</span>
      </div>
    );
  }

  const bots = data ?? [];

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-primary-token">{t('title')}</h3>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-subtle-token rounded-lg hover:bg-bg-primary text-secondary-token transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('addBot')}
        </button>
      </div>

      {bots.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDesc', { platform: platform === 'lark' ? 'Lark' : t('dingtalk') })}
          icon={
            <button
              onClick={openAdd}
              className="mb-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-hover-token text-sm text-muted-token hover:bg-bg-primary transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('addBot')}
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      <BotFormModal
        open={formOpen}
        platform={platform}
        initial={editTarget}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
