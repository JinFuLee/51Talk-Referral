'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface GlossaryTerm {
  term: string;
  aliases?: string[];
  definition: string;
  category?: string;
}

interface TooltipState {
  term: GlossaryTerm;
  x: number;
  y: number;
}

interface GlossaryCardProps {
  containerRef: React.RefObject<HTMLElement | null>;
}

export function GlossaryCard({ containerRef }: GlossaryCardProps) {
  const { data: terms } = useSWR<GlossaryTerm[]>('/api/knowledge/glossary', fetcher);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!terms || !containerRef.current) return;

    const container = containerRef.current;

    // Build a map of all recognizable terms (including aliases)
    const termMap = new Map<string, GlossaryTerm>();
    for (const t of terms) {
      termMap.set(t.term, t);
      if (t.aliases) {
        for (const alias of t.aliases) termMap.set(alias, t);
      }
    }

    // Walk all text nodes, wrap matching terms
    const wrapTerms = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? '';
        const keys = Array.from(termMap.keys()).sort((a, b) => b.length - a.length);

        let html = text;
        for (const key of keys) {
          const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          html = html.replace(
            new RegExp(`(?<![\\w\\u4e00-\\u9fff\\u0e00-\\u0e7f])(${escaped})(?![\\w\\u4e00-\\u9fff\\u0e00-\\u0e7f])`, 'g'),
            `<span class="glossary-term" data-term="${key}" style="border-bottom:1px dashed var(--color-accent);cursor:help;">$1</span>`
          );
        }

        if (html !== text) {
          const span = document.createElement('span');
          span.innerHTML = html;
          node.parentNode?.replaceChild(span, node);
        }
        return;
      }

      // Skip code, pre, and already-wrapped elements
      if (node.nodeName === 'CODE' || node.nodeName === 'PRE' || (node as Element).classList?.contains('glossary-term')) {
        return;
      }

      Array.from(node.childNodes).forEach(wrapTerms);
    };

    // Run once after content renders
    const timer = setTimeout(() => {
      try {
        wrapTerms(container);
      } catch {
        // DOM mutation during traversal is safe to ignore
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [terms, containerRef]);

  // Attach event delegation
  useEffect(() => {
    if (!terms || !containerRef.current) return;
    const container = containerRef.current;

    const termMap = new Map<string, GlossaryTerm>();
    for (const t of terms) {
      termMap.set(t.term, t);
      if (t.aliases) {
        for (const alias of t.aliases) termMap.set(alias, t);
      }
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('glossary-term')) return;
      const key = target.dataset.term;
      if (!key) return;
      const term = termMap.get(key);
      if (!term) return;
      const rect = target.getBoundingClientRect();
      setTooltip({ term, x: rect.left, y: rect.bottom + window.scrollY + 6 });
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement;
      if (tooltipRef.current?.contains(related)) return;
      setTooltip(null);
    };

    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);
    return () => {
      container.removeEventListener('mouseover', handleMouseOver);
      container.removeEventListener('mouseout', handleMouseOut);
    };
  }, [terms, containerRef]);

  if (!tooltip) return null;

  return (
    <div
      ref={tooltipRef}
      onMouseLeave={() => setTooltip(null)}
      className="fixed z-50 card-base shadow-[var(--shadow-raised)] p-3 max-w-[280px]"
      style={{ left: tooltip.x, top: tooltip.y }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{tooltip.term.term}</span>
        {tooltip.term.category && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent-surface)] text-[var(--color-accent)] font-medium shrink-0">
            {tooltip.term.category}
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{tooltip.term.definition}</p>
    </div>
  );
}
