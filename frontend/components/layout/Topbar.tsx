"use client";

import { useHealth } from "@/lib/hooks";
import { usePathname } from "next/navigation";
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

  const isOnline = health?.status === "ok";

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <div className="text-sm text-slate-500">
          {new Date().toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          {" · "}T-1 数据
        </div>
        <ViewModeBadge pathname={pathname} />
      </div>

      <div className="flex items-center gap-3">
        {/* Backend status indicator */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span
            className={clsx(
              "inline-block w-2 h-2 rounded-full",
              isOnline ? "bg-green-400" : "bg-red-400"
            )}
          />
          {isOnline ? "后端在线" : "后端离线"}
        </div>

        <span className="text-slate-200">|</span>

        <span className="text-xs text-slate-400">
          {health?.version ?? "—"}
        </span>
      </div>
    </header>
  );
}
