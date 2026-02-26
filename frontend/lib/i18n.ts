/**
 * i18n 纯函数工具 — 不依赖 React / Zustand，服务端和客户端均可使用。
 *
 * 用法：
 *   // 客户端（继续用 hook）：
 *   const { t } = useTranslation();
 *
 *   // 服务端 RSC：
 *   import { getServerTranslations } from '@/lib/i18n-server';
 *   const t = await getServerTranslations();
 *   <h1>{t('root.title')}</h1>
 */

import { zhTranslations, thTranslations } from './translations';

export type Locale = 'zh' | 'th';

/**
 * 根据 locale 返回翻译字典。
 * 纯函数，无副作用，服务端/客户端均可调用。
 */
export function getTranslations(locale: Locale): Record<string, string> {
  return locale === 'th' ? thTranslations : zhTranslations;
}

/**
 * 从翻译字典中取值，找不到时依次 fallback：fallback 参数 → key 本身。
 */
export function t(
  translations: Record<string, string>,
  key: string,
  fallback?: string
): string {
  return translations[key] ?? fallback ?? key;
}

/**
 * 创建绑定了字典的翻译函数（方便 RSC 内一次性绑定 locale，避免每次传字典）。
 *
 * @example
 *   const t = createT(getTranslations('zh'));
 *   t('root.title') // "运营分析看板"
 */
export function createT(
  translations: Record<string, string>
): (key: string, fallback?: string) => string {
  return (key: string, fallback?: string) => t(translations, key, fallback);
}
