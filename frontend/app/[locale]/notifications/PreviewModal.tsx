'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('PreviewModal');
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
      if (!res.ok) throw new Error(t('previewFailed', { status: res.status }));
      const data = await res.json();
      setPreview(data);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadFailed'));
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
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-default-token shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-primary-token">{t('title')}</h2>
            <p className="text-xs text-muted-token mt-0.5">
              {platform === 'lark' ? 'Lark' : t('dingtalk')} · {role} · {template}
            </p>
          </div>
          <button
            onClick={() => {
              setLoaded(false);
              setPreview(null);
              onClose();
            }}
            className="p-1 rounded-md hover:bg-subtle text-muted-token"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-token">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{t('generating')}</span>
            </div>
          )}

          {error && (
            <div className="bg-danger-surface rounded-xl p-4 text-sm text-danger-token">
              {error}
            </div>
          )}

          {preview && !loading && (
            <div className="space-y-4">
              {/* 状态摘要 */}
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    preview.ok
                      ? 'bg-success-surface text-success-token'
                      : 'bg-danger-surface text-danger-token'
                  }`}
                >
                  {preview.ok ? t('genSuccess') : t('genFailed')}
                </span>
                <span className="text-muted-token text-xs">
                  {t('roleImages', { role: preview.role, count: preview.images_count })}
                </span>
              </div>

              {/* 总览图片 */}
              {preview.overview_image && (
                <div>
                  <p className="text-xs text-muted-token mb-2 font-medium">{t('overviewImg')}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/notifications/outputs/image/${preview.overview_image}`}
                    alt={t('overviewImg')}
                    className="w-full rounded-xl border border-default-token shadow-sm"
                  />
                </div>
              )}

              {/* 样本图片 */}
              {preview.sample_images.length > 0 && (
                <div>
                  <p className="text-xs text-muted-token mb-2 font-medium">
                    {t('sampleImgs', { n: preview.sample_images.length })}
                  </p>
                  <div className="space-y-2">
                    {preview.sample_images.map((img) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={img}
                        src={`/api/notifications/outputs/image/${img}`}
                        alt={img}
                        className="w-full rounded-xl border border-default-token shadow-sm"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 无图片时提示 */}
              {preview.images_count === 0 && (
                <div className="py-8 text-center text-sm text-muted-token">{t('noImages')}</div>
              )}

              {/* 脚本输出 */}
              {preview.stdout_tail && (
                <div>
                  <p className="text-xs text-muted-token mb-2 font-medium">{t('scriptOutput')}</p>
                  <pre className="text-xs bg-bg-primary rounded-xl p-4 whitespace-pre-wrap font-sans border border-subtle-token overflow-auto max-h-40">
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
