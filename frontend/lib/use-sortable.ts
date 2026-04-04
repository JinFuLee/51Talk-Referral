import { useState, useMemo } from 'react';

export function useSortable<T extends Record<string, unknown>>(
  data: T[],
  defaultKey: keyof T & string,
  defaultDir: 'asc' | 'desc' = 'desc'
): {
  sortedData: T[];
  sortKey: keyof T & string;
  sortDir: 'asc' | 'desc';
  onSort: (key: keyof T & string) => void;
} {
  const [sortKey, setSortKey] = useState<keyof T & string>(defaultKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultDir);

  const onSort = (key: keyof T & string) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      // null / undefined always last regardless of direction
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp: number;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      }

      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  return { sortedData, sortKey, sortDir, onSort };
}
