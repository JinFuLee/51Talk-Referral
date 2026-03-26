'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { BookOpen, Loader2, AlertCircle, BookMarked } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { BookShelf } from '@/components/knowledge/BookShelf';
import { ChapterTree } from '@/components/knowledge/ChapterTree';
import { MarkdownReader } from '@/components/knowledge/MarkdownReader';
import { SearchBar } from '@/components/knowledge/SearchBar';
import { GlossaryCard } from '@/components/knowledge/GlossaryCard';
import { BookmarkPanel } from '@/components/knowledge/BookmarkPanel';
import { ReadingGuide, shouldShowGuide } from '@/components/knowledge/ReadingGuide';
import type { Book } from '@/components/knowledge/BookShelf';
import type { Chapter } from '@/components/knowledge/ChapterTree';
import type { BookmarkItem } from '@/components/knowledge/BookmarkPanel';
import { swrFetcher } from '@/lib/api';

const BOOKMARKS_KEY = 'knowledge-bookmarks';

// ── Types from API ──────────────────────────────────────────────────────────

interface BookContent {
  book_id: string;
  id?: string;
  title: string;
  content: string;
  chapters: Chapter[];
  last_updated?: string | null;
}

// ── Bookmark helpers ─────────────────────────────────────────────────────────

function loadBookmarks(): BookmarkItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? (JSON.parse(raw) as BookmarkItem[]) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(items: BookmarkItem[]) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const readerRef = useRef<HTMLElement>(null);

  // Active state
  const [activeBook, setActiveBook] = useState<string | null>(searchParams.get('book'));
  const [activeChapter, setActiveChapter] = useState<string | null>(null);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  useEffect(() => setBookmarks(loadBookmarks()), []);

  // Reading guide
  const [showGuide, setShowGuide] = useState(false);
  useEffect(() => {
    if (shouldShowGuide()) setShowGuide(true);
  }, []);

  // Fetch book list
  const {
    data: books,
    isLoading: booksLoading,
    error: booksError,
  } = useSWR<Book[]>('/api/knowledge/books', swrFetcher);

  // Auto-select first book
  useEffect(() => {
    if (!activeBook && books && books.length > 0) {
      setActiveBook(books[0].book_id ?? books[0].id);
    }
  }, [books, activeBook]);

  // Sync URL
  useEffect(() => {
    if (activeBook) {
      router.replace(`/knowledge?book=${activeBook}`, { scroll: false });
    }
  }, [activeBook, router]);

  // Fetch book content
  const {
    data: bookContent,
    isLoading: contentLoading,
    error: contentError,
  } = useSWR<BookContent>(activeBook ? `/api/knowledge/book/${activeBook}` : null, swrFetcher);

  // ── Bookmark handlers ──────────────────────────────────────────────────────

  const toggleBookmark = useCallback(
    (chapterId: string, chapterTitle: string) => {
      setBookmarks((prev) => {
        const exists = prev.find((b) => b.id === chapterId);
        let next: BookmarkItem[];
        if (exists) {
          next = prev.filter((b) => b.id !== chapterId);
        } else {
          next = [
            ...prev,
            {
              id: chapterId,
              title: chapterTitle,
              bookId: activeBook ?? '',
              bookTitle: bookContent?.title ?? '',
              savedAt: new Date().toISOString(),
            },
          ];
        }
        saveBookmarks(next);
        return next;
      });
    },
    [activeBook, bookContent]
  );

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      saveBookmarks(next);
      return next;
    });
  }, []);

  const updateBookmarkNote = useCallback((id: string, note: string) => {
    setBookmarks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, note } : b));
      saveBookmarks(next);
      return next;
    });
  }, []);

  const bookmarkIds = bookmarks.map((b) => b.id);

  // ── Navigate helpers ───────────────────────────────────────────────────────

  const navigateTo = useCallback((bookId: string, chapterId: string) => {
    setActiveBook(bookId);
    setActiveChapter(chapterId);
    setTimeout(() => {
      const el = document.getElementById(chapterId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  }, []);

  const handleSearchResult = useCallback(
    (bookId: string, chapterId: string) => navigateTo(bookId, chapterId),
    [navigateTo]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <PageHeader icon={BookOpen} title="知识库" subtitle="业务知识百科全书" />
          <div className="flex items-center gap-3">
            <SearchBar onResultClick={handleSearchResult} />
            <BookmarkPanel
              bookmarks={bookmarks}
              onNavigate={navigateTo}
              onRemove={removeBookmark}
              onUpdateNote={updateBookmarkNote}
            />
          </div>
        </div>

        {/* Book shelf */}
        {booksLoading ? (
          <div className="flex items-center gap-2 py-3 text-sm text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            加载书架…
          </div>
        ) : booksError ? (
          <div className="flex items-center gap-2 py-3 text-sm text-[var(--color-danger)]">
            <AlertCircle className="w-4 h-4" />
            书架加载失败
          </div>
        ) : (
          <BookShelf
            books={books ?? []}
            activeId={activeBook}
            onSelect={(id) => {
              setActiveBook(id);
              setActiveChapter(null);
            }}
          />
        )}
      </div>

      {/* Main body: chapter tree + reader */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: chapter tree */}
        <aside className="w-[280px] shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-surface)] overflow-y-auto py-4 px-3">
          {contentLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] px-2 py-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              加载章节…
            </div>
          ) : bookContent ? (
            <ChapterTree
              chapters={bookContent.chapters}
              activeId={activeChapter}
              onSelect={setActiveChapter}
            />
          ) : null}
        </aside>

        {/* Right: reader */}
        <main
          ref={readerRef as React.RefObject<HTMLElement>}
          className="flex-1 overflow-y-auto px-8 py-8 bg-[var(--bg-primary)]"
        >
          {contentLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-[var(--text-muted)]">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">正在加载内容…</p>
            </div>
          ) : contentError ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <AlertCircle className="w-8 h-8 text-[var(--color-danger)]" />
              <p className="text-sm text-[var(--color-danger)]">内容加载失败，请重试</p>
            </div>
          ) : !activeBook || !bookContent ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-[var(--text-muted)]">
              <BookMarked className="w-12 h-12 opacity-30" />
              <p className="text-sm">请从书架选择一本书开始阅读</p>
            </div>
          ) : (
            <>
              <MarkdownReader
                content={bookContent.content}
                bookmarks={bookmarkIds}
                onToggleBookmark={toggleBookmark}
              />
              <GlossaryCard containerRef={readerRef} />
            </>
          )}
        </main>
      </div>

      {/* Reading guide modal */}
      {showGuide && <ReadingGuide onNavigate={navigateTo} onDismiss={() => setShowGuide(false)} />}
    </div>
  );
}
