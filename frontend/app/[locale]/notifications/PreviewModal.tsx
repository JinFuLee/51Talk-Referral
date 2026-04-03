'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useLocale } from 'next-intl';

const I18N = {
  zh: {
    title: '推送预览',
    generating: '生成预览中…',
    genSuccess: '生成成功',
    genFailed: '生成失败',
    roleImages: (role: string, count: number) => `${role} 角色 · 共 ${count} 张图片`,
    overviewImg: '总览图片',
    sampleImgs: (n: number) => `跟进图片样本（${n} 张）`,
    noImages: '暂无图片产出，请确认数据文件已上传',
    scriptOutput: '脚本输出',
    previewFailed: (status: number) => `预览失败：${status}`,
    loadFailed: '加载预览失败',
    dingtalk: '钉钉',
  },
  'zh-TW': {
    title: '推送預覽',
    generating: '生成預覽中…',
    genSuccess: '生成成功',
    genFailed: '生成失敗',
    roleImages: (role: string, count: number) => `${role} 角色 · 共 ${count} 張圖片`,
    overviewImg: '總覽圖片',
    sampleImgs: (n: number) => `跟進圖片樣本（${n} 張）`,
    noImages: '暫無圖片產出，請確認資料檔案已上傳',
    scriptOutput: '腳本輸出',
    previewFailed: (status: number) => `預覽失敗：${status}`,
    loadFailed: '載入預覽失敗',
    dingtalk: '釘釘',
  },
  en: {
    title: 'Push Preview',
    generating: 'Generating preview…',
    genSuccess: 'Generated',
    genFailed: 'Failed',
    roleImages: (role: string, count: number) => `${role} · ${count} image(s)`,
    overviewImg: 'Overview',
    sampleImgs: (n: number) => `Follow-up samples (${n})`,
    noImages: 'No images generated. Please ensure data files are uploaded.',
    scriptOutput: 'Script output',
    previewFailed: (status: number) => `Preview failed: ${status}`,
    loadFailed: 'Failed to load preview',
    dingtalk: 'DingTalk',
  },
  th: {
    title: 'ดูตัวอย่างการส่ง',
    generating: 'กำลังสร้างตัวอย่าง…',
    genSuccess: 'สร้างสำเร็จ',
    genFailed: 'สร้างล้มเหลว',
    roleImages: (role: string, count: number) => `${role} · ${count} รูป`,
    overviewImg: 'ภาพรวม',
    sampleImgs: (n: number) => `ตัวอย่างการติดตาม (${n} รูป)`,
    noImages: 'ไม่มีรูปภาพ กรุณาตรวจสอบว่าอัปโหลดไฟล์ข้อมูลแล้ว',
    scriptOutput: 'ผลลัพธ์สคริปต์',
    previewFailed: (status: number) => `ดูตัวอย่างล้มเหลว: ${status}`,
    loadFailed: 'โหลดตัวอย่างล้มเหลว',
    dingtalk: 'DingTalk',
  },
};

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
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
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
      if (!res.ok) throw new Error(t.previewFailed(res.status));
      const data = await res.json();
      setPreview(data);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadFailed);
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
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t.title}</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {platform === 'lark' ? 'Lark' : t.dingtalk} · {role} · {template}
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
              <span className="text-sm">{t.generating}</span>
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
                  {preview.ok ? t.genSuccess : t.genFailed}
                </span>
                <span className="text-[var(--text-muted)] text-xs">
                  {t.roleImages(preview.role, preview.images_count)}
                </span>
              </div>

              {/* 总览图片 */}
              {preview.overview_image && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">
                    {t.overviewImg}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/notifications/outputs/image/${preview.overview_image}`}
                    alt={t.overviewImg}
                    className="w-full rounded-xl border border-[var(--border-default)] shadow-sm"
                  />
                </div>
              )}

              {/* 样本图片 */}
              {preview.sample_images.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">
                    {t.sampleImgs(preview.sample_images.length)}
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
                  {t.noImages}
                </div>
              )}

              {/* 脚本输出 */}
              {preview.stdout_tail && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">
                    {t.scriptOutput}
                  </p>
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
