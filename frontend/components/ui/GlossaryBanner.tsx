'use client';

interface GlossaryItem {
  term: string;
  definition: string;
}

export function GlossaryBanner({ terms }: { terms: GlossaryItem[] }) {
  return (
    <div className="mb-4 p-3 bg-subtle rounded-lg text-xs text-secondary-token border border-subtle-token">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {terms.map((t) => (
          <span key={t.term}>
            <strong className="text-primary-token">{t.term}</strong>: {t.definition}
          </span>
        ))}
      </div>
    </div>
  );
}
