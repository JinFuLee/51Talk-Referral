'use client';

import { useTranslations } from 'next-intl';
import { X, BookOpen, ArrowRight } from 'lucide-react';
const STORAGE_KEY = 'knowledge-guide-dismissed';

interface ReadingItem {
  bookId: string;
  chapterId: string;
  badge: 'must' | 'recommended' | 'reference';
}

const READING_ITEMS: ReadingItem[] = [
  { bookId: 'business-glossary', chapterId: 'core-roles', badge: 'must' },
  { bookId: 'business-glossary', chapterId: 'enclosure-definition', badge: 'must' },
  { bookId: 'business-glossary', chapterId: 'metrics-formula', badge: 'must' },
  { bookId: 'methodology', chapterId: 'six-step-analysis', badge: 'recommended' },
  { bookId: 'methodology', chapterId: 'five-why', badge: 'reference' },
];

interface ReadingGuideProps {
  onNavigate: (bookId: string, chapterId: string) => void;
  onDismiss: () => void;
}

export function ReadingGuide({ onNavigate, onDismiss }: ReadingGuideProps) {
  const t = useTranslations('ReadingGuide');

  const BADGE_CONFIG = {
    must: {
      label: t('badgeMust'),
      className: 'bg-danger-surface text-danger-token',
    },
    recommended: {
      label: t('badgeRecommended'),
      className: 'bg-warning-surface text-warning-token',
    },
    reference: {
      label: t('badgeReference'),
      className: 'bg-subtle text-muted-token',
    },
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="card-base shadow-[var(--shadow-raised)] w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle-token">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-accent-surface">
              <BookOpen className="w-5 h-5 text-accent-token" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-primary-token">{t('title')}</h2>
              <p className="text-xs text-muted-token">{t('subtitle')}</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded text-muted-token hover:text-secondary-token hover:bg-subtle transition-colors focus-visible:outline-none"
            aria-label={t('ariaClose')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reading list */}
        <div className="px-5 py-4 space-y-2">
          {READING_ITEMS.map((item, i) => {
            const badge = BADGE_CONFIG[item.badge];
            const localItem = { title: t(`items.${i}.title`), description: t(`items.${i}.description`) };
            return (
              <button
                key={i}
                onClick={() => {
                  onNavigate(item.bookId, item.chapterId);
                  handleDismiss();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-subtle transition-colors text-left group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-token"
              >
                <span
                  className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.className}`}
                >
                  {badge.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary-token truncate">
                    {localItem.title}
                  </p>
                  <p className="text-xs text-muted-token truncate">{localItem.description}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-token shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-subtle-token flex justify-end">
          <button
            onClick={handleDismiss}
            className="text-xs text-muted-token hover:text-secondary-token underline decoration-dotted transition-colors focus-visible:outline-none"
          >
            {t('dismissBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function shouldShowGuide(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}
