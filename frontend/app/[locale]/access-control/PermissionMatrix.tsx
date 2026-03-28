'use client';

import { Globe, Check, X } from 'lucide-react';
import { useLocale } from 'next-intl';

// ── I18N ─────────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    user: '用户',
    publicPage: '公开页面',
    noAccess: '无权限',
    roleInherited: '角色继承',
    noUsers: '暂无用户数据',
    noData: '暂无权限数据',
  },
  en: {
    user: 'User',
    publicPage: 'Public',
    noAccess: 'No access',
    roleInherited: 'Via role',
    noUsers: 'No users',
    noData: 'No data',
  },
} as const;

// ── 分类配置（与 PageOverview 保持一致）────────────────────────────────────

const CATEGORY_INFO: Record<string, { zh: string }> = {
  ops_core: { zh: '运营核心' },
  performance: { zh: '业绩管理' },
  student: { zh: '学员管理' },
  risk: { zh: '风险与质量' },
  reports: { zh: '报告汇报' },
  system: { zh: '系统管理' },
};

// ── 类型定义 ──────────────────────────────────────────────────────────────────

interface UserEntry {
  email: string;
  name?: string;
  role: string;
}

interface PageEntry {
  path: string;
  name_zh: string;
  category: string;
  is_public: boolean;
}

interface RoleDef {
  id: string;
  name_zh: string;
  color: string;
  allowed_pages?: string[];
}

interface PermissionMatrixProps {
  users: UserEntry[];
  pages: PageEntry[];
  roles: RoleDef[];
}

// ── 单元格组件 ────────────────────────────────────────────────────────────────

function MatrixCell({
  hasAccess,
  isPublic,
  isRoleInherited,
  title,
}: {
  hasAccess: boolean;
  isPublic: boolean;
  isRoleInherited: boolean;
  title: string;
}) {
  if (isPublic) {
    return (
      <td className="slide-td text-center" title={title}>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100">
          <Globe className="w-3 h-3 text-emerald-600" />
        </span>
      </td>
    );
  }

  if (hasAccess) {
    return (
      <td
        className={`slide-td text-center ${isRoleInherited ? 'bg-[var(--color-accent-surface)]' : ''}`}
        title={title}
      >
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-success-surface)]">
          <Check className="w-3 h-3 text-[var(--color-success)]" />
        </span>
      </td>
    );
  }

  return (
    <td className="slide-td text-center" title={title}>
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--n-100)]">
        <X className="w-3 h-3 text-[var(--n-400)]" />
      </span>
    </td>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

export default function PermissionMatrix({ users, pages, roles }: PermissionMatrixProps) {
  const locale = useLocale();
  const lang = locale === 'zh' || locale === 'zh-TW' ? 'zh' : 'en';
  const t = I18N[lang];

  // 按分类分组页面
  const groupedPages: Record<string, PageEntry[]> = {};
  for (const p of pages) {
    const cat = p.category || 'system';
    if (!groupedPages[cat]) groupedPages[cat] = [];
    groupedPages[cat].push(p);
  }

  const categoryKeys = Object.keys(CATEGORY_INFO).filter((k) => groupedPages[k]?.length > 0);

  // 构建角色→页面权限映射
  const rolePageMap: Record<string, Set<string>> = {};
  for (const role of roles) {
    rolePageMap[role.id] = new Set(role.allowed_pages ?? []);
  }

  if (users.length === 0) {
    return (
      <div className="state-empty">
        <span className="text-sm">{t.noUsers}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 图例 */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-success-surface)]">
            <Check className="w-3 h-3 text-[var(--color-success)]" />
          </span>
          {t.roleInherited}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100">
            <Globe className="w-3 h-3 text-emerald-600" />
          </span>
          {t.publicPage}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--n-100)]">
            <X className="w-3 h-3 text-[var(--n-400)]" />
          </span>
          {t.noAccess}
        </span>
      </div>

      {/* 按分类分表展示 */}
      {categoryKeys.map((catKey) => {
        const catPages = groupedPages[catKey];
        const catInfo = CATEGORY_INFO[catKey];

        return (
          <div
            key={catKey}
            className="overflow-x-auto rounded-xl border border-[var(--border-default)]"
          >
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="slide-thead-row text-xs">
                  <th className="slide-th slide-th-left" style={{ minWidth: '160px' }}>
                    {catInfo.zh} — {t.user}
                  </th>
                  {catPages.map((page) => (
                    <th
                      key={page.path}
                      className="slide-th slide-th-center"
                      style={{ minWidth: '80px', maxWidth: '120px' }}
                      title={page.path}
                    >
                      <span className="block truncate text-center max-w-[100px]">
                        {page.name_zh}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => {
                  const userRole = roles.find((r) => r.id === user.role);
                  const rolePages = rolePageMap[user.role] ?? new Set();

                  return (
                    <tr
                      key={user.email}
                      className={`border-b border-[var(--border-subtle)] ${
                        i % 2 === 0 ? '' : 'bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <td className="slide-td">
                        <div className="flex items-center gap-2">
                          {/* 角色色标 */}
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: userRole?.color ?? 'var(--n-400)' }}
                          />
                          <div>
                            <div className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[120px]">
                              {user.email}
                            </div>
                            {user.name && (
                              <div className="text-xs text-[var(--text-muted)]">{user.name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      {catPages.map((page) => {
                        const isPublic = page.is_public;
                        const hasAccess = isPublic || rolePages.has(page.path);
                        const isRoleInherited = !isPublic && rolePages.has(page.path);

                        return (
                          <MatrixCell
                            key={page.path}
                            hasAccess={hasAccess}
                            isPublic={isPublic}
                            isRoleInherited={isRoleInherited}
                            title={
                              isPublic
                                ? t.publicPage
                                : hasAccess
                                  ? `${t.roleInherited}: ${userRole?.name_zh ?? user.role}`
                                  : t.noAccess
                            }
                          />
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
