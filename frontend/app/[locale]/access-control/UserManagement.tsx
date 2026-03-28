'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, UserPlus, Mail } from 'lucide-react';
import { useLocale } from 'next-intl';

// ── I18N ─────────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    addUser: '新增用户',
    batchAdd: '批量添加',
    email: '邮箱',
    name: '姓名',
    role: '角色',
    addedAt: '添加时间',
    actions: '操作',
    deleteConfirm: '确认删除此用户？',
    delete: '删除',
    save: '保存',
    cancel: '取消',
    emailPlaceholder: '用户邮箱',
    namePlaceholder: '用户姓名（可选）',
    batchPlaceholder: '每行一个邮箱\nuser1@example.com\nuser2@example.com',
    noUsers: '暂无用户',
    addFirst: '添加第一个用户',
    batchCount: '个邮箱',
    import: '导入',
    selectRole: '选择角色',
    changeRole: '修改角色',
    saving: '保存中…',
    deleting: '删除中…',
  },
  en: {
    addUser: 'Add User',
    batchAdd: 'Batch Add',
    email: 'Email',
    name: 'Name',
    role: 'Role',
    addedAt: 'Added At',
    actions: 'Actions',
    deleteConfirm: 'Delete this user?',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    emailPlaceholder: 'User email',
    namePlaceholder: 'User name (optional)',
    batchPlaceholder: 'One email per line\nuser1@example.com\nuser2@example.com',
    noUsers: 'No users yet',
    addFirst: 'Add the first user',
    batchCount: ' email(s)',
    import: 'Import',
    selectRole: 'Select role',
    changeRole: 'Change role',
    saving: 'Saving…',
    deleting: 'Deleting…',
  },
} as const;

// ── 类型定义 ──────────────────────────────────────────────────────────────────

export interface UserEntry {
  email: string;
  name?: string;
  role: string;
  added_at?: string;
}

interface RoleDef {
  id: string;
  name_zh: string;
  name_en: string;
  color: string;
}

interface UserManagementProps {
  users: UserEntry[];
  roles: RoleDef[];
  onAdd: (email: string, name: string, role: string) => Promise<void>;
  onDelete: (email: string) => Promise<void>;
  onChangeRole: (email: string, role: string) => Promise<void>;
}

// ── 角色徽章 ──────────────────────────────────────────────────────────────────

function RoleBadge({ role, roles }: { role: string; roles: RoleDef[] }) {
  const roleDef = roles.find((r) => r.id === role);
  if (!roleDef)
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--n-100)] text-[var(--text-muted)]">
        {role}
      </span>
    );

  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: `${roleDef.color}20`,
        color: roleDef.color,
      }}
    >
      {roleDef.name_zh}
    </span>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

export default function UserManagement({
  users,
  roles,
  onAdd,
  onDelete,
  onChangeRole,
}: UserManagementProps) {
  const locale = useLocale();
  const lang = locale === 'zh' || locale === 'zh-TW' ? 'zh' : 'en';
  const t = I18N[lang];

  const [showForm, setShowForm] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState(roles[0]?.id ?? '');
  const [batchText, setBatchText] = useState('');
  const [batchRole, setBatchRole] = useState(roles[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const defaultRole = roles[0]?.id ?? '';

  async function handleAdd() {
    if (!formEmail.trim()) return;
    setSaving(true);
    try {
      await onAdd(formEmail.trim(), formName.trim(), formRole || defaultRole);
      toast.success('用户已添加');
      setFormEmail('');
      setFormName('');
      setFormRole(defaultRole);
      setShowForm(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '添加失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleBatchImport() {
    const emails = batchText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.includes('@'));

    if (emails.length === 0) return;
    setSaving(true);
    try {
      for (const email of emails) {
        await onAdd(email, '', batchRole || defaultRole);
      }
      toast.success(`已添加 ${emails.length} 个用户`);
      setBatchText('');
      setShowBatch(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '批量添加失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(email: string) {
    if (!confirm(t.deleteConfirm)) return;
    setDeletingEmail(email);
    try {
      await onDelete(email);
      toast.success('用户已删除');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    } finally {
      setDeletingEmail(null);
    }
  }

  async function handleRoleChange(email: string, newRole: string) {
    setEditingRole(email);
    try {
      await onChangeRole(email, newRole);
      toast.success('角色已更新');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '更新失败');
    } finally {
      setEditingRole(null);
    }
  }

  const batchEmails = batchText
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.includes('@'));

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setShowForm(true);
            setShowBatch(false);
          }}
          className="flex items-center gap-1.5 btn-primary text-xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          {t.addUser}
        </button>
        <button
          onClick={() => {
            setShowBatch(true);
            setShowForm(false);
          }}
          className="flex items-center gap-1.5 btn-secondary text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          {t.batchAdd}
        </button>
      </div>

      {/* 单个添加表单 */}
      {showForm && (
        <div className="card-base p-4 space-y-3 border-action/30">
          <h4 className="text-sm font-medium text-[var(--text-primary)]">{t.addUser}</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">{t.email}</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="input-base"
                placeholder={t.emailPlaceholder}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">{t.name}</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="input-base"
                placeholder={t.namePlaceholder}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">{t.role}</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="input-base"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name_zh}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-secondary text-xs">
              {t.cancel}
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !formEmail.trim()}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {saving ? t.saving : t.save}
            </button>
          </div>
        </div>
      )}

      {/* 批量添加表单 */}
      {showBatch && (
        <div className="card-base p-4 space-y-3 border-action/30">
          <h4 className="text-sm font-medium text-[var(--text-primary)]">{t.batchAdd}</h4>
          <textarea
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            className="input-base h-28 resize-none"
            placeholder={t.batchPlaceholder}
          />
          <div className="flex items-center gap-3">
            <select
              value={batchRole}
              onChange={(e) => setBatchRole(e.target.value)}
              className="input-base w-40"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name_zh}
                </option>
              ))}
            </select>
            {batchEmails.length > 0 && (
              <span className="text-xs text-[var(--text-muted)]">
                {batchEmails.length}
                {t.batchCount}
              </span>
            )}
            <div className="flex gap-2 ml-auto">
              <button onClick={() => setShowBatch(false)} className="btn-secondary text-xs">
                {t.cancel}
              </button>
              <button
                onClick={handleBatchImport}
                disabled={saving || batchEmails.length === 0}
                className="btn-primary text-xs disabled:opacity-50"
              >
                {saving ? t.saving : t.import}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 用户表格 */}
      {users.length === 0 ? (
        <div className="state-empty">
          <Mail className="w-8 h-8 text-[var(--n-300)]" />
          <p className="text-sm">{t.noUsers}</p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-xs mt-2">
            {t.addFirst}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="slide-thead-row text-xs">
                <th className="slide-th slide-th-left">{t.email}</th>
                <th className="slide-th slide-th-left">{t.name}</th>
                <th className="slide-th slide-th-left">{t.role}</th>
                <th className="slide-th slide-th-left">{t.addedAt}</th>
                <th className="slide-th slide-th-center">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr
                  key={user.email}
                  className={`border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--color-accent-surface)] ${
                    i % 2 === 0 ? '' : 'bg-[var(--bg-subtle)]'
                  }`}
                >
                  <td className="slide-td font-medium">{user.email}</td>
                  <td className="slide-td text-[var(--text-muted)]">{user.name ?? '—'}</td>
                  <td className="slide-td">
                    {editingRole === user.email ? (
                      <select
                        defaultValue={user.role}
                        onChange={(e) => handleRoleChange(user.email, e.target.value)}
                        className="text-xs border border-[var(--border-default)] rounded px-2 py-1 bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
                        autoFocus
                        onBlur={() => setEditingRole(null)}
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name_zh}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingRole(user.email)}
                        title={t.changeRole}
                        className="hover:opacity-70 transition-opacity"
                      >
                        <RoleBadge role={user.role} roles={roles} />
                      </button>
                    )}
                  </td>
                  <td className="slide-td text-[var(--text-muted)] text-xs">
                    {user.added_at ? new Date(user.added_at).toLocaleDateString('zh-CN') : '—'}
                  </td>
                  <td className="slide-td text-center">
                    <button
                      onClick={() => handleDelete(user.email)}
                      disabled={deletingEmail === user.email}
                      title={t.delete}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
