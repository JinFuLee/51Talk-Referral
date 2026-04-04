'use client';

import { usePresentationStore } from '@/lib/stores/presentation-store';
import { X, Sparkles } from 'lucide-react';
import { useLocale } from 'next-intl';

const I18N = {
  zh: { exitBtn: '退出汇报模式' },
  en: { exitBtn: 'Exit Presentation' },
  'zh-TW': { exitBtn: '退出彙報模式' },
  th: { exitBtn: 'ออกจากโหมดนำเสนอ' },
} as const;

export function PresentationOverlay() {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] ?? I18N.zh;
  const isPresentationMode = usePresentationStore((s) => s.isPresentationMode);
  const exitPresentationMode = usePresentationStore((s) => s.exitPresentationMode);

  if (!isPresentationMode) return null;

  return (
    <>
      {/* 水印 Header */}
      <div className="absolute top-6 right-8 flex flex-col items-end opacity-40 select-none z-50 pointer-events-none presentation-watermark">
        <span className="text-2xl font-bold tracking-tighter text-[var(--text-primary)]">
          51Talk · 泰国转介绍
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 mt-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Confidential Intelligence Report
        </span>
        <span className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
          {new Date().toLocaleString('zh-CN')}
        </span>
      </div>

      <button
        onClick={exitPresentationMode}
        className="fixed bottom-6 inset-x-0 mx-auto w-max px-6 py-2.5 bg-[var(--bg-subtle)] backdrop-blur-md text-white rounded-full shadow-2xl flex items-center justify-center gap-2 hover:bg-[var(--bg-subtle)] transition-all z-[100] hide-in-presentation-btn"
        style={{ animation: 'fadeInUp 0.3s ease-out' }}
      >
        <X className="w-4 h-4" />
        <span className="text-sm font-medium tracking-wide">{t.exitBtn}</span>
      </button>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate3d(0, 20px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @media print {
          .hide-in-presentation-btn {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
