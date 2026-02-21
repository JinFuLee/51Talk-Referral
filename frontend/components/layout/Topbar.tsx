"use client";

import { useHealth } from "@/lib/hooks";
import { usePathname } from "next/navigation";
import { usePresentationStore } from "@/lib/stores/presentation-store";
import { MonitorPlay } from "lucide-react";
import clsx from "clsx";

function ViewModeBadge({ pathname }: { pathname: string }) {
  if (pathname.startsWith("/ops")) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-white font-medium">
        运营视图
      </span>
    );
  }
  if (pathname.startsWith("/biz")) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600 text-white font-medium">
        业务视图
      </span>
    );
  }
  return null;
}

export function Topbar() {
  const { data: health } = useHealth();
  const pathname = usePathname();
  const togglePresentationMode = usePresentationStore(s => s.togglePresentationMode);

  const isOnline = health?.status === "ok";

  return (
    <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 shrink-0 relative z-40">
      <div className="flex items-center gap-3">
        <div className="text-sm font-medium text-slate-500">
          {new Date().toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          <span className="text-slate-300 mx-2">|</span>
          T-1 数据
        </div>
        <ViewModeBadge pathname={pathname} />
      </div>

      <div className="flex items-center gap-4">
        {/* Presentation Mode Toggle */}
        <button
          onClick={togglePresentationMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hover:text-brand-600 hover:bg-brand-50 hover:border-brand-200 transition-all"
        >
          <MonitorPlay className="w-3.5 h-3.5" />
          <span>汇报沉浸模式</span>
        </button>

        <span className="text-slate-200">|</span>

        {/* Backend status indicator */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span
            className={clsx(
              "inline-block w-2.5 h-2.5 rounded-full shadow-sm",
              isOnline ? "bg-emerald-400" : "bg-rose-400"
            )}
          />
          {isOnline ? "后端在线" : "后端连接断开"}
        </div>
      </div>
    </header>
  );
}
