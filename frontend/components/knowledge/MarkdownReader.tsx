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

/** 从标题文本中提取 {#xxx} 锚点 ID 并返回 [cleanText, anchorId | null] */
function extractAnchor(text: string): [string, string | null] {
  const match = text.match(/\s*\{#([\w-]+)\}\s*$/);
  if (match) {
    return [text.replace(match[0], '').trim(), match[1]];
  }
  return [text, null];
}

/** 与后端 _slugify 完全一致的 ID 生成（保留中文/泰文） */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fff\u0e00-\u0e7f]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function MarkdownReader({ content, bookmarks, onToggleBookmark }: MarkdownReaderProps) {
  const components: Components = {
    h2: ({ children }) => {
      const rawText = String(children);
      const [cleanText, anchor] = extractAnchor(rawText);
      const id = anchor ?? slugify(cleanText);
      const isBookmarked = bookmarks.includes(id);
      return (
        <h2
          id={id}
          className="group flex items-center gap-2 text-xl font-bold text-[var(--text-primary)] mt-10 mb-4 pb-2 border-b border-[var(--border-default)] scroll-mt-6"
        >
          <span>{cleanText}</span>
          <button
            onClick={() => onToggleBookmark(id, cleanText)}
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
      const rawText = String(children);
      const [cleanText, anchor] = extractAnchor(rawText);
      const id = anchor ?? slugify(cleanText);
      return (
        <h3
          id={id}
          className="text-base font-semibold text-[var(--text-primary)] mt-7 mb-3 scroll-mt-6"
        >
          {cleanText}
        </h3>
      );
    },

    table: ({ children }) => (
      <div className="overflow-x-auto my-6 rounded-lg border border-[var(--border-default)]">
        <table className="kb-table w-full text-sm border-collapse">{children}</table>
      </div>
    ),

    thead: ({ children }) => <thead className="bg-[var(--n-800)]">{children}</thead>,

    th: ({ children }) => (
      <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-white">
        {children}
      </th>
    ),

    td: ({ children }) => (
      <td className="px-4 py-2.5 text-sm text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
        {children}
      </td>
    ),

    // tr: no custom component — let thead/tbody CSS handle row styling
    // tbody tr hover is handled by .kb-table CSS below

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

    a: ({ href, children }) => {
      const isAnchor = href?.startsWith('#');
      const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (isAnchor && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const targetId = href!.slice(1);
          const el = document.getElementById(targetId);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
      return (
        <a
          href={href}
          onClick={handleClick}
          target={isAnchor ? undefined : '_blank'}
          rel={isAnchor ? undefined : 'noopener noreferrer'}
          className="text-[var(--color-accent)] underline decoration-dotted hover:decoration-solid transition-all cursor-pointer"
        >
          {children}
        </a>
      );
    },

    // h1: 隐藏（标题已在书架 tab 显示，正文不重复渲染）
    h1: () => null,

    // hr: 隐藏分隔线（知识库阅读模式下不需要）
    hr: () => null,
  };

  return (
    <article className="max-w-3xl mx-auto kb-reader">
      <style>{`
        .kb-reader .kb-table thead th {
          color: #fff !important;
          background-color: var(--n-800) !important;
        }
        .kb-reader .kb-table tbody tr:hover {
          background: var(--color-accent-surface);
        }
        .kb-reader .kb-table tbody tr {
          transition: background-color 0.15s ease;
        }
      `}</style>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
