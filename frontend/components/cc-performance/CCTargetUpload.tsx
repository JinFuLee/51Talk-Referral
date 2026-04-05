'use client';

import { useTranslations } from 'next-intl';
import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  X,
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  ClipboardPaste,
} from 'lucide-react';
interface CCTargetUploadProps {
  month: string; // YYYYMM
  onUploadSuccess: () => void;
}

interface PreviewRow {
  [key: string]: string;
}

interface UploadResult {
  count: number;
  total_rows: number;
  duplicates: number;
  duplicate_names: string[];
  matched: number;
  orphaned: Array<{ name: string; target: number | null }>;
  unmatched_d2: string[];
  month: string;
}

interface UploadStatus {
  count: number;
  month: string;
}

type InputMode = 'file' | 'paste';

const DEFAULT_PASTE_HEADERS = ['cc_name', 'referral_usd_target'];

/** 模块级纯函数：去除千分位/货币符号/空格，返回纯数字字符串 */
function cleanNumber(val: string): string {
  if (!val || val.trim() === '') return '';
  const cleaned = val
    .trim()
    .replace(/[$¥฿]|USD|THB/gi, '')
    .replace(/[,\s]/g, '')
    .trim();
  if (cleaned === '') return '';
  return !isNaN(Number(cleaned)) ? cleaned : val.trim();
}

function isCleanNumber(val: string): boolean {
  if (!val) return true;
  return !isNaN(Number(val));
}

export function CCTargetUpload({ month, onUploadSuccess }: CCTargetUploadProps) {
  const t = useTranslations('CCTargetUpload');
  const [isOpen, setIsOpen] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [pasteText, setPasteText] = useState('');
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [totalRowCount, setTotalRowCount] = useState(0);
  const [invalidRowIndices, setInvalidRowIndices] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  // 粘贴模式下保存全量行（用于上传，previewRows 仅前 10 条）
  const [allPastedRows, setAllPastedRows] = useState<PreviewRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPreviewRows([]);
    setPreviewHeaders([]);
    setTotalRowCount(0);
    setInvalidRowIndices(new Set());
    setAllPastedRows([]);
    setError(null);
    setUploadResult(null);
    setSelectedFile(null);
    setIsDragOver(false);
    setPasteText('');
    setInputMode('file');
  };

  /** 清洗一整行的数字列，返回新行 */
  const cleanRow = (row: PreviewRow): PreviewRow => ({
    ...row,
    referral_usd_target: cleanNumber(row['referral_usd_target'] ?? ''),
  });

  /**
   * 标记真正有问题的行（清洗后仍无法解析）
   */
  const computeInvalidIndices = (rows: PreviewRow[]): Set<number> => {
    const invalid = new Set<number>();
    rows.forEach((row, i) => {
      const name = row['cc_name'] ?? '';
      if (!name.trim()) return; // 空名行静默跳过，不算无效
      const ref = row['referral_usd_target'] ?? '';
      if (!isCleanNumber(ref)) {
        invalid.add(i);
      }
    });
    return invalid;
  };

  const handleClose = () => {
    reset();
    setIsOpen(false);
  };

  const parseCSV = (text: string): { headers: string[]; rows: PreviewRow[] } => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: PreviewRow = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ?? '';
      });
      return row;
    });
    return { headers, rows };
  };

  /**
   * 解析粘贴文本，自动检测分隔符（Tab 或逗号）和表头
   */
  const parsePastedText = useCallback(
    (text: string): { headers: string[]; rows: PreviewRow[]; invalidIndices: number[] } => {
      const lines = text
        .trim()
        .split('\n')
        .filter((l) => l.trim() !== '');
      if (lines.length === 0) return { headers: [], rows: [], invalidIndices: [] };

      // 检测分隔符：含 Tab 则用 Tab，否则用逗号
      const separator = lines[0].includes('\t') ? '\t' : ',';

      const splitLine = (line: string) =>
        line.split(separator).map((v) => v.trim().replace(/^"|"$/g, ''));

      const firstLineCells = splitLine(lines[0]);

      // 检测是否含表头：首行第一个单元格含 cc_name（不区分大小写）
      const hasHeader = firstLineCells.some((c) => c.toLowerCase().includes('cc_name'));

      let headers: string[];
      let dataLines: string[];

      if (hasHeader) {
        headers = firstLineCells;
        dataLines = lines.slice(1);
      } else {
        headers = DEFAULT_PASTE_HEADERS;
        dataLines = lines;
      }

      const rows = dataLines
        .filter((l) => l.trim() !== '')
        .map((line) => {
          const values = splitLine(line);
          const row: PreviewRow = {};
          headers.forEach((h, i) => {
            row[h] = values[i] ?? '';
          });
          return cleanRow(row); // 贴心清洗：千分位/货币符号/空格
        })
        .filter((row) => (row['cc_name'] ?? '').trim() !== ''); // 静默跳过空名行

      const invalid: number[] = [];
      rows.forEach((row, i) => {
        const ref = row['referral_usd_target'] ?? '';
        if (!isCleanNumber(ref)) {
          invalid.push(i);
        }
      });

      return { headers, rows, invalidIndices: invalid };
    },
    []
  );

  const handlePasteTextChange = useCallback(
    (text: string) => {
      setPasteText(text);
      setError(null);
      setUploadResult(null);
      if (text.trim() === '') {
        setPreviewHeaders([]);
        setPreviewRows([]);
        setTotalRowCount(0);
        setInvalidRowIndices(new Set());
        setAllPastedRows([]);
        return;
      }
      const { headers, rows, invalidIndices } = parsePastedText(text);
      setPreviewHeaders(headers);
      setTotalRowCount(rows.length);
      setAllPastedRows(rows);
      setPreviewRows(rows.slice(0, 10));
      setInvalidRowIndices(new Set(invalidIndices));
    },
    [parsePastedText]
  );

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      setUploadResult(null);
      setSelectedFile(file);

      if (file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const { headers, rows } = parseCSV(text);
          setPreviewHeaders(headers);
          setTotalRowCount(rows.length);
          setPreviewRows(rows.slice(0, 10));
          setInvalidRowIndices(computeInvalidIndices(rows));
        };
        reader.readAsText(file, 'utf-8');
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setPreviewHeaders([]);
        setPreviewRows([]);
      } else {
        setError(t('onlyCsvXlsx'));
        setSelectedFile(null);
      }
    },
    [t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const switchMode = (mode: InputMode) => {
    if (mode === inputMode) return;
    setInputMode(mode);
    // 切换时清空另一种输入方式的数据
    if (mode === 'file') {
      setPasteText('');
    } else {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    setPreviewHeaders([]);
    setPreviewRows([]);
    setTotalRowCount(0);
    setInvalidRowIndices(new Set());
    setAllPastedRows([]);
    setError(null);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!month) return;

    let fileToUpload: File | null = selectedFile;

    if (inputMode === 'paste') {
      if (allPastedRows.length === 0) return;
      // 将全量粘贴数据构造为 CSV File 对象（不受前 10 条预览限制）
      const csvLines = [previewHeaders.join(',')];
      allPastedRows.forEach((row) => {
        csvLines.push(
          previewHeaders
            .map((h) => (h === 'cc_name' ? (row[h] ?? '') : cleanNumber(row[h] ?? '')))
            .join(',')
        );
      });
      const csvString = csvLines.join('\n');
      fileToUpload = new File([csvString], 'pasted.csv', { type: 'text/csv' });
    }

    if (!fileToUpload) return;

    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', fileToUpload);
      // Excel (.xlsx) → SM 导入接口（自动解析并按比例计算），CSV → 普通上传
      const isExcel = fileToUpload.name.endsWith('.xlsx') || fileToUpload.name.endsWith('.xls');
      const endpoint = isExcel
        ? `/api/cc-performance/targets/import-sm?month=${month}`
        : `/api/cc-performance/targets/upload?month=${month}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(text || t('uploadFailedStatus', { status: res.status }));
      }
      const data = await res.json();
      // import-sm 返回 cc_count/preview，upload 返回 count/matched/orphaned
      const ccCount = data.count ?? data.cc_count ?? 0;
      setUploadResult({
        count: ccCount,
        total_rows: data.total_rows ?? ccCount,
        duplicates: data.duplicates ?? 0,
        duplicate_names: data.duplicate_names ?? [],
        matched: data.matched ?? ccCount,
        orphaned: data.orphaned ?? [],
        unmatched_d2: data.unmatched_d2 ?? [],
        month: data.month ?? month,
      });
      onUploadSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!month) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/cc-performance/targets/${month}`, { method: 'DELETE' });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(text || t('deleteFailedStatus', { status: res.status }));
      }
      setUploadStatus(null);
      onUploadSuccess();
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const isXlsx = selectedFile?.name.endsWith('.xlsx') || selectedFile?.name.endsWith('.xls');

  // 确认上传按钮可用条件（有无效行时仍允许上传，后端会忽略无效 cc_name）
  const canUpload =
    !uploading && (inputMode === 'file' ? !!selectedFile : allPastedRows.length > 0);

  // 是否展示预览表格
  const showPreview =
    previewRows.length > 0 && (inputMode === 'paste' || (inputMode === 'file' && !isXlsx));

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-subtle-token text-secondary-token rounded-lg hover:bg-action-surface hover:text-action-text hover:border-action transition-colors shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-action/20"
      >
        <Upload className="w-4 h-4" />
        {t('triggerBtn')}
      </button>

      {/* 弹窗遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="bg-surface rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto mx-4">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-default-token">
              <h2 className="text-base font-semibold text-primary-token">{t('modalTitle')}</h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-md text-muted-token hover:bg-subtle transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 步骤 1：下载模板 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-primary-token">{t('step1')}</p>
                <button
                  onClick={() =>
                    window.open(`/api/cc-performance/targets/template?month=${month}`, '_blank')
                  }
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success-token text-white text-sm font-medium hover:bg-success-token transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t('downloadTemplate')}
                </button>
                <p className="text-xs text-muted-token">{t('templateHint')}</p>
              </div>

              {/* 步骤 2：输入数据（文件上传 / 粘贴数据） */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-primary-token">{t('step2')}</p>

                {/* Tab 切换 */}
                <div className="flex border-b border-default-token">
                  <button
                    onClick={() => switchMode('file')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors -mb-px ${
                      inputMode === 'file'
                        ? 'text-primary-token border-b-2 border-accent-token'
                        : 'text-muted-token hover:text-secondary-token'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {t('tabFile')}
                  </button>
                  <button
                    onClick={() => switchMode('paste')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors -mb-px ${
                      inputMode === 'paste'
                        ? 'text-primary-token border-b-2 border-accent-token'
                        : 'text-muted-token hover:text-secondary-token'
                    }`}
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    {t('tabPaste')}
                  </button>
                </div>

                {/* 上传文件区域 */}
                {inputMode === 'file' && (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragOver
                        ? 'border-action-token bg-action-surface'
                        : 'border-default-token hover:border-action-token hover:bg-action-surface'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={handleInputChange}
                    />
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-token" />
                    {selectedFile ? (
                      <p className="text-sm font-medium text-action-text-token">
                        {t('selected', { name: selectedFile.name })}
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-secondary-token">{t('dropHint')}</p>
                        <p className="text-xs text-muted-token mt-1">{t('dropFormats')}</p>
                      </>
                    )}
                  </div>
                )}

                {/* 粘贴数据区域 */}
                {inputMode === 'paste' && (
                  <div className="space-y-2">
                    <textarea
                      className="w-full min-h-[9rem] rounded-lg border border-default-token bg-subtle px-3 py-2 font-mono text-sm text-primary-token placeholder:text-muted-token focus:outline-none focus:ring-2 focus:ring-accent-token/30 focus:border-accent-token resize-y transition-colors"
                      placeholder={t('pastePlaceholder')}
                      value={pasteText}
                      onChange={(e) => handlePasteTextChange(e.target.value)}
                      spellCheck={false}
                    />
                    <p className="text-xs text-muted-token">
                      {t('pasteHint')} <code className="font-mono">cc_name</code> {t('pasteHint2')}
                    </p>
                  </div>
                )}
              </div>

              {/* xlsx 提示 */}
              {inputMode === 'file' && selectedFile && isXlsx && (
                <div className="rounded-lg bg-subtle border border-default-token px-4 py-3">
                  <p className="text-sm text-secondary-token">{t('xlsxServerParse')}</p>
                </div>
              )}

              {/* 步骤 3：预览 */}
              {showPreview && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-primary-token">
                    {t('step3', { n: Math.min(totalRowCount, 10) })}
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-default-token">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="slide-thead-row">
                          {previewHeaders.map((h) => (
                            <th key={h} className="slide-th slide-th-left whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, i) => (
                          <tr
                            key={i}
                            className={
                              invalidRowIndices.has(i)
                                ? 'bg-danger-surface'
                                : i % 2 === 0
                                  ? 'slide-row-even'
                                  : 'slide-row-odd'
                            }
                          >
                            {previewHeaders.map((h) => (
                              <td
                                key={h}
                                className={`slide-td whitespace-nowrap${
                                  h === 'cc_name' && invalidRowIndices.has(i)
                                    ? ' text-danger-token'
                                    : ''
                                }`}
                              >
                                {row[h]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-token">
                    {t('totalRows', { total: totalRowCount, preview: Math.min(totalRowCount, 10) })}
                  </p>
                  {invalidRowIndices.size > 0 && (
                    <p className="text-xs text-warning-token">
                      {t('invalidRows', { n: invalidRowIndices.size })}
                    </p>
                  )}
                </div>
              )}

              {/* 错误提示 */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-danger-surface border border-danger-token px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-danger-token mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-danger-token">{error}</p>
                </div>
              )}

              {/* 上传成功：对账报告 */}
              {uploadResult && (
                <div className="space-y-2">
                  {/* 匹配成功块 */}
                  <div className="rounded-lg bg-success-surface border border-success-token px-4 py-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-success-token mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-success-token">
                        {t('matchedSuccess', { n: uploadResult.matched })}
                      </p>
                    </div>
                    {uploadResult.duplicates > 0 && (
                      <p className="text-xs text-warning-token ml-6 mt-1">
                        {t('duplicates', { n: uploadResult.duplicates,
                          names: uploadResult.duplicate_names.join('、') })
}
                      </p>
                    )}
                  </div>

                  {/* 孤儿名单块（上传名字在数据中找不到） */}
                  {uploadResult.orphaned.length > 0 && (
                    <div className="rounded-lg bg-warning-surface border border-warning-token px-4 py-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-warning-token mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm text-warning-token">
                            {t('orphanedTitle', { n: uploadResult.orphaned.length })}
                          </p>
                          <p className="font-mono text-xs text-warning-token leading-relaxed">
                            {uploadResult.orphaned
                              .map((o) => `${o.name}（$${(o.target ?? 0).toLocaleString()}）`)
                              .join('、')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 无目标 CC 块（D2 中有但未上传目标） */}
                  {uploadResult.unmatched_d2.length > 0 && (
                    <div className="rounded-lg bg-subtle border border-default-token px-4 py-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-muted-token mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm text-muted-token">
                            {t('unmatchedTitle', { n: uploadResult.unmatched_d2.length })}
                          </p>
                          <p className="font-mono text-xs text-muted-token leading-relaxed">
                            {uploadResult.unmatched_d2.slice(0, 5).join('、')}
                            {uploadResult.unmatched_d2.length > 5 && (
                              <>{t('unmatchedMore', { n: uploadResult.unmatched_d2.length - 5 })}</>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 操作按钮行 */}
              <div className="flex items-center justify-between pt-2 border-t border-default-token">
                <button onClick={handleClose} className="btn-secondary">
                  取消
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!canUpload}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-token text-white font-medium text-sm hover:bg-accent-hover-token transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      上传中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      确认上传
                    </>
                  )}
                </button>
              </div>

              {/* 底部状态栏 */}
              <div className="rounded-lg bg-subtle border border-default-token px-4 py-3 space-y-2">
                <p className="text-xs text-muted-token">
                  {uploadStatus
                    ? `当前状态：已上传 ${uploadStatus.count} 条个人目标（${uploadStatus.month}）`
                    : `当前月份：${month || '—'}，个人目标状态未知（上传后刷新）`}
                </p>
                <button
                  onClick={handleDelete}
                  disabled={deleting || !month}
                  className="flex items-center gap-1.5 text-xs text-danger-token hover:text-danger-token disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  清除当前月目标（恢复按比例分配）
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
