'use client';

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { useLocale } from 'next-intl';
import type { BotChannel } from './BotCard';

const I18N = {
  zh: {
    titleEdit: '编辑机器人',
    titleAdd: '添加机器人',
    webhookRequired: 'Webhook URL 不能为空',
    saveFailed: '保存失败',
    nameLabel: '机器人名称',
    namePlaceholder: '如：Lark CC日报',
    groupLabel: '群名称',
    groupPlaceholder: '如：CC 转介绍运营群',
    roleLabel: '角色',
    isTest: '测试群（默认发送）',
    enabled: '启用',
    secretHint: 'Secret（可选，用于签名验证）',
    secretPlaceholder: '留空表示无签名',
    cancel: '取消',
    saving: '保存中…',
    save: '保存',
    dingtalk: '钉钉',
  },
  'zh-TW': {
    titleEdit: '編輯機器人',
    titleAdd: '新增機器人',
    webhookRequired: 'Webhook URL 不能為空',
    saveFailed: '儲存失敗',
    nameLabel: '機器人名稱',
    namePlaceholder: '如：Lark CC日報',
    groupLabel: '群名稱',
    groupPlaceholder: '如：CC 轉介紹運營群',
    roleLabel: '角色',
    isTest: '測試群（預設發送）',
    enabled: '啟用',
    secretHint: 'Secret（選填，用於簽名驗證）',
    secretPlaceholder: '留空表示無簽名',
    cancel: '取消',
    saving: '儲存中…',
    save: '儲存',
    dingtalk: '釘釘',
  },
  en: {
    titleEdit: 'Edit Bot',
    titleAdd: 'Add Bot',
    webhookRequired: 'Webhook URL is required',
    saveFailed: 'Save failed',
    nameLabel: 'Bot Name',
    namePlaceholder: 'e.g. Lark CC Daily',
    groupLabel: 'Group Name',
    groupPlaceholder: 'e.g. CC Referral Group',
    roleLabel: 'Role',
    isTest: 'Test group (send by default)',
    enabled: 'Enabled',
    secretHint: 'Secret (optional, for signature verification)',
    secretPlaceholder: 'Leave blank if no signing',
    cancel: 'Cancel',
    saving: 'Saving…',
    save: 'Save',
    dingtalk: 'DingTalk',
  },
  th: {
    titleEdit: 'แก้ไขบอท',
    titleAdd: 'เพิ่มบอท',
    webhookRequired: 'กรุณากรอก Webhook URL',
    saveFailed: 'บันทึกล้มเหลว',
    nameLabel: 'ชื่อบอท',
    namePlaceholder: 'เช่น Lark CC รายวัน',
    groupLabel: 'ชื่อกลุ่ม',
    groupPlaceholder: 'เช่น กลุ่มปฏิบัติการ CC',
    roleLabel: 'บทบาท',
    isTest: 'กลุ่มทดสอบ (ส่งตามค่าเริ่มต้น)',
    enabled: 'เปิดใช้งาน',
    secretHint: 'Secret (ไม่บังคับ สำหรับตรวจสอบลายเซ็น)',
    secretPlaceholder: 'เว้นว่างหากไม่มีการเซ็นชื่อ',
    cancel: 'ยกเลิก',
    saving: 'กำลังบันทึก…',
    save: 'บันทึก',
    dingtalk: 'DingTalk',
  },
};

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
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
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
      setError(t.webhookRequired);
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
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-default-token">
          <h2 className="text-sm font-semibold text-primary-token">
            {initial ? t.titleEdit : t.titleAdd}
            <span className="ml-2 text-xs font-normal text-muted-token">
              {platform === 'lark' ? 'Lark' : t.dingtalk}
            </span>
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-subtle text-muted-token">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary-token mb-1">
                {t.nameLabel}
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
                required
                placeholder={t.namePlaceholder}
                className="w-full text-sm border border-subtle-token rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-action focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-token mb-1">
                {t.groupLabel}
              </label>
              <input
                value={form.group_name}
                onChange={(e) => setForm((v) => ({ ...v, group_name: e.target.value }))}
                required
                placeholder={t.groupPlaceholder}
                className="w-full text-sm border border-subtle-token rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-action focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary-token mb-1">
                {t.roleLabel}
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm((v) => ({ ...v, role: e.target.value }))}
                className="w-full text-sm border border-subtle-token rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-action"
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
                <span className="text-xs text-secondary-token">{t.isTest}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm((v) => ({ ...v, enabled: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-xs text-secondary-token">{t.enabled}</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary-token mb-1">
              Webhook URL
            </label>
            <div className="flex items-center gap-1">
              <input
                type={showWebhook ? 'text' : 'password'}
                value={form.webhook}
                onChange={(e) => setForm((v) => ({ ...v, webhook: e.target.value }))}
                required
                placeholder="https://..."
                className="flex-1 text-sm border border-subtle-token rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-action font-mono"
              />
              <button
                type="button"
                onClick={() => setShowWebhook((v) => !v)}
                className="p-2 text-muted-token hover:text-primary-token"
              >
                {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary-token mb-1">
              {t.secretHint}
            </label>
            <div className="flex items-center gap-1">
              <input
                type={showSecret ? 'text' : 'password'}
                value={form.secret}
                onChange={(e) => setForm((v) => ({ ...v, secret: e.target.value }))}
                placeholder={t.secretPlaceholder}
                className="flex-1 text-sm border border-subtle-token rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-action font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="p-2 text-muted-token hover:text-primary-token"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-danger-token bg-danger-surface px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-subtle-token rounded-lg text-sm text-secondary-token hover:bg-bg-primary transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-action text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? t.saving : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
