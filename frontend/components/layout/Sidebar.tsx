'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import clsx from 'clsx';
const NAV_HREFS = [
  '/',
  '/analysis',
  '/ranking',
  '/trend',
  '/funnel',
  '/outreach-quality',
  '/followup-quality',
  '/referral-contributor',
  '/incentive-tracking',
  '/renewal-risk',
  '/reports',
  '/datasources',
  '/snapshots',
  '/settings',
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const locale = useLocale();
    const t = useTranslations('Sidebar');

  return (
    <aside className="w-56 bg-subtle flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-default-token">
        <div className="text-white font-bold text-sm leading-tight">ref-ops-engine</div>
        <div className="text-muted-token text-xs mt-0.5">{t('subtitle')}</div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV_HREFS.map((href) => {
          const isActive =
            href === '/' ? pathname === '/' || pathname === `/${locale}` : pathname.includes(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-token hover:text-white hover:bg-subtle'
              )}
            >
              {t(`nav.${href}`)}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-default-token">
        <p className="text-xs text-secondary-token">{t('footer')}</p>
      </div>
    </aside>
  );
}
