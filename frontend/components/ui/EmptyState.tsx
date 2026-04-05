import { Inbox } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  const t = useTranslations('ui');
  const resolvedTitle = title ?? t('defaultTitle');
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      {icon ?? <Inbox className="h-12 w-12 mb-4 opacity-50" />}
      <p className="text-sm font-medium">{resolvedTitle}</p>
      {description && <p className="text-xs mt-1 text-center max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 px-4 py-1.5 rounded-lg text-xs font-medium bg-subtle border border-default-token text-secondary-token hover:bg-n-200 transition-colors min-h-[44px] min-w-[44px]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
