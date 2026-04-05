'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

/* ── I18N ────────────────────────────────────────────────────────── */

const I18N = {
  zh: { empty: '暂无章节', ariaNav: '章节导航' },
  'zh-TW': { empty: '暫無章節', ariaNav: '章節導覽' },
  en: { empty: 'No chapters', ariaNav: 'Chapter navigation' },
  th: { empty: 'ไม่มีบท', ariaNav: 'การนำทางบท' },
} as const;

type Locale = keyof typeof I18N;

export interface Chapter {
  chapter_id: string;
  id?: string;
  title: string;
  level: 2 | 3;
  children?: Chapter[];
}

interface ChapterTreeProps {
  chapters: Chapter[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

interface ChapterNodeProps {
  chapter: Chapter;
  activeId: string | null;
  onSelect: (id: string) => void;
  depth?: number;
}

function chId(ch: Chapter): string {
  return ch.chapter_id ?? ch.id ?? '';
}

function ChapterNode({ chapter, activeId, onSelect, depth = 0 }: ChapterNodeProps) {
  const hasChildren = chapter.children && chapter.children.length > 0;
  const [open, setOpen] = useState(true);
  const cid = chId(chapter);
  const isActive = cid === activeId;

  const handleClick = () => {
    if (hasChildren) setOpen((v) => !v);
    onSelect(cid);
    const el = document.getElementById(cid);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={clsx(
          'w-full flex items-center gap-1.5 text-left rounded px-2 py-1.5 transition-colors',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-token',
          depth === 0 ? 'text-sm font-medium' : 'text-xs font-normal pl-5',
          isActive
            ? 'border-l-[3px] border-accent-token bg-accent-surface text-accent-token rounded-l-none'
            : 'text-secondary-token hover:bg-subtle hover:text-primary-token'
        )}
      >
        {hasChildren && depth === 0 && (
          <span className="shrink-0">
            {open ? (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </span>
        )}
        <span className="truncate">{chapter.title}</span>
      </button>

      {hasChildren && open && (
        <div className="mt-0.5">
          {chapter.children!.map((child) => (
            <ChapterNode
              key={chId(child)}
              chapter={child}
              activeId={activeId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ChapterTree({ chapters, activeId, onSelect }: ChapterTreeProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  if (chapters.length === 0) {
    return <div className="px-2 py-3 text-xs text-muted-token">{t.empty}</div>;
  }

  return (
    <nav aria-label={t.ariaNav} className="space-y-0.5">
      {chapters.map((chapter) => (
        <ChapterNode
          key={chId(chapter)}
          chapter={chapter}
          activeId={activeId}
          onSelect={onSelect}
        />
      ))}
    </nav>
  );
}
