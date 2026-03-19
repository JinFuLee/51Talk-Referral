"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string;
  badgeColor?: string;
  children?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = "bg-slate-100 text-[var(--text-secondary)]",
  children,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <Icon className="w-5 h-5 text-[var(--text-secondary)]" aria-hidden="true" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{title}</h1>
            {badge && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </div>
  );
}
