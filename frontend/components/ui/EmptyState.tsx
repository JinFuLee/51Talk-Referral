import { Inbox } from 'lucide-react';
import { useLocale } from 'next-intl';

const I18N = {
  zh: { defaultTitle: '暂无数据' },
  'zh-TW': { defaultTitle: '暫無資料' },
  en: { defaultTitle: 'No data' },
  th: { defaultTitle: 'ไม่มีข้อมูล' },
} as const;

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] || I18N.zh;
  const resolvedTitle = title ?? t.defaultTitle;
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      {icon ?? <Inbox className="h-12 w-12 mb-4 opacity-50" />}
      <p className="text-sm font-medium">{resolvedTitle}</p>
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
