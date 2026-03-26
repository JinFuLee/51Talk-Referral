'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
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

const MAIN_GROUPS: NavGroup[] = [
  {
    key: 'analysis',
    label: '分析',
    defaultOpen: true,
    items: [
      { href: '/', label: '总览 Dashboard', Icon: BarChart3 },
      { href: '/funnel', label: '漏斗分析', Icon: TrendingUp },
      { href: '/enclosure', label: '围场分析', Icon: Target },
      { href: '/channel', label: '渠道分析', Icon: DollarSign },
      { href: '/members', label: '学员明细', Icon: Users },
      { href: '/high-potential', label: '高潜学员', Icon: Star },
      { href: '/team', label: '团队汇总', Icon: Trophy },
    ],
  },
  {
    key: 'operations',
    label: '运营',
    defaultOpen: true,
    items: [
      { href: '/checkin', label: '打卡管理', Icon: CheckCircle },
      { href: '/daily-monitor', label: '触达监控', Icon: Radio },
      { href: '/outreach-quality', label: '接通质量分析', Icon: PhoneCall },
      { href: '/incentive-tracking', label: '激励追踪', Icon: Gift },
      { href: '/renewal-risk', label: '续费风险', Icon: AlertTriangle },
      { href: '/expiry-alert', label: '次卡到期预警', Icon: AlertTriangle },
    ],
  },
  {
    key: 'cross',
    label: '交叉分析',
    defaultOpen: false,
    items: [
      { href: '/attribution', label: '达成归因分析', Icon: GitMerge },
      { href: '/high-potential/warroom', label: '高潜作战室', Icon: Swords },
      { href: '/personnel-matrix', label: '人员战力图', Icon: Grid3X3 },
      { href: '/enclosure-health', label: '围场健康扫描仪', Icon: HeartPulse },
      { href: '/students/360', label: '学员360档案', Icon: Search },
      { href: '/learning-heatmap', label: '学习热图', Icon: Flame },
      { href: '/geo-distribution', label: '地理分布', Icon: Globe },
    ],
  },
  {
    key: 'system',
    label: '系统',
    defaultOpen: false,
    items: [
      { href: '/analytics', label: '运营分析报告', Icon: LineChart },
      { href: '/reports', label: '分析报告', Icon: FileText },
      { href: '/notifications', label: '通知推送', Icon: Bot },
      { href: '/indicator-matrix', label: '指标矩阵', Icon: LayoutGrid },
      { href: '/knowledge', label: '知识库', Icon: BookOpen },
      { href: '/settings', label: '设置', Icon: Settings },
      { href: '/present', label: '汇报模式', Icon: Monitor },
    ],
  },
];

const STORAGE_KEY = 'nav-group-open-state';

function getInitialOpenState(pathname: string): Record<string, boolean> {
  // 从 localStorage 读取用户偏好
  let stored: Record<string, boolean> = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch {
      // 忽略解析错误
    }
  }

  // 计算初始状态：用户偏好 > defaultOpen；但当前页所在分组强制展开
  const result: Record<string, boolean> = {};
  for (const group of MAIN_GROUPS) {
    const hasActive = group.items.some(
      (item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
    );
    if (hasActive) {
      result[group.key] = true;
    } else if (group.key in stored) {
      result[group.key] = stored[group.key];
    } else {
      result[group.key] = group.defaultOpen;
    }
  }
  return result;
}

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
          ? 'bg-[var(--color-accent)] text-white font-medium'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

function CollapsibleGroup({
  group,
  open,
  onToggle,
}: {
  group: NavGroup;
  open: boolean;
  onToggle: () => void;
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
        <span>{group.label}</span>
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
            <NavLink key={item.href} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const [openState, setOpenState] = useState<Record<string, boolean>>(() =>
    getInitialOpenState(pathname)
  );

  // 路由变更时，确保当前页所在分组展开
  useEffect(() => {
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
  }, [pathname]);

  // 持久化到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openState));
    } catch {
      // 忽略存储错误
    }
  }, [openState]);

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
        <p className="text-xs text-[var(--text-muted)] mt-0.5 pl-7">转介绍运营</p>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto" aria-label="主导航">
        {MAIN_GROUPS.map((group) => (
          <CollapsibleGroup
            key={group.key}
            group={group}
            open={openState[group.key] ?? group.defaultOpen}
            onToggle={() => toggle(group.key)}
          />
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
