'use client';

import { useTranslations } from 'next-intl';
import { clsx } from 'clsx';
export interface Book {
  book_id: string;
  id: string;
  title: string;
  chapter_count: number;
  last_updated: string | null;
  updated_at?: string;
  file?: string;
  description?: string;
}

interface BookShelfProps {
  books: Book[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

export function BookShelf({ books, activeId, onSelect }: BookShelfProps) {
  const t = useTranslations('BookShelf');

  if (books.length === 0) {
    return (
      <div className="flex gap-2 px-1 py-2">
        <span className="text-xs text-muted-token">{t('empty')}</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap px-1 py-2">
      {books.map((book) => {
        const bookId = book.book_id ?? book.id;
        const isActive = bookId === activeId;
        return (
          <button
            key={bookId}
            onClick={() => onSelect(bookId)}
            className={clsx(
              'flex flex-col items-start px-3 py-2 rounded-lg border transition-colors text-left',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-token',
              isActive
                ? 'bg-accent-token border-accent-token text-white'
                : 'bg-surface border-default-token text-secondary-token hover:bg-subtle'
            )}
          >
            <span
              className={clsx(
                'text-sm font-medium',
                isActive ? 'text-white' : 'text-primary-token'
              )}
            >
              {book.title}
            </span>
            <span
              className={clsx(
                'text-[11px] mt-0.5',
                isActive ? 'text-white/70' : 'text-muted-token'
              )}
            >
              {t('chapterCount', { n: book.chapter_count })} · {t('updatedAt')}{' '}
              {formatDate(book.last_updated ?? book.updated_at ?? '')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
