'use client';

import { Bookmark, BookmarkCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownReaderProps {
  content: string;
  bookmarks: string[];
  onToggleBookmark: (id: string, title: string) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\u0e00-\u0e7f]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function MarkdownReader({ content, bookmarks, onToggleBookmark }: MarkdownReaderProps) {
  // 计数器与 API _parse_chapters 对齐：h2 → chapter-{N}, h3 → chapter-{parentN}-{childN}
  let h2Index = -1;
  let h3Index = -1;

  const components: Components = {
    h2: ({ children }) => {
      h2Index++;
      h3Index = -1; // reset h3 counter for each h2
      const text = String(children);
      const id = `chapter-${h2Index}`;
      const isBookmarked = bookmarks.includes(id);
      return (
        <h2
          id={id}
          className="group flex items-center gap-2 text-xl font-bold text-[var(--text-primary)] mt-10 mb-4 pb-2 border-b border-[var(--border-default)] scroll-mt-6"
        >
          <span>{children}</span>
          <button
            onClick={() => onToggleBookmark(id, text)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:opacity-100"
            aria-label={isBookmarked ? '取消收藏' : '收藏此章节'}
            title={isBookmarked ? '取消收藏' : '收藏此章节'}
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-4 h-4 text-[var(--color-accent)]" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>
        </h2>
      );
    },

    h3: ({ children }) => {
      h3Index++;
      const id = `chapter-${h2Index}-${h3Index}`;
      return (
        <h3
          id={id}
          className="text-base font-semibold text-[var(--text-primary)] mt-7 mb-3 scroll-mt-6"
        >
          {children}
        </h3>
      );
    },

    table: ({ children }) => (
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    ),

    thead: ({ children }) => <thead className="slide-thead-row">{children}</thead>,

    th: ({ children }) => (
      <th className="slide-th px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">
        {children}
      </th>
    ),

    td: ({ children }) => (
      <td className="slide-td px-4 py-2.5 text-sm text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
        {children}
      </td>
    ),

    tr: ({ children }) => (
      <tr className="slide-row-even hover:bg-[var(--color-accent-surface)] transition-colors">
        {children}
      </tr>
    ),

    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-[var(--color-accent)] bg-[var(--color-accent-surface)] pl-4 pr-4 py-3 my-5 rounded-r-lg text-[var(--text-secondary)] italic">
        {children}
      </blockquote>
    ),

    code: ({ className, children }) => {
      const isInline = !className;
      const raw = String(children ?? '').replace(/\n$/, '');
      if (isInline) {
        return (
          <code className="px-1.5 py-0.5 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded text-[13px] font-mono text-[var(--color-accent)] break-all">
            {raw}
          </code>
        );
      }
      return (
        <pre className="my-5 p-4 bg-[var(--n-900)] rounded-lg overflow-x-auto">
          <code className={`text-xs text-[var(--n-100)] font-mono ${className ?? ''}`}>{raw}</code>
        </pre>
      );
    },

    p: ({ children }) => (
      <p className="my-3 text-[15px] leading-[1.8] text-[var(--text-secondary)]">{children}</p>
    ),

    ul: ({ children }) => (
      <ul className="my-3 pl-6 space-y-1.5 list-disc text-[15px] leading-[1.8] text-[var(--text-secondary)]">
        {children}
      </ul>
    ),

    ol: ({ children }) => (
      <ol className="my-3 pl-6 space-y-1.5 list-decimal text-[15px] leading-[1.8] text-[var(--text-secondary)]">
        {children}
      </ol>
    ),

    strong: ({ children }) => (
      <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>
    ),

    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--color-accent)] underline decoration-dotted hover:decoration-solid transition-all"
      >
        {children}
      </a>
    ),

    hr: () => <hr className="my-8 border-[var(--border-default)]" />,
  };

  return (
    <article className="max-w-3xl mx-auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
