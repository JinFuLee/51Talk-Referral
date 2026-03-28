import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh', 'zh-TW', 'th'],
  defaultLocale: 'zh',
});
