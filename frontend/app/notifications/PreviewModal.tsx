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
  text?: string;
  image_url?: string;
  card_json?: Record<string, unknown>;
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[80vh] flex flex-col">
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
            className="p-1 rounded-md hover:bg-slate-100 text-[var(--text-muted)]"
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
              {preview.image_url && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">图片效果</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.image_url}
                    alt="推送图片预览"
                    className="w-full rounded-xl border border-[var(--border-default)] shadow-sm"
                  />
                </div>
              )}
              {preview.text && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">文字内容</p>
                  <pre className="text-xs bg-slate-50 rounded-xl p-4 whitespace-pre-wrap font-sans border border-slate-100 overflow-auto max-h-60">
                    {preview.text}
                  </pre>
                </div>
              )}
              {preview.card_json && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">卡片 JSON</p>
                  <pre className="text-xs bg-slate-50 rounded-xl p-4 font-mono border border-slate-100 overflow-auto max-h-60">
                    {JSON.stringify(preview.card_json, null, 2)}
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
