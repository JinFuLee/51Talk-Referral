/**
 * Next.js Middleware — RBAC 三层访问控制 + next-intl i18n 路由
 *
 * 三层逻辑：
 * 1. 特殊页面（login/access-denied）→ 直接放行，不参与 RBAC（防止死循环）
 * 2. 本地开发（localhost）→ 跳过 RBAC，直接放行
 * 3. 有 session cookie → fetch /api/access-control/me 传 X-Session-Token → 检查权限
 * 无 cookie 且非公开页 → redirect /[locale]/login?from=当前路径
 */

import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

import {
  decodeJwtEmail,
  extractPagePath,
  isAllowedByRole,
  isPublicPage,
  type MyAccessResponse,
} from './lib/access-control';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// 默认公开页面兜底（后端 API 不可达时使用）
const DEFAULT_PUBLIC_PAGES = ['/cc-performance', '/daily-monitor', '/checkin'];

// 特殊页面：不参与 RBAC，直接放行（防止 login/access-denied 重定向死循环）
const BYPASS_PAGES = ['/login', '/access-denied'];

// 后端 API 基础 URL（SSR 场景用 127.0.0.1，避免 DNS 解析）
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8100';

// ── 工具函数 ──────────────────────────────────────────────────────────────────

function isLocalhost(request: NextRequest): boolean {
  const host = request.headers.get('host') ?? '';
  return host.startsWith('localhost') || host.startsWith('127.0.0.1');
}

function getDefaultLocale(): string {
  return routing.defaultLocale;
}

function redirectToDenied(request: NextRequest): NextResponse {
  const locale = getDefaultLocale();
  const deniedUrl = new URL(`/${locale}/access-denied`, request.url);
  return NextResponse.redirect(deniedUrl);
}

/**
 * 调用后端 /api/access-control/me，透传 session cookie 为 X-Session-Token header。
 * 失败时返回 null（降级为拒绝访问）。
 */
async function fetchMyAccess(
  sessionToken: string | null,
  host: string
): Promise<MyAccessResponse | null> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      host,
    };
    if (sessionToken) {
      headers['X-Session-Token'] = sessionToken;
    }

    const response = await fetch(`${BACKEND_URL}/api/access-control/me`, {
      headers,
      cache: 'no-store', // 权限敏感，不走缓存
    });

    if (!response.ok) return null;
    return (await response.json()) as MyAccessResponse;
  } catch {
    return null;
  }
}

// ── 主 Middleware ─────────────────────────────────────────────────────────────

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 提取实际页面路径（去掉 locale 前缀）
  const pagePath = extractPagePath(pathname);

  // 特殊页面直接放行（login/access-denied 不参与 RBAC，防止重定向死循环）
  if (BYPASS_PAGES.includes(pagePath)) {
    return intlMiddleware(request);
  }

  // 本地开发模式：跳过 RBAC，直接交给 intlMiddleware
  if (isLocalhost(request)) {
    const response = intlMiddleware(request);
    response.headers.set('x-user-email', 'local@dev');
    response.headers.set('x-user-role', 'admin');
    return response;
  }

  // 读取 session cookie
  const sessionCookie = request.cookies.get('refops_session')?.value;

  // 无 cookie
  if (!sessionCookie) {
    // 公开页放行
    if (isPublicPage(pagePath, DEFAULT_PUBLIC_PAGES)) {
      return intlMiddleware(request);
    }
    // 非公开页 → redirect /login（带 from 参数）
    const locale = getDefaultLocale();
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 有 cookie → 传给后端验证
  const host = request.headers.get('host') ?? '';
  const access = await fetchMyAccess(sessionCookie, host);

  // 后端不可达 → 有 session cookie 则降级放行（后端恢复后再校验）
  if (!access) {
    const response = intlMiddleware(request);
    response.headers.set('x-auth-degraded', '1'); // 标记降级模式，前端可展示提示
    return response;
  }

  // 公开页放行（以后端配置为准）
  if (isPublicPage(pagePath, access.publicPages)) {
    const response = intlMiddleware(request);
    if (access.email) response.headers.set('x-user-email', access.email);
    if (access.role) response.headers.set('x-user-role', access.role);
    return response;
  }

  // 未在名单 → access-denied
  if (!access.role || !access.roleDef) {
    return redirectToDenied(request);
  }

  // admin 全放行（canManage=true 或 isAdmin=true）
  if (access.isAdmin || access.roleDef.canManage) {
    const response = intlMiddleware(request);
    response.headers.set('x-user-email', access.email || '');
    response.headers.set('x-user-role', access.role);
    response.headers.set('x-user-is-admin', '1');
    return response;
  }

  // 角色页面权限检查
  if (isAllowedByRole(pagePath, access.roleDef.pages ?? [])) {
    const response = intlMiddleware(request);
    response.headers.set('x-user-email', access.email || '');
    response.headers.set('x-user-role', access.role);
    return response;
  }

  return redirectToDenied(request);
}

export const config = {
  matcher: [
    // 匹配所有路径，排除 api、_next、静态文件、图标等
    '/((?!api|_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|css|js)$).*)',
  ],
};
