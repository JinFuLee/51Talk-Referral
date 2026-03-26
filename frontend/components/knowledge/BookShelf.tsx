'use client';

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
  if (books.length === 0) {
    return (
      <div className="flex gap-2 px-1 py-2">
        <span className="text-xs text-[var(--text-muted)]">暂无书籍</span>
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
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
              isActive
                ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                : 'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            )}
          >
            <span
              className={clsx(
                'text-sm font-medium',
                isActive ? 'text-white' : 'text-[var(--text-primary)]'
              )}
            >
              {book.title}
            </span>
            <span
              className={clsx(
                'text-[11px] mt-0.5',
                isActive ? 'text-white/70' : 'text-[var(--text-muted)]'
              )}
            >
              {book.chapter_count} 章 · 更新于{' '}
              {formatDate(book.last_updated ?? book.updated_at ?? '')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
