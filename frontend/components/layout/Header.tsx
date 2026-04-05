'use client';

import { useTranslations } from 'next-intl';
import { LangSwitcher } from './LangSwitcher';
import { RoleSwitcher } from './RoleSwitcher';
interface HeaderProps {
  lang: 'zh' | 'th';
  onLangChange: (lang: 'zh' | 'th') => void;
  role: 'ops' | 'exec' | 'finance';
  onRoleChange: (role: 'ops' | 'exec' | 'finance') => void;
  lastUpdated?: string;
}

export function Header({ lang, onLangChange, role, onRoleChange, lastUpdated }: HeaderProps) {
    const t = useTranslations('Header');
  const title = t('title');
  const updatedLabel = t('updatedLabel');

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
