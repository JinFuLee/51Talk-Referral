'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Download, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface CCTargetUploadProps {
  month: string; // YYYYMM
  onUploadSuccess: () => void;
}

interface PreviewRow {
  [key: string]: string;
}

interface UploadResult {
  count: number;
  month: string;
}

interface UploadStatus {
  count: number;
  month: string;
}

export function CCTargetUpload({ month, onUploadSuccess }: CCTargetUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPreviewRows([]);
    setPreviewHeaders([]);
    setError(null);
    setUploadResult(null);
    setSelectedFile(null);
    setIsDragOver(false);
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

  const handleFile = useCallback((file: File) => {
    setError(null);
    setUploadResult(null);
    setSelectedFile(file);

    if (file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const { headers, rows } = parseCSV(text);
        setPreviewHeaders(headers);
        setPreviewRows(rows.slice(0, 10));
      };
      reader.readAsText(file, 'utf-8');
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      setPreviewHeaders([]);
      setPreviewRows([]);
    } else {
      setError('仅支持 .csv 和 .xlsx 格式');
      setSelectedFile(null);
    }
  }, []);

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

  const handleUpload = async () => {
    if (!selectedFile || !month) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      const res = await fetch(`/api/cc-performance/targets/upload?month=${month}`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(text || `上传失败 (${res.status})`);
      }
      const data = await res.json();
      setUploadResult({ count: data.count ?? 0, month: data.month ?? month });
      onUploadSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败，请重试');
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
        throw new Error(text || `删除失败 (${res.status})`);
      }
      setUploadStatus(null);
      onUploadSuccess();
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const isXlsx = selectedFile?.name.endsWith('.xlsx') || selectedFile?.name.endsWith('.xls');

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-lg hover:bg-action-surface hover:text-action-text hover:border-action transition-colors shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-action/20"
      >
        <Upload className="w-4 h-4" />
        上传个人目标
      </button>

      {/* 弹窗遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="bg-[var(--bg-surface)] rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto mx-4">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                上传 CC 个人目标
              </h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 步骤 1：下载模板 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">步骤 1：下载模板</p>
                <button
                  onClick={() =>
                    window.open(`/api/cc-performance/targets/template?month=${month}`, '_blank')
                  }
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  下载 CSV 模板
                </button>
                <p className="text-xs text-[var(--text-muted)]">
                  模板已预填 CC 名字，填入各项目标后保存并上传
                </p>
              </div>

              {/* 步骤 2：上传文件 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  步骤 2：上传已填写的文件
                </p>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragOver
                      ? 'border-[var(--color-action)] bg-[var(--color-action-surface)]'
                      : 'border-[var(--border-default)] hover:border-[var(--color-action)] hover:bg-[var(--color-action-surface)]'
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
                  <Upload className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]" />
                  {selectedFile ? (
                    <p className="text-sm font-medium text-[var(--color-action-text)]">
                      已选择：{selectedFile.name}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-[var(--text-secondary)]">
                        拖拽文件到此处或点击选择
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">支持 .csv 和 .xlsx</p>
                    </>
                  )}
                </div>
              </div>

              {/* 步骤 3：预览（CSV 才显示） */}
              {selectedFile && !isXlsx && previewRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    步骤 3：预览（前 {previewRows.length} 条）
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
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
                          <tr key={i} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                            {previewHeaders.map((h) => (
                              <td key={h} className="slide-td whitespace-nowrap">
                                {row[h]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    共 {previewRows.length} 条记录（预览前 10 条）
                  </p>
                </div>
              )}

              {/* xlsx 提示 */}
              {selectedFile && isXlsx && (
                <div className="rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] px-4 py-3">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Excel 文件将由服务端解析，点击「确认上传」后预览结果
                  </p>
                </div>
              )}

              {/* 错误提示 */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* 上传成功 */}
              {uploadResult && (
                <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                  <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-emerald-700">
                    上传成功！共写入 <strong>{uploadResult.count}</strong> 条个人目标（
                    {uploadResult.month}）
                  </p>
                </div>
              )}

              {/* 操作按钮行 */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-default)]">
                <button onClick={handleClose} className="btn-secondary">
                  取消
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white font-medium text-sm hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] px-4 py-3 space-y-2">
                <p className="text-xs text-[var(--text-muted)]">
                  {uploadStatus
                    ? `当前状态：已上传 ${uploadStatus.count} 条个人目标（${uploadStatus.month}）`
                    : `当前月份：${month || '—'}，个人目标状态未知（上传后刷新）`}
                </p>
                <button
                  onClick={handleDelete}
                  disabled={deleting || !month}
                  className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
