'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { PageHeader } from '@/components/layout/PageHeader';
import { BIZ_PAGE } from '@/lib/layout';
import PageOverview from './PageOverview';
import UserManagement from './UserManagement';
import RoleEditor from './RoleEditor';
import PermissionMatrix from './PermissionMatrix';

// ── I18N ─────────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    title: '权限管理',
    subtitle: '管理页面访问权限、用户角色与公开设置',
    tabs: {
      pages: '页面总览',
      users: '用户管理',
      roles: '角色管理',
      matrix: '权限矩阵',
    },
    loading: '加载中…',
    error: '加载失败，请刷新重试',
    saving: '保存中…',
  },
  en: {
    title: 'Access Control',
    subtitle: 'Manage page access, user roles, and public settings',
    tabs: {
      pages: 'Pages',
      users: 'Users',
      roles: 'Roles',
      matrix: 'Matrix',
    },
    loading: 'Loading…',
    error: 'Load failed, please refresh',
    saving: 'Saving…',
  },
} as const;

// ── 类型定义 ──────────────────────────────────────────────────────────────────

interface PageEntry {
  path: string;
  name_zh: string;
  name_en: string;
  description_zh?: string;
  description_en?: string;
  category: string;
  is_public: boolean;
  visitor_count?: number;
}

interface UserEntry {
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
  is_preset: boolean;
  page_count?: number;
  user_count?: number;
  allowed_pages?: string[];
}

interface AccessControlConfig {
  roles: RoleDef[];
  users: UserEntry[];
  publicPages: string[];
  pageRegistry: PageEntry[];
  settings: {
    require_auth: boolean;
    admin_emails: string[];
  };
}

type Tab = 'pages' | 'users' | 'roles' | 'matrix';

// ── Tab 按钮 ──────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-[var(--color-accent)] text-white'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
      }`}
    >
      {children}
    </button>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────

export default function AccessControlPage() {
  usePageDimensions({});
  const locale = useLocale();
  const lang = locale === 'zh' || locale === 'zh-TW' ? 'zh' : 'en';
  const t = I18N[lang];

  const [activeTab, setActiveTab] = useState<Tab>('pages');

  const {
    data: config,
    error,
    isLoading,
    mutate,
  } = useFilteredSWR<AccessControlConfig>('/api/access-control');

  // ── 页面公开 Toggle ───────────────────────────────────────────────────────

  const handleTogglePublic = useCallback(
    async (path: string, isPublic: boolean) => {
      if (!config) return;

      const newPublicPages = isPublic
        ? [...(config.publicPages ?? []), path]
        : (config.publicPages ?? []).filter((p) => p !== path);

      // Optimistic update
      mutate(
        {
          ...config,
          publicPages: newPublicPages,
          pageRegistry: config.pageRegistry.map((p) =>
            p.path === path ? { ...p, is_public: isPublic } : p
          ),
        },
        false
      );

      try {
        await fetch('/api/access-control', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_pages: newPublicPages }),
        });
        toast.success(isPublic ? '已设为公开' : '已设为私有');
      } catch (e) {
        toast.error('保存失败');
        mutate(); // 回滚
      }
    },
    [config, mutate]
  );

  // ── 用户操作 ──────────────────────────────────────────────────────────────

  const handleAddUser = useCallback(
    async (email: string, name: string, role: string) => {
      const res = await fetch('/api/access-control', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: [
            ...(config?.users ?? []),
            { email, name, role, added_at: new Date().toISOString() },
          ],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
    },
    [config, mutate]
  );

  const handleDeleteUser = useCallback(
    async (email: string) => {
      const res = await fetch('/api/access-control', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: (config?.users ?? []).filter((u) => u.email !== email),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
    },
    [config, mutate]
  );

  const handleChangeRole = useCallback(
    async (email: string, newRole: string) => {
      const res = await fetch('/api/access-control', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: (config?.users ?? []).map((u) =>
            u.email === email ? { ...u, role: newRole } : u
          ),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
    },
    [config, mutate]
  );

  // ── 角色操作 ──────────────────────────────────────────────────────────────

  const handleSaveRole = useCallback(
    async (roleUpdate: { id: string; allowed_pages?: string[] }) => {
      const updatedRoles = (config?.roles ?? []).map((r) =>
        r.id === roleUpdate.id ? { ...r, ...roleUpdate } : r
      );
      const res = await fetch('/api/access-control', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: updatedRoles }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
    },
    [config, mutate]
  );

  const handleCreateRole = useCallback(
    async (name: string, color: string) => {
      const newRole: RoleDef = {
        id: `custom_${Date.now()}`,
        name_zh: name,
        name_en: name,
        color,
        is_preset: false,
        allowed_pages: [],
      };
      const res = await fetch('/api/access-control', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roles: [...(config?.roles ?? []), newRole],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
    },
    [config, mutate]
  );

  // ── 渲染 ──────────────────────────────────────────────────────────────────

  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t.title}>
        <p className="text-sm text-[var(--text-muted)]">{t.subtitle}</p>
      </PageHeader>

      {/* Tab 切换栏 */}
      <div className="flex items-center gap-1 p-1 bg-[var(--bg-subtle)] rounded-xl w-fit">
        {(['pages', 'users', 'roles', 'matrix'] as Tab[]).map((tab) => (
          <TabButton key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
            {t.tabs[tab]}
          </TabButton>
        ))}
      </div>

      {/* 加载态 */}
      {isLoading && (
        <div className="state-loading">
          <Shield className="w-5 h-5 text-[var(--text-muted)] animate-pulse" />
          <span className="text-sm">{t.loading}</span>
        </div>
      )}

      {/* 错误态 */}
      {error && !isLoading && (
        <div className="state-error">
          <span className="text-sm">{t.error}</span>
        </div>
      )}

      {/* Tab 内容 */}
      {!isLoading && !error && config && (
        <>
          {activeTab === 'pages' && (
            <PageOverview pages={config.pageRegistry} onTogglePublic={handleTogglePublic} />
          )}

          {activeTab === 'users' && (
            <UserManagement
              users={config.users ?? []}
              roles={config.roles ?? []}
              onAdd={handleAddUser}
              onDelete={handleDeleteUser}
              onChangeRole={handleChangeRole}
            />
          )}

          {activeTab === 'roles' && (
            <RoleEditor
              roles={config.roles ?? []}
              pages={config.pageRegistry ?? []}
              onSaveRole={handleSaveRole}
              onCreateRole={handleCreateRole}
            />
          )}

          {activeTab === 'matrix' && (
            <PermissionMatrix
              users={config.users ?? []}
              pages={config.pageRegistry ?? []}
              roles={config.roles ?? []}
            />
          )}
        </>
      )}
    </div>
  );
}
