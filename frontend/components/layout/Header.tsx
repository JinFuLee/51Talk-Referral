"use client";

import { LangSwitcher } from "./LangSwitcher";
import { RoleSwitcher } from "./RoleSwitcher";

interface HeaderProps {
  lang: "zh" | "th";
  onLangChange: (lang: "zh" | "th") => void;
  role: "ops" | "exec" | "finance";
  onRoleChange: (role: "ops" | "exec" | "finance") => void;
  lastUpdated?: string;
}

export function Header({ lang, onLangChange, role, onRoleChange, lastUpdated }: HeaderProps) {
  const title = lang === "zh" ? "51Talk 转介绍运营面板" : "51Talk Referral Ops Panel";
  const updatedLabel = lang === "zh" ? "最后更新" : "อัปเดตล่าสุด";

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-bold">51</span>
        </div>
        <span className="font-semibold text-gray-900 text-sm">{title}</span>
      </div>

      <div className="flex items-center gap-4">
        {lastUpdated && (
          <span className="text-xs text-gray-400">
            {updatedLabel}: {lastUpdated}
          </span>
        )}
        <RoleSwitcher role={role} onRoleChange={onRoleChange} lang={lang} />
        <LangSwitcher lang={lang} onLangChange={onLangChange} />
      </div>
    </header>
  );
}
