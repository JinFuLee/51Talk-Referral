'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { BrandMark } from '@/components/ui/BrandMark';
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Trophy,
  TrendingUp,
  Star,
  DollarSign,
  Target,
  Users,
  Settings,
  FileText,
  Menu,
  X,
  Monitor,
  CheckCircle,
  GitMerge,
  Swords,
  Grid3X3,
  HeartPulse,
  Radio,
  Search,
  LayoutGrid,
  PhoneCall,
  Gift,
  AlertTriangle,
  Flame,
  Globe,
  Bot,
  BookOpen,
  LineChart,
  UserCheck,
  Activity,
  Lock,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

interface NavGroup {
  key: string;
  label: string;
  defaultOpen: boolean;
  items: NavItem[];
}

// label 字段存储 translation key（在组件内通过 t(key) 渲染）
const MAIN_GROUPS: NavGroup[] = [
  {
    key: 'analysis',
    label: 'group.analysis',
    defaultOpen: true,
    items: [
      { href: '/', label: 'dashboard', Icon: BarChart3 },
      { href: '/funnel', label: 'funnel', Icon: TrendingUp },
      { href: '/enclosure', label: 'enclosure', Icon: Target },
      { href: '/channel', label: 'channel', Icon: DollarSign },
      { href: '/members', label: 'members', Icon: Users },
      { href: '/high-potential', label: 'highPotential', Icon: Star },
      { href: '/team', label: 'team', Icon: Trophy },
    ],
  },
  {
    key: 'operations',
    label: 'group.operations',
    defaultOpen: true,
    items: [
      { href: '/checkin', label: 'checkin', Icon: CheckCircle },
      { href: '/daily-monitor', label: 'dailyMonitor', Icon: Radio },
      { href: '/outreach-quality', label: 'outreachQuality', Icon: PhoneCall },
      { href: '/incentive-tracking', label: 'incentiveTracking', Icon: Gift },
      { href: '/renewal-risk', label: 'renewalRisk', Icon: AlertTriangle },
      { href: '/expiry-alert', label: 'expiryAlert', Icon: AlertTriangle },
      { href: '/cc-performance', label: 'ccPerformance', Icon: UserCheck },
    ],
  },
  {
    key: 'cross',
    label: 'group.cross',
    defaultOpen: false,
    items: [
      { href: '/attribution', label: 'attribution', Icon: GitMerge },
      { href: '/high-potential/warroom', label: 'highPotentialWarroom', Icon: Swords },
      { href: '/personnel-matrix', label: 'personnelMatrix', Icon: Grid3X3 },
      { href: '/enclosure-health', label: 'enclosureHealth', Icon: HeartPulse },
      { href: '/students/360', label: 'students360', Icon: Search },
      { href: '/learning-heatmap', label: 'learningHeatmap', Icon: Flame },
      { href: '/geo-distribution', label: 'geoDistribution', Icon: Globe },
    ],
  },
  {
    key: 'system',
    label: 'group.system',
    defaultOpen: false,
    items: [
      { href: '/analytics', label: 'analytics', Icon: LineChart },
      { href: '/reports', label: 'reports', Icon: FileText },
      { href: '/notifications', label: 'notifications', Icon: Bot },
      { href: '/live-orders', label: 'liveOrders', Icon: Zap },
      { href: '/indicator-matrix', label: 'indicatorMatrix', Icon: LayoutGrid },
      { href: '/knowledge', label: 'knowledge', Icon: BookOpen },
      { href: '/data-health', label: 'dataHealth', Icon: Activity },
      { href: '/settings', label: 'settings', Icon: Settings },
      { href: '/access-control', label: 'accessControl', Icon: Lock },
      { href: '/present', label: 'present', Icon: Monitor },
    ],
  },
];

const STORAGE_KEY = 'nav-group-open-state';

function getDefaultOpenState(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const group of MAIN_GROUPS) {
    result[group.key] = group.defaultOpen;
  }
  return result;
}

function NavLink({ href, label, Icon, t }: NavItem & { t: (key: string) => string }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={clsx(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isActive
          ? 'bg-[var(--color-accent)] text-white font-medium'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{t(label)}</span>
    </Link>
  );
}

function CollapsibleGroup({
  group,
  open,
  onToggle,
  t,
}: {
  group: NavGroup;
  open: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={clsx(
          'w-full flex items-center justify-between px-3 py-1.5 rounded',
          'text-[10px] font-semibold uppercase tracking-wider',
          'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'mt-3'
        )}
      >
        <span>{t(group.label)}</span>
        {open ? (
          <ChevronDown className="w-3 h-3 transition-transform duration-200" aria-hidden="true" />
        ) : (
          <ChevronRight className="w-3 h-3 transition-transform duration-200" aria-hidden="true" />
        )}
      </button>

      <div
        className={clsx(
          'overflow-hidden transition-all duration-200 ease-in-out',
          open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="space-y-0.5 pb-1">
          {group.items.map((item) => (
            <NavLink key={item.href} {...item} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const [openState, setOpenState] = useState<Record<string, boolean>>(getDefaultOpenState);
  const [hydrated, setHydrated] = useState(false);

  // 挂载后从 localStorage 恢复 + 当前路由分组展开
  useEffect(() => {
    let stored: Record<string, boolean> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch {
      // 忽略解析错误
    }

    const next: Record<string, boolean> = {};
    for (const group of MAIN_GROUPS) {
      const hasActive = group.items.some(
        (item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
      );
      if (hasActive) {
        next[group.key] = true;
      } else if (group.key in stored) {
        next[group.key] = stored[group.key];
      } else {
        next[group.key] = group.defaultOpen;
      }
    }
    setOpenState(next);
    setHydrated(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 路由变更时，确保当前页所在分组展开
  useEffect(() => {
    if (!hydrated) return;
    setOpenState((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const group of MAIN_GROUPS) {
        const hasActive = group.items.some(
          (item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
        );
        if (hasActive && !next[group.key]) {
          next[group.key] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname, hydrated]);

  // 持久化到 localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openState));
    } catch {
      // 忽略存储错误
    }
  }, [openState, hydrated]);

  const toggle = (key: string) => {
    setOpenState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <div className="px-4 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <BrandMark size={20} className="text-[var(--brand-p1)] shrink-0" />
          <p className="text-sm font-bold text-primary tracking-wide font-display">51Talk</p>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 pl-7">{t('subtitle')}</p>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto" aria-label={t('mainNav')}>
        {MAIN_GROUPS.map((group) => (
          <CollapsibleGroup
            key={group.key}
            group={group}
            open={openState[group.key] ?? group.defaultOpen}
            onToggle={() => toggle(group.key)}
            t={t}
          />
        ))}
      </nav>
    </>
  );
}

export function NavSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const tNav = useTranslations('nav');

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => setMobileOpen(true)}
        aria-label={tNav('openMenu')}
      >
        <Menu className="w-5 h-5 text-[var(--text-secondary)]" aria-hidden="true" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label={tNav('mainNav')}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Sidebar panel */}
          <aside className="relative w-64 h-full bg-[var(--bg-surface)] flex flex-col shrink-0 shadow-xl">
            <button
              className="absolute top-3 right-3 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => setMobileOpen(false)}
              aria-label={tNav('closeMenu')}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 h-full bg-[var(--bg-surface)] backdrop-blur-md border-r border-[var(--border-default)] flex-col shrink-0">
        <SidebarContent />
      </aside>
    </>
  );
}
