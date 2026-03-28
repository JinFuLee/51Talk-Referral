'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface PreviewModalProps {
  open: boolean;
  template: string;
  role: string;
  platform: 'lark' | 'dingtalk';
  onClose: () => void;
}

interface PreviewData {
  ok: boolean;
  role: string;
  template: string;
  images_count: number;
  overview_image?: string | null;
  sample_images: string[];
  stdout_tail?: string;
}

export function PreviewModal({ open, template, role, platform, onClose }: PreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function loadPreview() {
    if (loaded) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications/push/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, role, platform }),
      });
      if (!res.ok) throw new Error(`预览失败：${res.status}`);
      const data = await res.json();
      setPreview(data);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载预览失败');
    } finally {
      setLoading(false);
    }
  }

  // Auto-load when opened
  if (open && !loaded && !loading && !error) {
    loadPreview();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[var(--bg-surface)] rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)] shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">推送预览</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {platform === 'lark' ? 'Lark' : '钉钉'} · {role} · {template}
            </p>
          </div>
          <button
            onClick={() => {
              setLoaded(false);
              setPreview(null);
              onClose();
            }}
            className="p-1 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-muted)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-12 gap-2 text-[var(--text-muted)]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">生成预览中…</span>
            </div>
          )}

          {error && <div className="bg-red-50 rounded-xl p-4 text-sm text-red-600">{error}</div>}

          {preview && !loading && (
            <div className="space-y-4">
              {/* 状态摘要 */}
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    preview.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {preview.ok ? '生成成功' : '生成失败'}
                </span>
                <span className="text-[var(--text-muted)] text-xs">
                  {preview.role} 角色 · 共 {preview.images_count} 张图片
                </span>
              </div>

              {/* 总览图片 */}
              {preview.overview_image && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">总览图片</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/notifications/outputs/image/${preview.overview_image}`}
                    alt="总览图片预览"
                    className="w-full rounded-xl border border-[var(--border-default)] shadow-sm"
                  />
                </div>
              )}

              {/* 样本图片 */}
              {preview.sample_images.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">
                    跟进图片样本（{preview.sample_images.length} 张）
                  </p>
                  <div className="space-y-2">
                    {preview.sample_images.map((img) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={img}
                        src={`/api/notifications/outputs/image/${img}`}
                        alt={img}
                        className="w-full rounded-xl border border-[var(--border-default)] shadow-sm"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 无图片时提示 */}
              {preview.images_count === 0 && (
                <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                  暂无图片产出，请确认数据文件已上传
                </div>
              )}

              {/* 脚本输出 */}
              {preview.stdout_tail && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">脚本输出</p>
                  <pre className="text-xs bg-[var(--bg-primary)] rounded-xl p-4 whitespace-pre-wrap font-sans border border-[var(--border-subtle)] overflow-auto max-h-40">
                    {preview.stdout_tail}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
