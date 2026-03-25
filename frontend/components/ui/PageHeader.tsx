'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string;
  children?: ReactNode; // 用于放置页面级操作按钮 (e.g. RunAnalysisButton)
}

export function PageHeader({ title, subtitle, icon: Icon, badge, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between shadow-sm pb-2 mb-4 border-b border-transparent">
      <div className="flex items-start sm:items-center gap-3">
        {Icon && (
          <div className="p-2 bg-action-surface text-action-text rounded-lg">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            {title}
            {badge && (
              <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-[var(--text-secondary)] px-2 py-0.5 rounded-full">
                {badge}
              </span>
            )}
          </h1>
          {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {/* 操作按钮区 */}
      {children && <div className="mt-3 sm:mt-0 flex items-center gap-2">{children}</div>}
    </div>
  );
}
