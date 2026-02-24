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
        "bg-white/95 backdrop-blur-md text-card-foreground rounded-2xl border border-border/40 shadow-flash transition-all duration-500 hover:shadow-flash-lg hover:-translate-y-1",
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
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
