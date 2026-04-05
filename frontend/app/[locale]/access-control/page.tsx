'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { PageHeader } from '@/components/layout/PageHeader';
import { BIZ_PAGE } from '@/lib/layout';
import PageOverview from './PageOverview';
import UserManagement from './UserManagement';
import RoleEditor from './RoleEditor';
import PermissionMatrix from './PermissionMatrix';
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
  roles:
    | RoleDef[]
    | Record<
        string,
        {
          name?: { zh?: string; en?: string };
          color?: string;
          pages?: string[];
          canManage?: boolean;
        }
      >;
  users: UserEntry[];
  publicPages?: string[];
  public_pages?: string[];
  pageRegistry?: PageEntry[];
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
        active ? 'bg-accent-token text-white' : 'text-secondary-token hover:bg-subtle'
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
  const t = useTranslations('accessControlPage');
  const [activeTab, setActiveTab] = useState<Tab>('pages');

  const {
    data: rawConfig,
    error,
    isLoading,
    mutate,
  } = useFilteredSWR<AccessControlConfig>('/api/access-control');

  // 后端 roles 是对象 {admin:{...}}，前端期望数组 RoleDef[]，这里做格式规范化
  const config = rawConfig
    ? {
        ...rawConfig,
        roles: Array.isArray(rawConfig.roles)
          ? rawConfig.roles
          : Object.entries(rawConfig.roles ?? {}).map(([id, def]) => {
              const d = def as Record<string, unknown>;
              const nameObj = (d.name ?? {}) as Record<string, string>;
              return {
                id,
                name_zh: nameObj.zh ?? id,
                name_en: nameObj.en ?? id,
                color: (d.color as string) ?? '#6b7280',
                is_preset: true,
                allowed_pages: (d.pages as string[]) ?? [],
                page_count: ((d.pages as string[]) ?? []).length,
              } satisfies RoleDef;
            }),
        pageRegistry: rawConfig.pageRegistry ?? [],
        publicPages: rawConfig.publicPages ?? rawConfig.public_pages ?? [],
        users: rawConfig.users ?? [],
      }
    : undefined;

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
      <PageHeader title={t('title')}>
        <p className="text-sm text-muted-token">{t('subtitle')}</p>
      </PageHeader>

      {/* Tab 切换栏 */}
      <div className="flex items-center gap-1 p-1 bg-subtle rounded-xl w-fit">
        {(['pages', 'users', 'roles', 'matrix'] as Tab[]).map((tab) => (
          <TabButton key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
            {t(`tabs.${tab}`)}
          </TabButton>
        ))}
      </div>

      {/* 加载态 */}
      {isLoading && (
        <div className="state-loading">
          <Shield className="w-5 h-5 text-muted-token animate-pulse" />
          <span className="text-sm">{t('loading')}</span>
        </div>
      )}

      {/* 错误态 */}
      {error && !isLoading && (
        <div className="state-error">
          <span className="text-sm">{t('error')}</span>
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
