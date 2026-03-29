'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';

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
    (m) =>
      `<mark class="bg-[var(--color-action)] text-[var(--color-action-text)] rounded-sm px-0.5">${m}</mark>`
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
          className="absolute left-3 w-4 h-4 text-[var(--text-muted)] pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          placeholder="搜索知识库… (⌘K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-8 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-colors"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setDebouncedQuery('');
            }}
            className="absolute right-2.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] focus-visible:outline-none"
            aria-label="清空搜索"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-2.5 w-3.5 h-3.5 text-[var(--text-muted)] animate-spin" />
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 card-base shadow-[var(--shadow-raised)] max-h-[380px] overflow-y-auto">
          {!hasResults && !isLoading && (
            <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              未找到相关内容
            </div>
          )}

          {hasResults &&
            Object.entries(groups).map(([bookId, results]) => (
              <div key={bookId}>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)]">
                  {results[0].book_title}
                </div>
                {results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleResultClick(bookId, r.chapter_id)}
                    className="w-full text-left px-4 py-3 hover:bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] last:border-0 transition-colors focus-visible:outline-none focus-visible:bg-[var(--bg-subtle)]"
                  >
                    <div
                      className="text-sm font-medium text-[var(--text-primary)]"
                      dangerouslySetInnerHTML={{
                        __html: highlight(r.chapter_title, debouncedQuery),
                      }}
                    />
                    <div
                      className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2"
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
