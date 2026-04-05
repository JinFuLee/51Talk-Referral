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
        'bg-surface text-card-foreground rounded-xl border border-default-token',
        className
      )}
      style={{ boxShadow: 'var(--shadow-subtle)' }}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-default-token">
          {title && <h3 className="text-sm font-semibold text-primary-token">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4 md:p-5">{children}</div>
    </div>
  );
}
