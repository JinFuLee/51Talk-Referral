import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CardProps {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function Card({ title, children, className, actions }: CardProps) {
  return (
    <div
      className={cn(
        'bg-[var(--bg-surface)] text-card-foreground rounded-xl border border-[var(--border-default)] shadow-[var(--shadow-subtle)]',
        className
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)]">
          {title && <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-3">{children}</div>
    </div>
  );
}
