"use client";

import { useState } from 'react';
import { usePresentationStore } from "@/lib/stores/presentation-store";
import { X, Sparkles } from "lucide-react";

export function PresentationOverlay() {
  const isPresentationMode = usePresentationStore((s) => s.isPresentationMode);
  const togglePresentationMode = usePresentationStore((s) => s.togglePresentationMode);

  const audience = usePresentationStore((s) => s.audience);
  const endPresentation = usePresentationStore((s) => s.endPresentation);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const totalSlides = usePresentationStore((s) => s.totalSlides);

  const [controlsVisible, setControlsVisible] = useState(false);

  if (!isPresentationMode) return null;

  // Determine whether to show the extended control bar (requires full store audience)
  const hasExtendedStore = audience !== null && audience !== undefined;

  const handleExit = () => {
    if (endPresentation) {
      endPresentation();
    } else {
      togglePresentationMode();
    }
  };

  const slideLabel =
    typeof currentSlideIndex === 'number' && typeof totalSlides === 'number'
      ? `${currentSlideIndex + 1} / ${totalSlides}`
      : null;

  return (
    <>
      {/* 水印 Header */}
      <div className="absolute top-6 right-8 flex flex-col items-end opacity-40 select-none z-50 pointer-events-none presentation-watermark">
        <span className="text-2xl font-bold tracking-tighter text-slate-800">51Talk · 泰国转介绍</span>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 mt-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Confidential Intelligence Report
        </span>
        <span className="text-[10px] text-slate-400 mt-1 font-mono">
          {new Date().toLocaleString("zh-CN")}
        </span>
      </div>

      {hasExtendedStore ? (
        /* Extended control bar for full presentation mode */
        <>
          {/* Bottom hover zone to reveal controls */}
          <div
            className="fixed bottom-0 inset-x-0 h-24 z-[90]"
            onMouseEnter={() => setControlsVisible(true)}
            onMouseLeave={() => setControlsVisible(false)}
          >
            <div
              className="absolute bottom-0 inset-x-0 px-6 py-4 flex items-center justify-between bg-slate-900/85 backdrop-blur-md text-white transition-all duration-300 hide-in-presentation-btn"
              style={{
                opacity: controlsVisible ? 1 : 0,
                transform: controlsVisible ? 'translateY(0)' : 'translateY(100%)',
              }}
            >
              {/* Left: slide info */}
              <div className="text-sm text-slate-300 font-mono tabular-nums">
                {slideLabel ? (
                  <span>{slideLabel}</span>
                ) : (
                  <span className="opacity-50">— / —</span>
                )}
              </div>

              {/* Center: exit button */}
              <button
                onClick={handleExit}
                className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <X className="w-4 h-4" />
                退出汇报模式
              </button>

              {/* Right: keyboard hints */}
              <div className="text-xs text-slate-400 text-right leading-relaxed">
                <span>← → 翻页 · 空格 展开 · F 全屏 · Esc 退出</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Simple overlay exit button (no audience — legacy presentation mode) */
        <button
          onClick={handleExit}
          className="fixed bottom-6 inset-x-0 mx-auto w-max px-6 py-2.5 bg-slate-900/80 backdrop-blur-md text-white rounded-full shadow-2xl flex items-center justify-center gap-2 hover:bg-slate-900 transition-all z-[100] hide-in-presentation-btn"
          style={{ animation: "fadeInUp 0.3s ease-out" }}
        >
          <X className="w-4 h-4" />
          <span className="text-sm font-medium tracking-wide">退出汇报模式</span>
        </button>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translate3d(0, 20px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
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
