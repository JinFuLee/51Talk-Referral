/**
 * Next.js Middleware — RBAC 三层访问控制 + next-intl i18n 路由
 *
 * 三层逻辑：
 *   1. 公开页面（publicPages）→ 直接放行，交给 intlMiddleware
 *   2. 本地开发（localhost）→ 跳过 RBAC，直接放行
 *   3. 有 CF JWT → 解码 email → fetch /api/access-control/me → 检查权限
 *      无 JWT 且非 localhost → redirect /[locale]/access-denied
 */

import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

import {
  decodeJwtEmail,
  extractPagePath,
  isAllowedByRole,
  isPublicPage,
  type MyAccessResponse,
} from './lib/access-control';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

// 默认公开页面兜底（后端 API 不可达时使用）
const DEFAULT_PUBLIC_PAGES = ['/', '/cc-performance', '/daily-monitor', '/checkin'];

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
 * 调用后端 /api/access-control/me，透传 CF JWT header。
 * 失败时返回 null（降级为拒绝访问）。
 */
async function fetchMyAccess(
  jwtToken: string | null,
  host: string
): Promise<MyAccessResponse | null> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      host,
    };
    if (jwtToken) {
      headers['Cf-Access-Jwt-Assertion'] = jwtToken;
    }

    const response = await fetch(`${BACKEND_URL}/api/access-control/me`, {
      headers,
      // Edge Runtime 不支持 next.revalidate，用标准 Cache-Control
      // 60 秒缓存，避免每次请求都调后端
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

  // 本地开发模式：跳过 RBAC，直接交给 intlMiddleware
  if (isLocalhost(request)) {
    const response = intlMiddleware(request);
    response.headers.set('x-user-email', 'local@dev');
    response.headers.set('x-user-role', 'admin');
    return response;
  }

  const jwtToken = request.headers.get('Cf-Access-Jwt-Assertion');

  // 无 JWT 时先用兜底 publicPages 判断，避免后端不可达时全站锁死
  if (!jwtToken) {
    if (isPublicPage(pagePath, DEFAULT_PUBLIC_PAGES)) {
      const response = intlMiddleware(request);
      response.headers.set('x-user-email', 'public');
      return response;
    }
    return redirectToDenied(request);
  }

  // 有 JWT → 解码 email（快速本地校验，无需网络）
  const email = decodeJwtEmail(jwtToken);
  if (!email) {
    return redirectToDenied(request);
  }

  // 获取用户权限信息
  const host = request.headers.get('host') ?? '';
  const access = await fetchMyAccess(jwtToken, host);

  if (!access) {
    // 后端不可达：公开页面放行，其余拒绝
    if (isPublicPage(pagePath, DEFAULT_PUBLIC_PAGES)) {
      return intlMiddleware(request);
    }
    return redirectToDenied(request);
  }

  // 检查公开页面（以后端实时配置为准）
  if (isPublicPage(pagePath, access.publicPages)) {
    const response = intlMiddleware(request);
    response.headers.set('x-user-email', email);
    if (access.role) response.headers.set('x-user-role', access.role);
    return response;
  }

  // 未认证用户（不在名单）→ 只允许访问 publicPages，已在上面处理
  if (!access.role || !access.roleDef) {
    return redirectToDenied(request);
  }

  // 检查角色页面权限
  const rolePages = access.roleDef.pages ?? [];
  if (isAllowedByRole(pagePath, rolePages)) {
    const response = intlMiddleware(request);
    response.headers.set('x-user-email', email);
    response.headers.set('x-user-role', access.role);
    if (access.isAdmin) response.headers.set('x-user-is-admin', '1');
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
