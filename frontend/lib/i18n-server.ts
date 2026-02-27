/**
 * i18n 服务端工具 — 仅可在 React Server Components / Server Actions 中使用。
 *
 * 语言优先级：
 *   1. Cookie `locale`（未来 LanguageSwitcher 写入后自动生效）
 *   2. 默认 `zh`（与 config-store 默认值对齐）
 *
 * 客户端页面继续使用 `useTranslation()` hook，保持向后兼容。
 *
 * Next.js 版本兼容说明：
 *   - Next.js 14: cookies() 是同步函数，返回 ReadonlyRequestCookies
 *   - Next.js 15: cookies() 变为异步函数，返回 Promise<ReadonlyRequestCookies>
 *   当前项目使用 Next.js 14.2.21，getServerLocale() 标记为 async 仅为向前兼容，
 *   内部使用同步 cookies() 调用。升级到 Next.js 15 后改为 await cookies()。
 */

import { cookies } from 'next/headers';
import { getTranslations, createT, type Locale } from './i18n';

const VALID_LOCALES: Locale[] = ['zh', 'th'];

function isValidLocale(v: string | undefined): v is Locale {
  return VALID_LOCALES.includes(v as Locale);
}

/**
 * 在 RSC 中获取当前 locale（从 Cookie 读取，fallback zh）。
 * Next.js 14 兼容：cookies() 为同步调用。
 */
export async function getServerLocale(): Promise<Locale> {
  // Next.js 14: cookies() is synchronous
  const cookieStore = cookies();
  const raw = cookieStore.get('locale')?.value;
  return isValidLocale(raw) ? raw : 'zh';
}

/**
 * 在 RSC 中获取绑定了当前 locale 的翻译函数。
 *
 * @example
 *   // app/biz/enclosure-health/page.tsx (RSC)
 *   import { getServerTranslations } from '@/lib/i18n-server';
 *
 *   export default async function EnclosureHealthPage() {
 *     const t = await getServerTranslations();
 *     return <h1>{t('biz.enclosure-health.title')}</h1>;
 *   }
 */
export async function getServerTranslations(): Promise<
  (key: string, fallback?: string) => string
> {
  const locale = await getServerLocale();
  return createT(getTranslations(locale));
}
