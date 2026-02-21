"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const OPS_ITEMS: NavItem[] = [
  { href: "/ops/dashboard", label: "数据概览", icon: "📊" },
  { href: "/ops/funnel", label: "转化漏斗", icon: "🔽" },
  { href: "/ops/ranking", label: "人员排名", icon: "🏆" },
  { href: "/ops/outreach", label: "外呼监控", icon: "📞" },
  { href: "/ops/trial", label: "体验课跟进", icon: "📚" },
  { href: "/ops/orders", label: "订单分析", icon: "🛒" },
  { href: "/ops/channels", label: "渠道趋势", icon: "📈" },
  { href: "/ops/outreach-heatmap", label: "外呼热力图", icon: "🔥" },
  { href: "/ops/kpi-north-star", label: "北极星KPI", icon: "⭐" },
  { href: "/ops/funnel-team", label: "团队漏斗", icon: "🔄" },
  { href: "/ops/followup-alert", label: "跟进预警", icon: "🚨" },
  { href: "/ops/funnel-detail", label: "漏斗详情", icon: "📋" },
  { href: "/ops/channel-mom", label: "渠道环比", icon: "📊" },
  { href: "/ops/retention-rank", label: "留存排名", icon: "🏅" },
  { href: "/ops/productivity-history", label: "产能趋势", icon: "📈" },
  { href: "/ops/outreach-gap", label: "外呼缺口", icon: "📉" },
];

const BIZ_ITEMS: NavItem[] = [
  { href: "/biz/overview", label: "业务总览", icon: "🌐" },
  { href: "/biz/roi", label: "ROI 分析", icon: "💰" },
  { href: "/biz/enclosure", label: "围场策略", icon: "🎯" },
  { href: "/biz/trend", label: "趋势预测", icon: "🔮" },
  { href: "/biz/impact", label: "影响链分析", icon: "⛓️" },
  { href: "/biz/attribution", label: "归因分析", icon: "🔍" },
  { href: "/biz/team", label: "团队概况", icon: "👥" },
  { href: "/biz/insights", label: "运营洞察", icon: "💡" },
  { href: "/biz/cohort", label: "Cohort 分析", icon: "📈" },
  { href: "/biz/coverage", label: "覆盖缺口", icon: "🎯" },
  { href: "/biz/orders", label: "订单分析", icon: "🛒" },
  { href: "/biz/cohort-decay", label: "Cohort衰减", icon: "📉" },
  { href: "/biz/cohort-students", label: "学员明细", icon: "👨‍🎓" },
  { href: "/biz/orders-detail", label: "订单详析", icon: "📦" },
  { href: "/biz/enclosure-detail", label: "围场详情", icon: "🔬" },
  { href: "/biz/leads-detail", label: "Leads详情", icon: "🔗" },
  { href: "/biz/enclosure-health", label: "围场健康", icon: "🏥" },
  { href: "/biz/ranking-enhanced", label: "增强排名", icon: "🥇" },
  { href: "/biz/cohort-heatmap", label: "留存热力图", icon: "🔥" },
];

const SYS_ITEMS: NavItem[] = [
  { href: "/datasources", label: "数据源管理", icon: "🗄️" },
  { href: "/settings", label: "系统设置", icon: "⚙️" },
  { href: "/snapshots", label: "历史快照", icon: "🕐" },
  { href: "/reports", label: "分析报告", icon: "📋" },
];

function NavLink({ href, label, icon }: NavItem) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
        isActive
          ? "bg-blue-600 text-white font-medium"
          : "text-slate-600 hover:bg-slate-100"
      )}
    >
      <span className="text-base leading-none">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function SectionHeader({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide hover:text-slate-600 transition-colors"
    >
      <span>{label}</span>
      <span className="text-[10px]">{open ? "▲" : "▼"}</span>
    </button>
  );
}

export function NavSidebar() {
  const [opsOpen, setOpsOpen] = useState(true);
  const [bizOpen, setBizOpen] = useState(true);
  const [sysOpen, setSysOpen] = useState(false);

  return (
    <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0">
      <div className="px-4 py-4 border-b border-slate-100">
        <p className="text-xs font-bold text-indigo-600 tracking-wide">ref-ops-engine</p>
        <p className="text-xs text-slate-400 mt-0.5">51Talk 泰国转介绍运营</p>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {/* 运营视图 */}
        <div className="mb-1">
          <SectionHeader label="运营视图" open={opsOpen} onToggle={() => setOpsOpen((v) => !v)} />
          {opsOpen && (
            <div className="space-y-0.5 mt-0.5">
              {OPS_ITEMS.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </div>
          )}
        </div>

        {/* 业务视图 */}
        <div className="mb-1">
          <SectionHeader label="业务视图" open={bizOpen} onToggle={() => setBizOpen((v) => !v)} />
          {bizOpen && (
            <div className="space-y-0.5 mt-0.5">
              {BIZ_ITEMS.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </div>
          )}
        </div>

        {/* 系统 */}
        <div className="mt-2">
          <SectionHeader label="系统" open={sysOpen} onToggle={() => setSysOpen((v) => !v)} />
          {sysOpen && (
            <div className="space-y-0.5 mt-0.5">
              {SYS_ITEMS.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
