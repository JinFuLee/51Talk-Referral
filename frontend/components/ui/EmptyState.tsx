import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ title = '暂无数据', description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      {icon ?? <Inbox className="h-12 w-12 mb-4 opacity-50" />}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs mt-1 text-center max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 px-4 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--border-default)] transition-colors min-h-[44px] min-w-[44px]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
