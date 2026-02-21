"use client";

import { usePresentationStore } from "@/lib/stores/presentation-store";
import { X, Sparkles } from "lucide-react";

export function PresentationOverlay() {
  const isPresentationMode = usePresentationStore((s) => s.isPresentationMode);
  const togglePresentationMode = usePresentationStore((s) => s.togglePresentationMode);

  if (!isPresentationMode) return null;

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

      {/* 退出按键 (打印时通过 CSS 自动隐藏) */}
      <button
        onClick={togglePresentationMode}
        className="fixed bottom-6 inset-x-0 mx-auto w-max px-6 py-2.5 bg-slate-900/80 backdrop-blur-md text-white rounded-full shadow-2xl flex items-center justify-center gap-2 hover:bg-slate-900 transition-all z-[100] hide-in-presentation-btn"
        style={{ animation: "fadeInUp 0.3s ease-out" }}
      >
        <X className="w-4 h-4" />
        <span className="text-sm font-medium tracking-wide">退出汇报模式</span>
      </button>

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
