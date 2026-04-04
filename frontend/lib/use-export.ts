/**
 * useExport — CSV 导出 hook
 * 纯原生 API 实现，不依赖 papaparse/file-saver
 */

export interface ExportColumn {
  key: string;
  label: string;
}

function escapeCSVValue(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  // 含逗号、换行或双引号时，用双引号包裹，内部双引号转义为 ""
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function useExport() {
  const exportCSV = (
    data: Record<string, unknown>[],
    columns: ExportColumn[],
    filename: string
  ) => {
    const header = columns.map((c) => escapeCSVValue(c.label)).join(',');
    const rows = data.map((row) => columns.map((c) => escapeCSVValue(row[c.key])).join(','));

    // BOM + header + rows
    const csv = '\uFEFF' + [header, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

  return { exportCSV };
}
