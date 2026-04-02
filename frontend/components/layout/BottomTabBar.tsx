'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Home, CheckCircle, Star, Settings } from 'lucide-react';

// label 字段存储 translation key
const TABS = [
  { href: '/', icon: Home, label: 'home' },
  { href: '/checkin', icon: CheckCircle, label: 'checkin' },
  { href: '/high-potential', icon: Star, label: 'highPotential' },
  { href: '/settings', icon: Settings, label: 'settings' },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();
  const t = useTranslations('bottomTab');

  return (
    <nav
      className="block md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-surface)] border-t border-[var(--border-default)]"
      style={{ height: 56 }}
    >
      <div className="flex h-full items-stretch">
        {TABS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive
                  ? 'text-[var(--brand-p1)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              <span className="text-[10px] font-medium leading-none">{t(label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
