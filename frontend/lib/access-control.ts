/**
 * 权限管理工具函数 + 类型定义
 * 供 middleware（Edge Runtime）和客户端组件共用
 */

// ── 类型定义 ──────────────────────────────────────────────────────────────────

export interface RoleDef {
  name: { zh: string; th: string };
  color: string;
  pages: string[];
  canManage: boolean;
}

export interface UserAccess {
  email: string;
  name: string;
  role: string;
  addedAt: string;
  addedBy: string;
  lastAccess?: string;
}

export interface PageEntry {
  path: string;
  category: string;
  name: { zh: string; th: string };
  icon: string;
  description: { zh: string; th: string };
}

export interface AccessSettings {
  defaultDenyAll: boolean;
  allowLocalDev: boolean;
  auditLogEnabled: boolean;
}

export interface AccessControlConfig {
  version: number;
  roles: Record<string, RoleDef>;
  users: UserAccess[];
  publicPages: string[];
  pageRegistry: PageEntry[];
  settings: AccessSettings;
}

/** GET /api/access-control/me 的响应结构 */
export interface MyAccessResponse {
  email: string | null;
  name: string | null;
  role: string | null;
  roleDef: RoleDef | null;
  visiblePages: PageEntry[];
  publicPages: string[];
  isAdmin: boolean;
  source: 'local_dev' | 'unauthenticated' | 'not_in_roster' | 'cf_jwt' | 'session_cookie';
}

// ── JWT 解码（Edge Runtime 兼容，不依赖 Node.js Buffer）──────────────────────

/**
 * 从 Cloudflare Access JWT payload 中提取 email（不验签）。
 * Edge Runtime 不支持 Node.js Buffer，使用 atob / TextDecoder。
 */
export function decodeJwtEmail(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // base64url → 标准 base64（补 padding）
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = atob(padded);
    const payload = JSON.parse(decoded) as Record<string, unknown>;

    return (payload.email as string) || (payload.sub as string) || null;
  } catch {
    return null;
  }
}

// ── 路径匹配（与后端 _page_matches 逻辑对齐）─────────────────────────────────

/**
 * 判断页面路径是否匹配权限模式。
 * 支持：`*`（全部）、`/*`（全部含子路径）、`/path/*`（前缀匹配）、精确匹配
 */
export function pathMatchesPattern(pagePath: string, pattern: string): boolean {
  if (pattern === '*' || pattern === '/*') return true;
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    return pagePath === prefix || pagePath.startsWith(prefix + '/');
  }
  return pagePath === pattern;
}

/**
 * 判断路径是否在公开页面列表中（精确匹配）。
 */
export function isPublicPage(pagePath: string, publicPages: string[]): boolean {
  return publicPages.some((p) => pathMatchesPattern(pagePath, p));
}

/**
 * 判断路径是否在角色允许的页面列表中。
 */
export function isAllowedByRole(pagePath: string, rolePages: string[]): boolean {
  return rolePages.some((p) => pathMatchesPattern(pagePath, p));
}

// ── 从请求 URL 提取实际页面路径（去掉 locale 前缀）────────────────────────────

const LOCALES = ['en', 'zh', 'zh-TW', 'th'];

/**
 * 从带 locale 前缀的 pathname 中提取实际页面路径。
 * 例：`/zh/cc-performance` → `/cc-performance`
 * `/th/reports/ops` → `/reports/ops`
 * `/reports/ops` → `/reports/ops`（无 locale 前缀时原样返回）
 */
export function extractPagePath(pathname: string): string {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1) || '/';
    }
  }
  return pathname || '/';
}
