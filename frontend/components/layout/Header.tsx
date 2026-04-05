'use client';

import { useLocale } from 'next-intl';
import { LangSwitcher } from './LangSwitcher';
import { RoleSwitcher } from './RoleSwitcher';

const I18N = {
  zh: { title: '51Talk 转介绍运营面板', updatedLabel: '最后更新' },
  'zh-TW': { title: '51Talk 轉介紹運營面板', updatedLabel: '最後更新' },
  en: { title: '51Talk Referral Ops Panel', updatedLabel: 'Last updated' },
  th: { title: '51Talk Referral Ops Panel', updatedLabel: 'อัปเดตล่าสุด' },
} as const;

interface HeaderProps {
  lang: 'zh' | 'th';
  onLangChange: (lang: 'zh' | 'th') => void;
  role: 'ops' | 'exec' | 'finance';
  onRoleChange: (role: 'ops' | 'exec' | 'finance') => void;
  lastUpdated?: string;
}

export function Header({ lang, onLangChange, role, onRoleChange, lastUpdated }: HeaderProps) {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] || I18N.zh;
  const { title, updatedLabel } = t;

  return (
    <header className="h-14 bg-surface/80 backdrop-blur-md border-b border-border/40 flex items-center justify-between px-6 shrink-0 relative z-40">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-bold">51</span>
        </div>
        <span className="font-semibold text-primary-token text-sm">{title}</span>
      </div>

      <div className="flex items-center gap-4">
        {lastUpdated && (
          <span className="text-xs text-muted-token">
            {updatedLabel}: {lastUpdated}
          </span>
        )}
        <RoleSwitcher role={role} onRoleChange={onRoleChange} lang={lang} />
        <LangSwitcher />
      </div>
    </header>
  );
}
