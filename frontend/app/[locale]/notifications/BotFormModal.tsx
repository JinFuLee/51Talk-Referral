'use client';

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import type { BotChannel } from './BotCard';

interface BotFormModalProps {
  open: boolean;
  platform: 'lark' | 'dingtalk';
  initial?: BotChannel | null;
  onClose: () => void;
  onSave: (data: Omit<BotChannel, 'id' | 'last_sent'>) => Promise<void>;
}

const ROLES = ['CC', 'SS', 'LP', '运营', 'ALL'];

const EMPTY_FORM = {
  name: '',
  group_name: '',
  role: 'CC',
  enabled: true,
  webhook: '',
  secret: '',
  is_test: false,
};

export function BotFormModal({ open, platform, initial, onClose, onSave }: BotFormModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWebhook, setShowWebhook] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          name: initial.name,
          group_name: initial.group_name,
          role: initial.role ?? 'CC',
          enabled: initial.enabled,
          webhook: initial.webhook ?? '',
          secret: initial.secret ?? '',
          is_test: initial.is_test,
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setError(null);
      setShowWebhook(false);
      setShowSecret(false);
    }
  }, [open, initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.webhook.trim()) {
      setError('Webhook URL 不能为空');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...form,
        platform,
        secret: form.secret || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[var(--bg-surface)] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            {initial ? '编辑机器人' : '添加机器人'}
            <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
              {platform === 'lark' ? 'Lark' : '钉钉'}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-muted)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                机器人名称
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
                required
                placeholder="如：Lark CC日报"
                className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-action focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                群名称
              </label>
              <input
                value={form.group_name}
                onChange={(e) => setForm((v) => ({ ...v, group_name: e.target.value }))}
                required
                placeholder="如：CC 转介绍运营群"
                className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-action focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                角色
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm((v) => ({ ...v, role: e.target.value }))}
                className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-action"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_test}
                  onChange={(e) => setForm((v) => ({ ...v, is_test: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-xs text-[var(--text-secondary)]">测试群（默认发送）</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm((v) => ({ ...v, enabled: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-xs text-[var(--text-secondary)]">启用</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Webhook URL
            </label>
            <div className="flex items-center gap-1">
              <input
                type={showWebhook ? 'text' : 'password'}
                value={form.webhook}
                onChange={(e) => setForm((v) => ({ ...v, webhook: e.target.value }))}
                required
                placeholder="https://..."
                className="flex-1 text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-action font-mono"
              />
              <button
                type="button"
                onClick={() => setShowWebhook((v) => !v)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Secret（可选，用于签名验证）
            </label>
            <div className="flex items-center gap-1">
              <input
                type={showSecret ? 'text' : 'password'}
                value={form.secret}
                onChange={(e) => setForm((v) => ({ ...v, secret: e.target.value }))}
                placeholder="留空表示无签名"
                className="flex-1 text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-action font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-[var(--color-danger)] bg-[var(--color-danger-surface)] px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-action text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
