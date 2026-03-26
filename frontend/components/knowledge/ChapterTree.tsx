'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

export interface Chapter {
  id: string;
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

function ChapterNode({ chapter, activeId, onSelect, depth = 0 }: ChapterNodeProps) {
  const hasChildren = chapter.children && chapter.children.length > 0;
  const [open, setOpen] = useState(true);
  const isActive = chapter.id === activeId;

  const handleClick = () => {
    if (hasChildren) setOpen((v) => !v);
    onSelect(chapter.id);
    const el = document.getElementById(chapter.id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={clsx(
          'w-full flex items-center gap-1.5 text-left rounded px-2 py-1.5 transition-colors',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]',
          depth === 0 ? 'text-sm font-medium' : 'text-xs font-normal pl-5',
          isActive
            ? 'border-l-[3px] border-[var(--color-accent)] bg-[var(--color-accent-surface)] text-[var(--color-accent)] rounded-l-none'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
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
              key={child.id}
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
  if (chapters.length === 0) {
    return (
      <div className="px-2 py-3 text-xs text-[var(--text-muted)]">暂无章节</div>
    );
  }

  return (
    <nav aria-label="章节导航" className="space-y-0.5">
      {chapters.map((chapter) => (
        <ChapterNode
          key={chapter.id}
          chapter={chapter}
          activeId={activeId}
          onSelect={onSelect}
        />
      ))}
    </nav>
  );
}
