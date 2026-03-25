'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import useSWR, { mutate } from 'swr';
import { Clock, Plus, Pencil, Trash2, Power, PowerOff, Calendar } from 'lucide-react';

const API_BASE = '/api';

const swrFetcher = (url: string) => fetch(url).then((r) => r.json());

// ── 类型定义 ──────────────────────────────────────────────────────────────────

interface Schedule {
  id: string;
  name: string;
  platform: 'lark' | 'dingtalk';
  template: string;
  channels: string[];
  cron_hour: number;
  cron_minute: number;
  force: boolean;
  dry_run: boolean;
  enabled: boolean;
  description: string;
  created_at: string;
  updated_at?: string;
}

interface SchedulePayload {
  name: string;
  platform: 'lark' | 'dingtalk';
  template: string;
  channels: string[];
  cron_hour: number;
  cron_minute: number;
  force: boolean;
  dry_run: boolean;
  enabled: boolean;
  description: string;
}

// ── i18n ──────────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    title: '定时排程',
    subtitle: '配置自动定时推送任务，按时执行 Lark / 钉钉通知',
    addSchedule: '新增排程',
    name: '排程名称',
    platform: '平台',
    template: '模板',
    channels: '通道（逗号分隔）',
    time: '执行时间（24h）',
    hour: '时',
    minute: '分',
    force: '强制重发',
    dryRun: '仅预览（不实际发送）',
    description: '备注',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    enable: '启用',
    disable: '停用',
    edit: '编辑',
    status: '状态',
    enabled: '已启用',
    disabled: '已停用',
    lastRun: '创建时间',
    noSchedules: '暂无排程，点击「新增排程」创建',
    lark: 'Lark',
    dingtalk: '钉钉',
    templates: {
      cc_followup: 'CC 未打卡跟进',
      lp_followup: 'LP 未打卡跟进',
      ss_followup: 'SS 未打卡跟进',
      ops_followup: '运营未打卡跟进',
    },
    confirmDelete: '确认删除此排程？',
    loading: '加载中...',
    error: '加载排程失败',
  },
  en: {
    title: 'Scheduled Tasks',
    subtitle: 'Configure automated scheduled push tasks for Lark / DingTalk',
    addSchedule: 'Add Schedule',
    name: 'Name',
    platform: 'Platform',
    template: 'Template',
    channels: 'Channels (comma-separated)',
    time: 'Execution Time (24h)',
    hour: 'Hour',
    minute: 'Minute',
    force: 'Force Resend',
    dryRun: 'Dry Run Only',
    description: 'Notes',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    enable: 'Enable',
    disable: 'Disable',
    edit: 'Edit',
    status: 'Status',
    enabled: 'Enabled',
    disabled: 'Disabled',
    lastRun: 'Created At',
    noSchedules: 'No schedules yet. Click "Add Schedule" to create one.',
    lark: 'Lark',
    dingtalk: 'DingTalk',
    templates: {
      cc_followup: 'CC Followup',
      lp_followup: 'LP Followup',
      ss_followup: 'SS Followup',
      ops_followup: 'Ops Followup',
    },
    confirmDelete: 'Confirm delete this schedule?',
    loading: 'Loading...',
    error: 'Failed to load schedules',
  },
} as const;

type Lang = keyof typeof I18N;

// ── 默认表单值 ─────────────────────────────────────────────────────────────────

const DEFAULT_FORM: SchedulePayload = {
  name: '',
  platform: 'lark',
  template: 'cc_followup',
  channels: [],
  cron_hour: 9,
  cron_minute: 0,
  force: false,
  dry_run: false,
  enabled: true,
  description: '',
};

// ── 主组件 ────────────────────────────────────────────────────────────────────

interface ScheduleManagerProps {
  lang: Lang;
}

export function ScheduleManager({ lang }: ScheduleManagerProps) {
  const t = I18N[lang];

  const { data, error, isLoading } = useSWR<{ schedules: Schedule[]; total: number }>(
    `${API_BASE}/notifications/schedule`,
    swrFetcher,
    { refreshInterval: 30000 }
  );

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);
  const [form, setForm] = useState<SchedulePayload>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const schedules = data?.schedules ?? [];

  // ── 辅助函数 ────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  }

  function openEdit(sch: Schedule) {
    setEditTarget(sch);
    setForm({
      name: sch.name,
      platform: sch.platform,
      template: sch.template,
      channels: sch.channels,
      cron_hour: sch.cron_hour,
      cron_minute: sch.cron_minute,
      force: sch.force,
      dry_run: sch.dry_run,
      enabled: sch.enabled,
      description: sch.description,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
    setForm(DEFAULT_FORM);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        channels:
          typeof form.channels === 'string'
            ? (form.channels as string)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : form.channels,
      };
      if (editTarget) {
        await fetch(`${API_BASE}/notifications/schedule/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${API_BASE}/notifications/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      await mutate(`${API_BASE}/notifications/schedule`);
      toast.success(editTarget ? '排程已更新' : '排程已创建');
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.confirmDelete)) return;
    setActionId(id);
    try {
      await fetch(`${API_BASE}/notifications/schedule/${id}`, { method: 'DELETE' });
      await mutate(`${API_BASE}/notifications/schedule`);
      toast.success('已删除');
    } finally {
      setActionId(null);
    }
  }

  async function handleToggle(id: string) {
    setActionId(id);
    try {
      await fetch(`${API_BASE}/notifications/schedule/${id}/toggle`, { method: 'POST' });
      await mutate(`${API_BASE}/notifications/schedule`);
    } finally {
      setActionId(null);
    }
  }

  // ── 渲染 ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">{t.title}</span>
          <span className="text-xs text-[var(--text-secondary)]">{t.subtitle}</span>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand)] text-white text-xs rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          {t.addSchedule}
        </button>
      </div>

      {/* 状态反馈 */}
      {isLoading && (
        <p className="text-sm text-[var(--text-secondary)] py-4 text-center">{t.loading}</p>
      )}
      {error && <p className="text-sm text-red-500 py-4 text-center">{t.error}</p>}

      {/* 排程卡片列表 */}
      {!isLoading && !error && schedules.length === 0 && (
        <div className="py-10 text-center text-sm text-[var(--text-secondary)] border border-dashed border-[var(--border-subtle)] rounded-xl">
          <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p>{t.noSchedules}</p>
        </div>
      )}

      <div className="space-y-2">
        {schedules.map((sch) => (
          <div
            key={sch.id}
            className={`flex items-start justify-between p-3.5 rounded-lg border transition-colors ${
              sch.enabled
                ? 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
                : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] opacity-60'
            }`}
          >
            {/* 左侧信息 */}
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  sch.enabled ? 'bg-green-400' : 'bg-slate-300'
                }`}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{sch.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      sch.enabled
                        ? 'bg-green-50 text-green-600'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                    }`}
                  >
                    {sch.enabled ? t.enabled : t.disabled}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-action-surface text-action-accent font-medium">
                    {sch.platform === 'lark' ? t.lark : t.dingtalk}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {String(sch.cron_hour).padStart(2, '0')}:
                    {String(sch.cron_minute).padStart(2, '0')}
                  </span>
                  <span>
                    {t.templates[sch.template as keyof typeof t.templates] ?? sch.template}
                  </span>
                  {sch.channels.length > 0 && (
                    <span className="truncate max-w-[160px]">{sch.channels.join(', ')}</span>
                  )}
                  {sch.dry_run && <span className="text-amber-500">Dry Run</span>}
                </div>
                {sch.description && (
                  <p className="mt-0.5 text-[11px] text-[var(--text-secondary)] truncate max-w-xs">
                    {sch.description}
                  </p>
                )}
              </div>
            </div>

            {/* 右侧操作 */}
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              <button
                onClick={() => handleToggle(sch.id)}
                disabled={actionId === sch.id}
                title={sch.enabled ? t.disable : t.enable}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-50"
              >
                {sch.enabled ? (
                  <PowerOff className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Power className="w-3.5 h-3.5 text-green-500" />
                )}
              </button>
              <button
                onClick={() => openEdit(sch)}
                title={t.edit}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </button>
              <button
                onClick={() => handleDelete(sch.id)}
                disabled={actionId === sch.id}
                title={t.delete}
                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 新增/编辑弹窗 */}
      {showForm && (
        <ScheduleFormModal
          lang={lang}
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onCancel={closeForm}
          saving={saving}
          isEdit={!!editTarget}
        />
      )}
    </div>
  );
}

// ── 表单弹窗 ──────────────────────────────────────────────────────────────────

interface ScheduleFormModalProps {
  lang: Lang;
  form: SchedulePayload;
  setForm: React.Dispatch<React.SetStateAction<SchedulePayload>>;
  onSave: () => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  isEdit: boolean;
}

function ScheduleFormModal({
  lang,
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  isEdit,
}: ScheduleFormModalProps) {
  const t = I18N[lang];

  const channelsStr = Array.isArray(form.channels) ? form.channels.join(', ') : form.channels;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {isEdit ? t.edit : t.addSchedule}
        </h3>

        {/* 名称 */}
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">{t.name}</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
            placeholder={t.name}
          />
        </div>

        {/* 平台 + 模板 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">{t.platform}</label>
            <select
              value={form.platform}
              onChange={(e) =>
                setForm((f) => ({ ...f, platform: e.target.value as 'lark' | 'dingtalk' }))
              }
              className="w-full border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
            >
              <option value="lark">{t.lark}</option>
              <option value="dingtalk">{t.dingtalk}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">{t.template}</label>
            <select
              value={form.template}
              onChange={(e) => setForm((f) => ({ ...f, template: e.target.value }))}
              className="w-full border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
            >
              {Object.entries(t.templates).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 时间 */}
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">{t.time}</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={23}
              value={form.cron_hour}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  cron_hour: Math.max(0, Math.min(23, Number(e.target.value))),
                }))
              }
              className="w-20 border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
            />
            <span className="text-[var(--text-secondary)] text-sm">{t.hour}</span>
            <input
              type="number"
              min={0}
              max={59}
              value={form.cron_minute}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  cron_minute: Math.max(0, Math.min(59, Number(e.target.value))),
                }))
              }
              className="w-20 border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
            />
            <span className="text-[var(--text-secondary)] text-sm">{t.minute}</span>
          </div>
        </div>

        {/* 通道 */}
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">{t.channels}</label>
          <input
            type="text"
            value={channelsStr}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                channels: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
            className="w-full border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
            placeholder="cc_all, cc_team_a"
          />
        </div>

        {/* 备注 */}
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">{t.description}</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
            placeholder={t.description}
          />
        </div>

        {/* 开关 */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={form.force}
              onChange={(e) => setForm((f) => ({ ...f, force: e.target.checked }))}
              className="rounded"
            />
            {t.force}
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={form.dry_run}
              onChange={(e) => setForm((f) => ({ ...f, dry_run: e.target.checked }))}
              className="rounded"
            />
            {t.dryRun}
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="rounded"
            />
            {t.enabled}
          </label>
        </div>

        {/* 按钮 */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-primary)] transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={onSave}
            disabled={saving || !form.name.trim()}
            className="px-4 py-2 text-sm bg-[var(--brand)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? '...' : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
