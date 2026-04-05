'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bookmark, X, Trash2, StickyNote } from 'lucide-react';
import { clsx } from 'clsx';
export interface BookmarkItem {
  id: string;
  title: string;
  bookId: string;
  bookTitle: string;
  note?: string;
  savedAt: string;
}

interface BookmarkPanelProps {
  bookmarks: BookmarkItem[];
  onNavigate: (bookId: string, chapterId: string) => void;
  onRemove: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
}

function groupByBook(items: BookmarkItem[]): Record<string, BookmarkItem[]> {
  const groups: Record<string, BookmarkItem[]> = {};
  for (const item of items) {
    if (!groups[item.bookTitle]) groups[item.bookTitle] = [];
    groups[item.bookTitle].push(item);
  }
  return groups;
}

interface BookmarkRowProps {
  item: BookmarkItem;
  onNavigate: (bookId: string, chapterId: string) => void;
  onRemove: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  t: (key: string, params?: any) => string;
}

function BookmarkRow({ item, onNavigate, onRemove, onUpdateNote, t }: BookmarkRowProps) {
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(item.note ?? '');

  const saveNote = () => {
    onUpdateNote(item.id, note);
    setEditingNote(false);
  };

  return (
    <div className="py-2.5 border-b border-subtle-token last:border-0">
      <div className="flex items-start gap-2">
        <button
          onClick={() => onNavigate(item.bookId, item.id)}
          className="flex-1 text-left text-sm text-primary-token hover:text-accent-token transition-colors focus-visible:outline-none truncate"
        >
          {item.title}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditingNote((v) => !v)}
            className="p-1 rounded text-muted-token hover:text-accent-token hover:bg-subtle transition-colors focus-visible:outline-none"
            title={t('ariaAddNote')}
          >
            <StickyNote className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1 rounded text-muted-token hover:text-danger-token hover:bg-danger-surface transition-colors focus-visible:outline-none"
            title={t('ariaRemove')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {item.note && !editingNote && (
        <p className="mt-1 text-xs text-muted-token italic line-clamp-2">{item.note}</p>
      )}
      {editingNote && (
        <div className="mt-1.5 flex gap-1.5">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('notePlaceholder')}
            rows={2}
            className="flex-1 text-xs px-2 py-1 bg-surface border border-default-token rounded text-primary-token resize-none focus:outline-none focus:border-accent-token"
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={saveNote}
              className="px-2 py-1 text-[10px] bg-accent-token text-white rounded hover:bg-accent-hover-token transition-colors focus-visible:outline-none"
            >
              {t('save')}
            </button>
            <button
              onClick={() => {
                setNote(item.note ?? '');
                setEditingNote(false);
              }}
              className="px-2 py-1 text-[10px] bg-subtle text-muted-token rounded hover:bg-n-200 transition-colors focus-visible:outline-none"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BookmarkPanel({
  bookmarks,
  onNavigate,
  onRemove,
  onUpdateNote,
}: BookmarkPanelProps) {
  const t = useTranslations('BookmarkPanel');

  const [open, setOpen] = useState(false);
  const groups = groupByBook(bookmarks);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-default-token bg-surface text-secondary-token hover:bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-token"
        aria-label={t('ariaOpen')}
      >
        <Bookmark className="w-4 h-4" />
        <span className="hidden sm:inline">{t('btnLabel')}</span>
        {bookmarks.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent-token text-white text-[9px] flex items-center justify-center font-bold">
            {bookmarks.length > 9 ? '9+' : bookmarks.length}
          </span>
        )}
      </button>

      {/* Slide-out panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <aside className="fixed top-0 right-0 bottom-0 z-50 w-80 bg-surface border-l border-default-token shadow-[var(--shadow-raised)] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-subtle-token">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-accent-token" />
                <h2 className="text-sm font-semibold text-primary-token">{t('panelTitle')}</h2>
                <span className="text-xs text-muted-token">({bookmarks.length})</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded text-muted-token hover:text-secondary-token hover:bg-subtle transition-colors focus-visible:outline-none"
                aria-label={t('ariaClose')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {bookmarks.length === 0 ? (
                <div className="py-12 text-center">
                  <Bookmark className="w-8 h-8 mx-auto text-muted-token mb-3" />
                  <p className="text-sm text-muted-token">{t('emptyTitle')}</p>
                  <p className="text-xs text-muted-token mt-1">{t('emptyHint')}</p>
                </div>
              ) : (
                Object.entries(groups).map(([bookTitle, items]) => (
                  <div key={bookTitle} className="mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-token mb-1">
                      {bookTitle}
                    </p>
                    {items.map((item) => (
                      <BookmarkRow
                        key={item.id}
                        item={item}
                        onNavigate={(bId, cId) => {
                          onNavigate(bId, cId);
                          setOpen(false);
                        }}
                        onRemove={onRemove}
                        onUpdateNote={onUpdateNote}
                        t={t}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
