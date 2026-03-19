import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

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
        "bg-[var(--bg-surface)]/95 backdrop-blur-md text-card-foreground rounded-[var(--radius-md)] border border-[var(--border-default)]/40 shadow-[var(--shadow-subtle)] transition-all duration-200 hover:shadow-[var(--shadow-medium)] hover:-translate-y-1",
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]/40">
          {title && (
            <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
