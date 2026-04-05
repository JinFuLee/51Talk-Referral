'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { Search, X, Loader2 } from 'lucide-react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';

/* ── I18N ────────────────────────────────────────────────────────── */

const I18N = {
  zh: {
    placeholder: '搜索知识库… (⌘K)',
    ariaClose: '清空搜索',
    noResults: '未找到相关内容',
  },
  'zh-TW': {
    placeholder: '搜尋知識庫… (⌘K)',
    ariaClose: '清空搜尋',
    noResults: '未找到相關內容',
  },
  en: {
    placeholder: 'Search knowledge base… (⌘K)',
    ariaClose: 'Clear search',
    noResults: 'No results found',
  },
  th: {
    placeholder: 'ค้นหาในคลังความรู้… (⌘K)',
    ariaClose: 'ล้างการค้นหา',
    noResults: 'ไม่พบผลลัพธ์',
  },
} as const;

type Locale = keyof typeof I18N;

export interface SearchResult {
  book_id: string;
  book_title: string;
  chapter_id: string;
  chapter_title: string;
  snippet: string;
  excerpt?: string;
  score: number;
}

interface SearchBarProps {
  onResultClick: (bookId: string, chapterId: string) => void;
}

function highlight(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(
    new RegExp(escaped, 'gi'),
    (m) => `<mark class="bg-action-token text-action-text-token rounded-sm px-0.5">${m}</mark>`
  );
}

function groupByBook(results: SearchResult[]): Record<string, SearchResult[]> {
  const groups: Record<string, SearchResult[]> = {};
  for (const r of results) {
    if (!groups[r.book_id]) groups[r.book_id] = [];
    groups[r.book_id].push(r);
  }
  return groups;
}

export function SearchBar({ onResultClick }: SearchBarProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useFilteredSWR<SearchResult[]>(
    debouncedQuery.length >= 2
      ? `/api/knowledge/search?q=${encodeURIComponent(debouncedQuery)}`
      : null
  );

  const handleResultClick = useCallback(
    (bookId: string, chapterId: string) => {
      onResultClick(bookId, chapterId);
      setOpen(false);
      setQuery('');
      setDebouncedQuery('');
    },
    [onResultClick]
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const groups = data ? groupByBook(data) : {};
  const hasResults = data && data.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search
          className="absolute left-3 w-4 h-4 text-muted-token pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          placeholder={t.placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-8 py-2 text-sm bg-surface border border-default-token rounded-lg text-primary-token placeholder:text-muted-token focus:outline-none focus:border-accent-token focus:ring-1 focus:ring-accent-token transition-colors"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setDebouncedQuery('');
            }}
            className="absolute right-2.5 text-muted-token hover:text-secondary-token focus-visible:outline-none"
            aria-label={t.ariaClose}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-2.5 w-3.5 h-3.5 text-muted-token animate-spin" />
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 card-base shadow-[var(--shadow-raised)] max-h-[380px] overflow-y-auto">
          {!hasResults && !isLoading && (
            <div className="px-4 py-6 text-center text-sm text-muted-token">{t.noResults}</div>
          )}

          {hasResults &&
            Object.entries(groups).map(([bookId, results]) => (
              <div key={bookId}>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-token bg-subtle border-b border-subtle-token">
                  {results[0].book_title}
                </div>
                {results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleResultClick(bookId, r.chapter_id)}
                    className="w-full text-left px-4 py-3 hover:bg-subtle border-b border-subtle-token last:border-0 transition-colors focus-visible:outline-none focus-visible:bg-subtle"
                  >
                    <div
                      className="text-sm font-medium text-primary-token"
                      dangerouslySetInnerHTML={{
                        __html: highlight(r.chapter_title, debouncedQuery),
                      }}
                    />
                    <div
                      className="text-xs text-muted-token mt-0.5 line-clamp-2"
                      dangerouslySetInnerHTML={{
                        __html: highlight(r.snippet ?? r.excerpt ?? '', debouncedQuery),
                      }}
                    />
                  </button>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
