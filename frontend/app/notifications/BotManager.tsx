'use client';

import { useState } from 'react';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { BotCard, type BotChannel } from './BotCard';
import { BotFormModal } from './BotFormModal';
import { EmptyState } from '@/components/ui/EmptyState';

interface BotManagerProps {
  platform: 'lark' | 'dingtalk';
}

export function BotManager({ platform }: BotManagerProps) {
  const {
    data: rawData,
    isLoading,
    error,
    mutate,
  } = useSWR<{ channels: BotChannel[]; total: number } | BotChannel[]>(
    `/api/notifications/channels/${platform}`,
    swrFetcher
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
      <div className="flex items-center gap-2 py-8 justify-center text-[var(--text-muted)]">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">加载机器人列表…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-amber-600">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">无法加载机器人列表</span>
      </div>
    );
  }

  const bots = data ?? [];

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">机器人管理</h3>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          添加机器人
        </button>
      </div>

      {bots.length === 0 ? (
        <EmptyState
          title="尚未添加机器人"
          description={`点击"添加机器人"配置 ${platform === 'lark' ? 'Lark' : '钉钉'} 通道`}
          icon={
            <button
              onClick={openAdd}
              className="mb-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-[var(--border-hover)] text-sm text-[var(--text-muted)] hover:bg-[var(--bg-primary)] transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加机器人
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
