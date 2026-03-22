'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const MAIN_GROUPS: NavGroup[] = [
  {
    label: '分析',
    items: [
      { href: '/', label: '总览 Dashboard', Icon: BarChart3 },
      { href: '/funnel', label: '漏斗分析', Icon: TrendingUp },
      { href: '/enclosure', label: '围场分析', Icon: Target },
      { href: '/channel', label: '渠道分析', Icon: DollarSign },
      { href: '/members', label: '学员明细', Icon: Users },
      { href: '/high-potential', label: '高潜学员', Icon: Star },
      { href: '/team', label: '团队汇总', Icon: Trophy },
      { href: '/checkin', label: '打卡管理', Icon: CheckCircle },
      { href: '/daily-monitor', label: '触达监控', Icon: Radio },
      { href: '/students/360', label: '学员360档案', Icon: Search },
    ],
  },
  {
    label: '交叉分析',
    items: [
      { href: '/attribution', label: '达成归因分析', Icon: GitMerge },
      { href: '/high-potential/warroom', label: '高潜作战室', Icon: Swords },
      { href: '/cc-matrix', label: 'CC 围场战力图', Icon: Grid3X3 },
      { href: '/enclosure-health', label: '围场健康扫描仪', Icon: HeartPulse },
    ],
  },
  {
    label: '系统',
    items: [
      { href: '/reports', label: '分析报告', Icon: FileText },
      { href: '/settings', label: '设置', Icon: Settings },
      { href: '/present', label: '汇报模式', Icon: Monitor },
    ],
  },
];

function NavLink({ href, label, Icon }: NavItem) {
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
          ? 'bg-primary text-primary-foreground font-medium'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

function SectionHeader({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={open}
      className="w-full flex items-center justify-between px-3 py-1.5 mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-[var(--text-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
    >
      <span>{label}</span>
      {open ? (
        <ChevronUp className="w-3 h-3" aria-hidden="true" />
      ) : (
        <ChevronDown className="w-3 h-3" aria-hidden="true" />
      )}
    </button>
  );
}

function SidebarGroup({ group }: { group: NavGroup }) {
  return (
    <div className="mb-3">
      <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
        {group.label}
      </div>
      <div className="space-y-0.5">
        {group.items.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </div>
    </div>
  );
}

function SidebarContent() {
  return (
    <>
      <div className="px-4 py-4 border-b border-[var(--border-subtle)]">
        <p className="text-xs font-bold text-primary tracking-wide">ref-ops-engine</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">51Talk 泰国转介绍运营</p>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto" aria-label="主导航">
        {MAIN_GROUPS.map((group) => (
          <SidebarGroup key={group.label} group={group} />
        ))}
      </nav>
    </>
  );
}

export function NavSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => setMobileOpen(true)}
        aria-label="打开导航菜单"
      >
        <Menu className="w-5 h-5 text-[var(--text-secondary)]" aria-hidden="true" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="导航菜单"
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
              aria-label="关闭导航菜单"
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
