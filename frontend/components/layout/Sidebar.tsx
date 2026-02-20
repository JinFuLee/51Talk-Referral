"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "看板" },
  { href: "/analysis", label: "深度分析" },
  { href: "/ranking", label: "绩效排名" },
  { href: "/trend", label: "趋势分析" },
  { href: "/reports", label: "分析报告" },
  { href: "/datasources", label: "数据源" },
  { href: "/snapshots", label: "历史快照" },
  { href: "/settings", label: "设置" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-slate-900 flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-slate-700">
        <div className="text-white font-bold text-sm leading-tight">ref-ops-engine</div>
        <div className="text-slate-400 text-xs mt-0.5">51Talk 泰国转介绍</div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-slate-700">
        <p className="text-xs text-slate-500">M9 · Next.js 前端</p>
      </div>
    </aside>
  );
}
