'use client';

interface GlossaryItem {
  term: string;
  definition: string;
}

export function GlossaryBanner({ terms }: { terms: GlossaryItem[] }) {
  return (
    <div className="mb-4 p-3 bg-[var(--bg-subtle)] rounded-lg text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)]">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {terms.map((t) => (
          <span key={t.term}>
            <strong className="text-[var(--text-primary)]">{t.term}</strong>: {t.definition}
          </span>
        ))}
      </div>
    </div>
  );
}
