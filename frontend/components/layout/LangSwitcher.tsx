'use client';

import { useRouter, usePathname } from '@/i18n/navigation';
import { useLocale } from 'next-intl';

const LANGS = [
  { code: 'zh', label: '简体' },
  { code: 'zh-TW', label: '繁體' },
  { code: 'th', label: 'ไทย' },
  { code: 'en', label: 'EN' },
] as const;

type LocaleCode = (typeof LANGS)[number]['code'];

export function LangSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function handleSwitch(newLocale: LocaleCode) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <div
      className="flex rounded-md border border-subtle-token overflow-hidden"
      role="group"
      aria-label="语言切换"
    >
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => handleSwitch(code)}
          aria-pressed={locale === code}
          className={`px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            locale === code
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface text-secondary-token hover:bg-bg-primary'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
