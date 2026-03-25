'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckCircle, Star, Settings } from 'lucide-react';

const TABS = [
  { href: '/', icon: Home, label: '首页' },
  { href: '/checkin', icon: CheckCircle, label: '打卡' },
  { href: '/high-potential', icon: Star, label: '高潜' },
  { href: '/settings', icon: Settings, label: '设置' },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

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
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
