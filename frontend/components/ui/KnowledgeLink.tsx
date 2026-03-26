'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';

interface KnowledgeLinkProps {
  /** 目标章节 ID（如 "chapter-2"） */
  chapter?: string;
  /** 目标书籍 ID（默认 business-bible） */
  book?: string;
  /** tooltip 文字（默认"查看定义"） */
  label?: string;
  /** 图标尺寸 className（默认 w-4 h-4） */
  className?: string;
}

export function KnowledgeLink({
  chapter,
  book = 'business-bible',
  label = '查看定义',
  className = 'w-4 h-4',
}: KnowledgeLinkProps) {
  const href = chapter ? `/knowledge?book=${book}#${chapter}` : `/knowledge?book=${book}`;

  return (
    <Link
      href={href}
      title={label}
      className="inline-flex items-center justify-center ml-1.5 text-[var(--text-muted)] hover:text-[var(--color-accent)] transition-colors"
      aria-label={label}
    >
      <Info className={className} />
    </Link>
  );
}
