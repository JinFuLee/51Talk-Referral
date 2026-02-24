"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Trophy,
  Phone,
  BookOpen,
  ShoppingCart,
  TrendingUp,
  Star,
  AlertTriangle,
  ClipboardList,
  Award,
  DollarSign,
  Target,
  Users,
  Search,
  Zap,
  Thermometer,
  Globe,
  Sparkles,
  Link2,
  Medal,
  Database,
  Settings,
  Clock,
  FileText,
  Menu,
  X,
  Monitor,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const OPS_GROUPS: NavGroup[] = [
  {
    label: "概览",
    items: [
      { href: "/ops/dashboard", label: "数据概览", Icon: BarChart3 },
      { href: "/ops/funnel", label: "转化漏斗", Icon: ChevronDown },
      { href: "/ops/funnel-detail", label: "漏斗详情", Icon: ClipboardList },
      { href: "/ops/funnel-team", label: "团队漏斗", Icon: Users },
    ]
  },
  {
    label: "人员",
    items: [
      { href: "/ops/ranking", label: "人员排名", Icon: Trophy },
      { href: "/ops/kpi-north-star", label: "北极星KPI", Icon: Star },
      { href: "/ops/retention-rank", label: "留存排名", Icon: Award },
      { href: "/ops/productivity-history", label: "产能趋势", Icon: TrendingUp },
    ]
  },
  {
    label: "外呼",
    items: [
      { href: "/ops/outreach", label: "外呼", Icon: Phone },
      { href: "/ops/outreach-gap", label: "外呼缺口", Icon: Target },
      { href: "/ops/trial", label: "体验课跟进", Icon: BookOpen },
      { href: "/ops/followup-alert", label: "跟进预警", Icon: AlertTriangle },
    ]
  },
  {
    label: "订单",
    items: [
      { href: "/ops/channels", label: "渠道", Icon: TrendingUp },
      { href: "/ops/channel-mom", label: "渠道环比", Icon: BarChart3 },
    ]
  }
];

const BIZ_GROUPS: NavGroup[] = [
  {
    label: "总览",
    items: [
      { href: "/biz/overview", label: "业务总览", Icon: Globe },
      { href: "/biz/trend", label: "趋势预测", Icon: Sparkles },
      { href: "/biz/impact", label: "影响链分析", Icon: Zap },
      { href: "/biz/attribution", label: "归因分析", Icon: Search },
      { href: "/biz/insights", label: "运营洞察", Icon: Thermometer },
      { href: "/biz/roi", label: "ROI 分析", Icon: DollarSign },
      { href: "/biz/team", label: "团队概况", Icon: Users },
      { href: "/biz/ranking-enhanced", label: "增强排名", Icon: Medal },
    ]
  },
  {
    label: "Cohort",
    items: [
      { href: "/biz/cohort", label: "Cohort 分析", Icon: TrendingUp },
      { href: "/biz/cohort-students", label: "学员明细", Icon: Users },
      { href: "/biz/cohort-decay", label: "留存衰减", Icon: ChevronDown },
      { href: "/biz/cohort-heatmap", label: "Cohort热力图", Icon: Thermometer },
    ]
  },
  {
    label: "围场",
    items: [
      { href: "/biz/enclosure", label: "围场", Icon: Target },
      { href: "/biz/enclosure-detail", label: "围场详情", Icon: ClipboardList },
      { href: "/biz/enclosure-health", label: "围场健康", Icon: Zap },
    ]
  },
  {
    label: "渠道",
    items: [
      { href: "/biz/orders", label: "订单", Icon: ShoppingCart },
      { href: "/biz/orders-detail", label: "订单详析", Icon: BarChart3 },
      { href: "/biz/leads-overview", label: "Leads总览", Icon: BarChart3 },
      { href: "/biz/coverage", label: "覆盖缺口", Icon: Target },
      { href: "/biz/leads-detail", label: "Leads详情", Icon: Link2 },
    ]
  }
];

const SYS_GROUPS: NavGroup[] = [
  {
    label: "管理",
    items: [
      { href: "/datasources", label: "数据源管理", Icon: Database },
      { href: "/settings", label: "系统设置", Icon: Settings },
      { href: "/snapshots", label: "历史快照", Icon: Clock },
      { href: "/reports", label: "分析报告", Icon: FileText },
      { href: "/present", label: "汇报模式", Icon: Monitor },
    ]
  }
];

function NavLink({ href, label, Icon }: NavItem) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={clsx(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive
          ? "bg-primary text-primary-foreground font-medium"
          : "text-slate-600 hover:bg-slate-100"
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
      className="w-full flex items-center justify-between px-3 py-1.5 mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
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
      <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
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
  const [opsOpen, setOpsOpen] = useState(true);
  const [bizOpen, setBizOpen] = useState(true);
  const [sysOpen, setSysOpen] = useState(false);

  return (
    <>
      <div className="px-4 py-4 border-b border-slate-100">
        <p className="text-xs font-bold text-primary tracking-wide">ref-ops-engine</p>
        <p className="text-xs text-slate-400 mt-0.5">51Talk 泰国转介绍运营</p>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto" aria-label="主导航">
        {/* 运营视图 */}
        <div>
          <SectionHeader label="运营视图" open={opsOpen} onToggle={() => setOpsOpen((v) => !v)} />
          {opsOpen && (
            <div className="mt-2 text-sm">
              {OPS_GROUPS.map((group) => (
                <SidebarGroup key={group.label} group={group} />
              ))}
            </div>
          )}
        </div>

        {/* 业务视图 */}
        <div>
          <SectionHeader label="业务视图" open={bizOpen} onToggle={() => setBizOpen((v) => !v)} />
          {bizOpen && (
            <div className="mt-2 text-sm">
              {BIZ_GROUPS.map((group) => (
                <SidebarGroup key={group.label} group={group} />
              ))}
            </div>
          )}
        </div>

        {/* 系统 */}
        <div>
          <SectionHeader label="系统" open={sysOpen} onToggle={() => setSysOpen((v) => !v)} />
          {sysOpen && (
            <div className="mt-2 text-sm">
              {SYS_GROUPS.map((group) => (
                <SidebarGroup key={group.label} group={group} />
              ))}
            </div>
          )}
        </div>
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-slate-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => setMobileOpen(true)}
        aria-label="打开导航菜单"
      >
        <Menu className="w-5 h-5 text-slate-600" aria-hidden="true" />
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
          <aside className="relative w-64 h-full bg-white flex flex-col shrink-0 shadow-xl">
            <button
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
      <aside className="hidden lg:flex w-56 h-full bg-white/90 backdrop-blur-md border-r border-border/40 flex-col shrink-0">
        <SidebarContent />
      </aside>
    </>
  );
}
