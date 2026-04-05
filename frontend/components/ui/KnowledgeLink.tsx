'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
import { useLocale } from 'next-intl';

const I18N = {
  zh: { defaultLabel: '查看定义' },
  'zh-TW': { defaultLabel: '查看定義' },
  en: { defaultLabel: 'View definition' },
  th: { defaultLabel: 'ดูคำจำกัดความ' },
} as const;
type I18NKey = keyof typeof I18N;
function useDefaultLabel() {
  const locale = useLocale();
  return I18N[(locale as I18NKey) in I18N ? (locale as I18NKey) : 'zh'].defaultLabel;
}

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
  label,
  className = 'w-4 h-4',
}: KnowledgeLinkProps) {
  const defaultLabel = useDefaultLabel();
  const resolvedLabel = label ?? defaultLabel;
  const href = chapter ? `/knowledge?book=${book}#${chapter}` : `/knowledge?book=${book}`;

  return (
    <Link
      href={href}
      title={resolvedLabel}
      className="inline-flex items-center justify-center ml-1.5 text-muted-token hover:text-accent-token transition-colors"
      aria-label={resolvedLabel}
    >
      <Info className={className} />
    </Link>
  );
}
