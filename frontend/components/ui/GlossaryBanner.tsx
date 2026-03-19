"use client";

interface GlossaryItem {
  term: string;
  definition: string;
}

export function GlossaryBanner({ terms }: { terms: GlossaryItem[] }) {
  return (
    <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] border border-slate-100 dark:border-slate-700">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {terms.map((t) => (
          <span key={t.term}>
            <strong className="text-[var(--text-primary)] dark:text-slate-300">{t.term}</strong>: {t.definition}
          </span>
        ))}
      </div>
    </div>
  );
}
