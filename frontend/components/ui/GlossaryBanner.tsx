"use client";

interface GlossaryItem {
  term: string;
  definition: string;
}

export function GlossaryBanner({ terms }: { terms: GlossaryItem[] }) {
  return (
    <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {terms.map((t, i) => (
          <span key={i}>
            <strong className="text-slate-600 dark:text-slate-300">{t.term}</strong>: {t.definition}
          </span>
        ))}
      </div>
    </div>
  );
}
