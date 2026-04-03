'use client';

import { useLocale } from 'next-intl';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

/* ── I18N ────────────────────────────────────────────────────────── */

const I18N = {
  zh: {
    ariaUnbookmark: '取消收藏',
    ariaBookmark: '收藏此章节',
  },
  'zh-TW': {
    ariaUnbookmark: '取消收藏',
    ariaBookmark: '收藏此章節',
  },
  en: {
    ariaUnbookmark: 'Remove bookmark',
    ariaBookmark: 'Bookmark this section',
  },
  th: {
    ariaUnbookmark: 'ยกเลิกบุ๊กมาร์ก',
    ariaBookmark: 'บุ๊กมาร์กส่วนนี้',
  },
} as const;

type Locale = keyof typeof I18N;

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
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

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
            aria-label={isBookmarked ? t.ariaUnbookmark : t.ariaBookmark}
            title={isBookmarked ? t.ariaUnbookmark : t.ariaBookmark}
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

    // thead/th/td/tr: 全部由 globals.css .kb-table 类统一管理
    // 后代选择器 + !important 覆盖 Tailwind Preflight th color:inherit
    // 不在组件中写 inline style 或 Tailwind utility —— 防止 specificity 问题复发

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
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
