import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as 'en' | 'zh' | 'zh-TW' | 'th')) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    onError(error) {
      // Graceful fallback for missing translations during SSG/runtime
      if (error.code !== 'MISSING_MESSAGE') {
        console.warn(`[i18n] ${error.code}: ${error.message}`);
      }
    },
    getMessageFallback({ namespace, key }) {
      return key;
    },
  };
});
