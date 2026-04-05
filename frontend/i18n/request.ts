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
      if (error.code === 'MISSING_MESSAGE') return; // silent for missing keys
      console.warn(`[i18n] ${error.code}: ${error.message}`);
    },
    getMessageFallback({ key }) {
      return key;
    },
  };
});
